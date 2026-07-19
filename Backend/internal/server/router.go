package server

import (
	"context"
	"encoding/json"
	"errors"
	"math"
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
	Progress float64          `json:"progress"`
}

type conversationStatusArtifact struct {
	Readiness   float64  `json:"readiness"`
	Stage       string   `json:"stage"`
	Summary     string   `json:"summary"`
	Covered     []string `json:"covered"`
	Gaps        []string `json:"gaps"`
	SubmitReady bool     `json:"submitReady"`
	NextAction  string   `json:"nextAction"`
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
	agentRoutes.POST("/:agentId/status", h.status)
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
	latestQuestion, latestQuestionIndex, ok := latestAssistantQuestion(messages)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "当前还没有 Agent 提出的问题。"})
		return
	}
	contextJSON, ok := marshalContext(c, request.Context)
	if !ok {
		return
	}

	relevantMessages := messages[:latestQuestionIndex+1]
	completionMessages := make([]zhinao.Message, 0, len(relevantMessages)+2)
	completionMessages = append(completionMessages, zhinao.Message{
		Role:    "system",
		Content: prompt + "\n\n当前业务上下文：\n" + contextJSON + "\n\n<latest_agent_question>\n" + latestQuestion + "\n</latest_agent_question>",
	})
	completionMessages = append(completionMessages, relevantMessages...)
	hasUserFacts := false
	for _, message := range relevantMessages {
		if message.Role == "user" && strings.TrimSpace(message.Content) != "" {
			hasUserFacts = true
			break
		}
	}
	answerInstruction := "只为下面这一个最近一轮 Agent 问题生成回答草稿，不要回答历史中的其他问题：\n\n" + latestQuestion
	if draft := truncateRunes(strings.TrimSpace(request.Draft), maxMessageRunes); draft != "" {
		hasUserFacts = true
		answerInstruction += "\n\n这是我针对该问题已经写下但尚未发送的草稿。请保留其中已有事实，帮我补充和整理：\n" + draft
	} else if !hasUserFacts {
		answerInstruction += "\n\n当前没有任何用户事实，严禁提供具体案例、行业、数字或结果；所有事实都必须使用【请补充：具体信息】占位。"
	}
	completionMessages = append(completionMessages, zhinao.Message{Role: "user", Content: answerInstruction})

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
		suggestion = emptyFactSuggestion(latestQuestion)
	}

	c.JSON(http.StatusOK, gin.H{
		"agent":      gin.H{"id": agent.ID, "name": agent.Name, "skill": agent.SkillName},
		"basedOn":    gin.H{"role": "assistant", "content": latestQuestion},
		"suggestion": gin.H{"content": suggestion},
		"model":      completion.Model,
		"usage":      completion.Usage,
		"requestId":  nullableString(completion.RequestID),
	})
}

func latestAssistantQuestion(messages []zhinao.Message) (string, int, bool) {
	for index := len(messages) - 1; index >= 0; index-- {
		if messages[index].Role == "assistant" && strings.TrimSpace(messages[index].Content) != "" {
			return strings.TrimSpace(messages[index].Content), index, true
		}
	}
	return "", -1, false
}

func emptyFactSuggestion(latestQuestion string) string {
	question := truncateRunes(strings.TrimSpace(latestQuestion), 60)
	return "针对“" + question + "”，我的回答是【请补充：与这个问题直接相关的真实经历、做法或结果】。"
}

func (h *handler) status(c *gin.Context) {
	agent, ok := h.getAgent(c)
	if !ok {
		return
	}
	prompt, err := agent.Prompt(agents.StatusMode)
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
	userTurns := 0
	for _, message := range messages {
		if message.Role == "user" {
			userTurns++
		}
	}
	if userTurns == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "至少完成一轮回答后才能分析对话状态。"})
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
		Content: "请评估以上对话截至当前一轮的覆盖情况。只输出状态评估 JSON。",
	})

	completion, err := h.client.Complete(c.Request.Context(), zhinao.CompletionRequest{
		Messages:    completionMessages,
		Temperature: 0.1,
		MaxTokens:   900,
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
	artifactJSON, err := json.Marshal(artifact)
	if err != nil {
		respondError(c, &zhinao.ServiceError{Message: "Agent 状态结果无法解析，请重试。", Status: http.StatusBadGateway, Detail: err.Error()})
		return
	}
	var status conversationStatusArtifact
	if err := json.Unmarshal(artifactJSON, &status); err != nil {
		respondError(c, &zhinao.ServiceError{Message: "Agent 状态结果格式不完整，请重试。", Status: http.StatusBadGateway, Detail: err.Error()})
		return
	}

	progress := calculateConversationProgress(request.Progress, userTurns, status.Readiness)
	covered := sanitizeStatusItems(status.Covered)
	gaps := sanitizeStatusItems(status.Gaps)
	submitReady := status.SubmitReady && progress >= 78
	if len(gaps) == 0 && !submitReady {
		gaps = []string{"继续补充当前问题中的关键实践细节"}
	}

	c.JSON(http.StatusOK, gin.H{
		"agent": gin.H{"id": agent.ID, "name": agent.Name, "skill": agent.SkillName},
		"status": gin.H{
			"progress":    progress,
			"turn":        userTurns,
			"stage":       fallbackText(status.Stage, "正在梳理"),
			"summary":     fallbackText(status.Summary, "Agent 正在根据对话判断覆盖情况。"),
			"covered":     covered,
			"gaps":        gaps,
			"submitReady": submitReady,
			"nextAction":  fallbackText(status.NextAction, "继续回答 Agent 当前问题"),
		},
		"model":     completion.Model,
		"usage":     completion.Usage,
		"requestId": nullableString(completion.RequestID),
	})
}

func calculateConversationProgress(previous float64, userTurns int, readiness float64) int {
	previousProgress := int(math.Round(math.Max(0, math.Min(98, previous))))
	if previousProgress == 0 {
		previousProgress = 35
	}
	if userTurns <= 0 || previousProgress >= 98 {
		return previousProgress
	}

	readiness = math.Max(0, math.Min(95, readiness))
	curve := 35 + 63*(1-math.Exp(-0.55*float64(userTurns)))
	target := int(math.Round(curve + (readiness-60)*0.12))
	remaining := 98 - previousProgress
	growthRate := 0.55 / (1 + 0.22*float64(userTurns-1))
	maxIncrease := int(math.Max(1, math.Round(float64(remaining)*growthRate)))
	next := max(previousProgress+1, target)
	next = min(next, previousProgress+maxIncrease)
	return min(98, next)
}

func sanitizeStatusItems(items []string) []string {
	result := make([]string, 0, min(3, len(items)))
	for _, item := range items {
		item = truncateRunes(strings.TrimSpace(item), 48)
		if item == "" {
			continue
		}
		result = append(result, item)
		if len(result) == 3 {
			break
		}
	}
	return result
}

func fallbackText(value, fallback string) string {
	value = truncateRunes(strings.TrimSpace(value), 80)
	if value == "" {
		return fallback
	}
	return value
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
