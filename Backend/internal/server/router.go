package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	"know-how-hub/backend/internal/agents"
	"know-how-hub/backend/internal/zhinao"
)

const (
	maxBodyBytes    = 256 << 10
	maxMessages     = 24
	maxMessageRunes = 8000
	maxContextBytes = 40000
)

type Client interface {
	Complete(ctx context.Context, request zhinao.CompletionRequest) (zhinao.CompletionResult, error)
}

type Config struct {
	Model          string
	Configured     bool
	AllowedOrigins []string
}

type handler struct {
	client Client
	config Config
}

type agentRequest struct {
	Messages []zhinao.Message `json:"messages"`
	Context  map[string]any   `json:"context"`
	Draft    string           `json:"draft"`
}

func NewRouter(config Config, client Client) *gin.Engine {
	router := gin.New()
	_ = router.SetTrustedProxies(nil)
	router.Use(gin.Logger(), gin.Recovery())
	router.Use(corsMiddleware(config.AllowedOrigins))
	router.Use(bodyLimitMiddleware())

	h := &handler{client: client, config: config}
	router.GET("/api/health", h.health)
	router.GET("/api/agents", h.listAgents)

	agentRoutes := router.Group("/api/agents")
	agentRoutes.Use(newRateLimiter(30, time.Minute).middleware())
	agentRoutes.POST("/:agentId/chat", h.chat)
	agentRoutes.POST("/:agentId/suggest", h.suggest)
	agentRoutes.POST("/:agentId/generate", h.generate)

	router.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{"error": "没有找到这个接口。"})
	})
	return router
}

func (h *handler) health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"ok":         true,
		"provider":   "360-zhinao",
		"model":      h.config.Model,
		"configured": h.config.Configured,
	})
}

func (h *handler) listAgents(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"agents": agents.List()})
}

func (h *handler) chat(c *gin.Context) {
	agent, ok := h.getAgent(c)
	if !ok {
		return
	}
	prompt, err := agent.Prompt(agents.ConversationMode)
	if err != nil {
		respondError(c, &zhinao.ServiceError{
			Message: "Agent 技能加载失败，请稍后重试。",
			Status:  http.StatusInternalServerError,
			Detail:  err.Error(),
		})
		return
	}

	request, ok := bindAgentRequest(c)
	if !ok {
		return
	}
	messages := sanitizeMessages(request.Messages)
	if len(messages) == 0 || messages[len(messages)-1].Role != "user" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请先输入一条消息。"})
		return
	}
	contextJSON, ok := marshalContext(c, request.Context)
	if !ok {
		return
	}

	completion, err := h.client.Complete(c.Request.Context(), zhinao.CompletionRequest{
		Messages: append(
			[]zhinao.Message{{
				Role:    "system",
				Content: prompt + "\n\n当前业务上下文：\n" + contextJSON,
			}},
			messages...,
		),
		Temperature: 0.4,
		MaxTokens:   900,
	})
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"agent":     gin.H{"id": agent.ID, "name": agent.Name, "skill": agent.SkillName},
		"message":   zhinao.Message{Role: "assistant", Content: completion.Content},
		"model":     completion.Model,
		"usage":     completion.Usage,
		"requestId": nullableString(completion.RequestID),
	})
}

func (h *handler) suggest(c *gin.Context) {
	agent, ok := h.getAgent(c)
	if !ok {
		return
	}
	prompt, err := agent.Prompt(agents.SuggestionMode)
	if err != nil {
		respondError(c, &zhinao.ServiceError{
			Message: "Agent 技能加载失败，请稍后重试。",
			Status:  http.StatusInternalServerError,
			Detail:  err.Error(),
		})
		return
	}

	request, ok := bindAgentRequest(c)
	if !ok {
		return
	}
	messages := sanitizeMessages(request.Messages)
	if len(messages) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "当前还没有可以回答的问题。"})
		return
	}
	contextJSON, ok := marshalContext(c, request.Context)
	if !ok {
		return
	}

	completionMessages := make([]zhinao.Message, 0, len(messages)+2)
	completionMessages = append(completionMessages, zhinao.Message{
		Role:    "system",
		Content: prompt + "\n\n当前业务上下文：\n" + contextJSON,
	})
	completionMessages = append(completionMessages, messages...)
	hasUserFacts := false
	for _, message := range messages {
		if message.Role == "user" && strings.TrimSpace(message.Content) != "" {
			hasUserFacts = true
			break
		}
	}
	if draft := truncateRunes(strings.TrimSpace(request.Draft), maxMessageRunes); draft != "" {
		hasUserFacts = true
		completionMessages = append(completionMessages, zhinao.Message{
			Role:    "user",
			Content: "这是我已经写下但尚未发送的草稿。请保留其中已有事实，帮我补充和整理：\n" + draft,
		})
	} else if !hasUserFacts {
		completionMessages = append(completionMessages, zhinao.Message{
			Role:    "user",
			Content: "请为上一个 Agent 问题生成可编辑回答。当前没有任何用户事实，严禁提供具体案例、行业、数字或结果；所有事实都必须使用【请补充：具体信息】占位。",
		})
	}

	completion, err := h.client.Complete(c.Request.Context(), zhinao.CompletionRequest{
		Messages:    completionMessages,
		Temperature: 0.2,
		MaxTokens:   500,
	})
	if err != nil {
		respondError(c, err)
		return
	}
	suggestion := truncateRunes(strings.TrimSpace(completion.Content), 180)
	if !hasUserFacts && !strings.Contains(suggestion, "【请补充") {
		suggestion = emptyFactSuggestion(agent.ID)
	}

	c.JSON(http.StatusOK, gin.H{
		"agent":      gin.H{"id": agent.ID, "name": agent.Name, "skill": agent.SkillName},
		"suggestion": gin.H{"content": suggestion},
		"model":      completion.Model,
		"usage":      completion.Usage,
		"requestId":  nullableString(completion.RequestID),
	})
}

func emptyFactSuggestion(agentID string) string {
	switch agentID {
	case "task":
		return "我现在最想解决的是【请补充：具体问题】。它发生在【请补充：业务场景】，目前造成【请补充：实际影响】，我希望最终得到【请补充：可验证结果】。"
	case "contribution":
		return "与这个任务最接近的真实项目是【请补充：项目】。当时目标是【请补充：目标】，我负责【请补充：本人角色和动作】，最终结果是【请补充：可验证结果】。"
	case "iteration":
		return "我希望调整【请补充：具体部分】。在【请补充：真实使用场景】中，当前版本出现【请补充：实际问题】，我希望新版本补充【请补充：变化和验证方式】。"
	default:
		return "我想沉淀的是【请补充：实践主题】，它主要解决【请补充：具体问题】。一个我亲自经历的代表性案例是【请补充：项目背景、本人角色和可验证结果】。"
	}
}

func (h *handler) generate(c *gin.Context) {
	agent, ok := h.getAgent(c)
	if !ok {
		return
	}
	prompt, err := agent.Prompt(agents.GenerationMode)
	if err != nil {
		respondError(c, &zhinao.ServiceError{
			Message: "Agent 技能加载失败，请稍后重试。",
			Status:  http.StatusInternalServerError,
			Detail:  err.Error(),
		})
		return
	}

	request, ok := bindAgentRequest(c)
	if !ok {
		return
	}
	messages := sanitizeMessages(request.Messages)
	hasUserMessage := false
	for _, message := range messages {
		if message.Role == "user" {
			hasUserMessage = true
			break
		}
	}
	if !hasUserMessage {
		c.JSON(http.StatusBadRequest, gin.H{"error": "信息不足，暂时无法生成草稿。"})
		return
	}
	contextJSON, ok := marshalContext(c, request.Context)
	if !ok {
		return
	}

	completionMessages := make([]zhinao.Message, 0, len(messages)+2)
	completionMessages = append(completionMessages, zhinao.Message{
		Role:    "system",
		Content: prompt + "\n\n当前业务上下文：\n" + contextJSON,
	})
	completionMessages = append(completionMessages, messages...)
	completionMessages = append(completionMessages, zhinao.Message{
		Role:    "user",
		Content: "请根据以上全部信息，现在生成结构化草稿。只输出要求的 JSON。",
	})

	completion, err := h.client.Complete(c.Request.Context(), zhinao.CompletionRequest{
		Messages:    completionMessages,
		Temperature: 0.2,
		MaxTokens:   2200,
	})
	if err != nil {
		respondError(c, err)
		return
	}
	artifact, err := zhinao.ParseJSONArtifact(completion.Content)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"agent":     gin.H{"id": agent.ID, "name": agent.Name, "skill": agent.SkillName},
		"artifact":  artifact,
		"model":     completion.Model,
		"usage":     completion.Usage,
		"requestId": nullableString(completion.RequestID),
	})
}

func (h *handler) getAgent(c *gin.Context) (agents.Config, bool) {
	agent, ok := agents.Get(c.Param("agentId"))
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "没有找到这个 Agent。"})
		return agents.Config{}, false
	}
	return agent, true
}

func bindAgentRequest(c *gin.Context) (agentRequest, bool) {
	var request agentRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "请求内容过大，请精简后重试。"})
			return agentRequest{}, false
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式不正确。"})
		return agentRequest{}, false
	}
	if request.Context == nil {
		request.Context = map[string]any{}
	}
	return request, true
}

func sanitizeMessages(messages []zhinao.Message) []zhinao.Message {
	if len(messages) > maxMessages {
		messages = messages[len(messages)-maxMessages:]
	}
	result := make([]zhinao.Message, 0, len(messages))
	for _, message := range messages {
		if message.Role != "user" && message.Role != "assistant" {
			continue
		}
		content := strings.TrimSpace(message.Content)
		if content == "" {
			continue
		}
		content = truncateRunes(content, maxMessageRunes)
		result = append(result, zhinao.Message{Role: message.Role, Content: content})
	}
	return result
}

func truncateRunes(value string, limit int) string {
	if utf8.RuneCountInString(value) <= limit {
		return value
	}
	return string([]rune(value)[:limit])
}

func marshalContext(c *gin.Context, value map[string]any) (string, bool) {
	contextJSON, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "业务上下文格式不正确。"})
		return "", false
	}
	if len(contextJSON) > maxContextBytes {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "业务上下文过大，请精简后重试。"})
		return "", false
	}
	return string(contextJSON), true
}

func respondError(c *gin.Context, err error) {
	var serviceError *zhinao.ServiceError
	if errors.As(err, &serviceError) {
		status := serviceError.Status
		if status < 400 || status > 599 {
			status = http.StatusBadGateway
		}
		c.JSON(status, gin.H{"error": serviceError.Message})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "服务暂时不可用，请稍后再试。"})
}

func nullableString(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func bodyLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBodyBytes)
		}
		c.Next()
	}
}

func corsMiddleware(origins []string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(origins))
	for _, origin := range origins {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			allowed[origin] = struct{}{}
		}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			if _, ok := allowed[origin]; !ok {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "当前来源不允许访问服务。"})
				return
			}
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
			c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

type rateLimiter struct {
	mu      sync.Mutex
	limit   int
	window  time.Duration
	buckets map[string][]time.Time
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{
		limit:   limit,
		window:  window,
		buckets: make(map[string][]time.Time),
	}
}

func (r *rateLimiter) middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		now := time.Now()
		key := c.ClientIP()

		r.mu.Lock()
		recent := r.buckets[key][:0]
		for _, timestamp := range r.buckets[key] {
			if now.Sub(timestamp) < r.window {
				recent = append(recent, timestamp)
			}
		}
		if len(recent) >= r.limit {
			r.buckets[key] = recent
			r.mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "请求过于频繁，请稍后再试。"})
			return
		}
		r.buckets[key] = append(recent, now)
		r.mu.Unlock()
		c.Next()
	}
}
