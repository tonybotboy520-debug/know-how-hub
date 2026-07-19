package server

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"know-how-hub/backend/internal/zhinao"
)

type fakeClient struct {
	requests []zhinao.CompletionRequest
	result   zhinao.CompletionResult
	err      error
}

func (f *fakeClient) Complete(_ context.Context, request zhinao.CompletionRequest) (zhinao.CompletionResult, error) {
	f.requests = append(f.requests, request)
	return f.result, f.err
}

func newTestRouter(client Client) http.Handler {
	gin.SetMode(gin.TestMode)
	return NewRouter(Config{
		Model:          "deepseek/deepseek-chat",
		Configured:     true,
		AllowedOrigins: []string{"http://localhost:5173"},
	}, client)
}

func TestHealthAndAgentList(t *testing.T) {
	t.Parallel()

	router := newTestRouter(&fakeClient{})

	health := performRequest(router, http.MethodGet, "/api/health", nil, "")
	if health.Code != http.StatusOK {
		t.Fatalf("health status = %d, body = %s", health.Code, health.Body.String())
	}
	var healthPayload map[string]any
	_ = json.Unmarshal(health.Body.Bytes(), &healthPayload)
	if healthPayload["provider"] != "360-zhinao" || healthPayload["configured"] != true {
		t.Fatalf("health payload = %#v", healthPayload)
	}

	list := performRequest(router, http.MethodGet, "/api/agents", nil, "")
	if list.Code != http.StatusOK {
		t.Fatalf("list status = %d, body = %s", list.Code, list.Body.String())
	}
	var listPayload struct {
		Agents []map[string]any `json:"agents"`
	}
	_ = json.Unmarshal(list.Body.Bytes(), &listPayload)
	if len(listPayload.Agents) != 4 {
		t.Fatalf("agent count = %d", len(listPayload.Agents))
	}
}

func TestChat(t *testing.T) {
	t.Parallel()

	client := &fakeClient{result: zhinao.CompletionResult{
		Content:   "请补充验证标准。",
		Model:     "deepseek/deepseek-chat",
		Usage:     map[string]any{"total_tokens": 16},
		RequestID: "chat-1",
	}}
	router := newTestRouter(client)

	response := performRequest(
		router,
		http.MethodPost,
		"/api/agents/task/chat",
		[]byte(`{"messages":[{"role":"user","content":"想沉淀一个任务"}],"context":{"defaultReward":680}}`),
		"http://localhost:5173",
	)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if len(client.requests) != 1 || client.requests[0].MaxTokens != 900 {
		t.Fatalf("client requests = %#v", client.requests)
	}
	if client.requests[0].Messages[0].Role != "system" {
		t.Fatalf("first message = %#v", client.requests[0].Messages[0])
	}
	if !strings.Contains(client.requests[0].Messages[0].Content, "$clarify-knowhow-task") {
		t.Fatalf("task skill was not injected into system prompt")
	}
}

func TestGenerate(t *testing.T) {
	t.Parallel()

	client := &fakeClient{result: zhinao.CompletionResult{
		Content: `{"title":"任务标题","reward":680}`,
		Model:   "deepseek/deepseek-chat",
	}}
	router := newTestRouter(client)

	response := performRequest(
		router,
		http.MethodPost,
		"/api/agents/task/generate",
		[]byte(`{"messages":[{"role":"user","content":"请生成"}],"context":{}}`),
		"",
	)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	var payload struct {
		Artifact map[string]any `json:"artifact"`
	}
	_ = json.Unmarshal(response.Body.Bytes(), &payload)
	if payload.Artifact["title"] != "任务标题" {
		t.Fatalf("artifact = %#v", payload.Artifact)
	}
	if len(client.requests) != 1 || client.requests[0].MaxTokens != 2200 {
		t.Fatalf("client requests = %#v", client.requests)
	}
}

func TestSuggestAnswer(t *testing.T) {
	t.Parallel()

	client := &fakeClient{result: zhinao.CompletionResult{
		Content:   "我负责了需求访谈，但项目结果还需要补充。",
		Model:     "deepseek/deepseek-chat",
		RequestID: "suggest-1",
	}}
	router := newTestRouter(client)

	response := performRequest(
		router,
		http.MethodPost,
		"/api/agents/contribution/suggest",
		[]byte(`{"messages":[{"role":"assistant","content":"你当时负责什么？"}],"context":{"task":{"title":"需求访谈"}},"draft":"我负责访谈"}`),
		"http://localhost:5173",
	)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	var payload struct {
		Agent struct {
			Skill string `json:"skill"`
		} `json:"agent"`
		BasedOn    zhinao.Message `json:"basedOn"`
		Suggestion zhinao.Message `json:"suggestion"`
	}
	_ = json.Unmarshal(response.Body.Bytes(), &payload)
	if payload.Agent.Skill != "interview-practice-contribution" {
		t.Fatalf("skill = %q", payload.Agent.Skill)
	}
	if payload.Suggestion.Content == "" {
		t.Fatal("suggestion is empty")
	}
	if payload.BasedOn.Content != "你当时负责什么？" {
		t.Fatalf("basedOn = %#v", payload.BasedOn)
	}
	if len(client.requests) != 1 || client.requests[0].MaxTokens != 500 {
		t.Fatalf("client requests = %#v", client.requests)
	}
	systemPrompt := client.requests[0].Messages[0].Content
	if !strings.Contains(systemPrompt, "用户回答辅助模式") || !strings.Contains(systemPrompt, "不得虚构") || !strings.Contains(systemPrompt, "你当时负责什么？") {
		t.Fatal("suggestion safety prompt was not injected")
	}
	lastMessage := client.requests[0].Messages[len(client.requests[0].Messages)-1].Content
	if !strings.Contains(lastMessage, "你当时负责什么？") || !strings.Contains(lastMessage, "我负责访谈") {
		t.Fatal("latest question or existing draft was not included")
	}
}

func TestSuggestTargetsLatestAssistantQuestion(t *testing.T) {
	t.Parallel()

	client := &fakeClient{result: zhinao.CompletionResult{
		Content: "我先确认了业务目标，再让用户描述最近一次具体经历。",
		Model:   "deepseek/deepseek-chat",
	}}
	router := newTestRouter(client)

	response := performRequest(
		router,
		http.MethodPost,
		"/api/agents/task/suggest",
		[]byte(`{"messages":[{"role":"assistant","content":"你想解决什么问题？"},{"role":"user","content":"我想减少需求返工。"},{"role":"assistant","content":"你最近一次遇到返工时，具体发生了什么？"}],"context":{}}`),
		"",
	)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	var payload struct {
		BasedOn zhinao.Message `json:"basedOn"`
	}
	_ = json.Unmarshal(response.Body.Bytes(), &payload)
	latestQuestion := "你最近一次遇到返工时，具体发生了什么？"
	if payload.BasedOn.Content != latestQuestion {
		t.Fatalf("basedOn = %q", payload.BasedOn.Content)
	}
	lastMessage := client.requests[0].Messages[len(client.requests[0].Messages)-1].Content
	if !strings.Contains(lastMessage, latestQuestion) {
		t.Fatalf("latest question missing from final instruction: %q", lastMessage)
	}
}

func TestSuggestWithoutUserFactsFallsBackToEditableTemplate(t *testing.T) {
	t.Parallel()

	client := &fakeClient{result: zhinao.CompletionResult{
		Content: "我去年负责了一个具体项目，并取得了显著结果。",
		Model:   "deepseek/deepseek-chat",
	}}
	router := newTestRouter(client)

	response := performRequest(
		router,
		http.MethodPost,
		"/api/agents/free-create/suggest",
		[]byte(`{"messages":[{"role":"assistant","content":"请讲一个真实案例。"}],"context":{}}`),
		"",
	)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	var payload struct {
		BasedOn    zhinao.Message `json:"basedOn"`
		Suggestion zhinao.Message `json:"suggestion"`
	}
	_ = json.Unmarshal(response.Body.Bytes(), &payload)
	if !strings.Contains(payload.Suggestion.Content, "【请补充") {
		t.Fatalf("unsafe suggestion was not replaced: %q", payload.Suggestion.Content)
	}
	if !strings.Contains(payload.Suggestion.Content, payload.BasedOn.Content) {
		t.Fatalf("fallback is not based on latest question: %q", payload.Suggestion.Content)
	}
	if len(client.requests) != 1 {
		t.Fatalf("model was not called")
	}
}

func TestSuggestRequiresAssistantQuestion(t *testing.T) {
	t.Parallel()

	client := &fakeClient{}
	router := newTestRouter(client)
	response := performRequest(
		router,
		http.MethodPost,
		"/api/agents/task/suggest",
		[]byte(`{"messages":[{"role":"user","content":"只有用户消息"}],"context":{}}`),
		"",
	)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if len(client.requests) != 0 {
		t.Fatal("model should not be called without an assistant question")
	}
}

func TestConversationStatus(t *testing.T) {
	t.Parallel()

	client := &fakeClient{result: zhinao.CompletionResult{
		Content: `{
			"readiness": 82,
			"stage": "补齐验证方式",
			"summary": "问题与场景已经明确，仍需确认验收标准。",
			"covered": ["具体问题", "业务场景"],
			"gaps": ["验收标准", "适用边界"],
			"submitReady": false,
			"nextAction": "补充如何判断结果有效"
		}`,
		Model:     "deepseek/deepseek-chat",
		RequestID: "status-1",
	}}
	router := newTestRouter(client)

	response := performRequest(
		router,
		http.MethodPost,
		"/api/agents/task/status",
		[]byte(`{"messages":[{"role":"assistant","content":"你想解决什么问题？"},{"role":"user","content":"我想减少需求评审返工。"},{"role":"assistant","content":"它发生在什么场景？"},{"role":"user","content":"主要发生在跨部门需求评审后。"}],"context":{},"progress":62}`),
		"",
	)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	var payload struct {
		Status struct {
			Progress    int      `json:"progress"`
			Turn        int      `json:"turn"`
			Covered     []string `json:"covered"`
			Gaps        []string `json:"gaps"`
			SubmitReady bool     `json:"submitReady"`
		} `json:"status"`
	}
	_ = json.Unmarshal(response.Body.Bytes(), &payload)
	if payload.Status.Progress <= 62 || payload.Status.Progress >= 100 {
		t.Fatalf("progress = %d", payload.Status.Progress)
	}
	if payload.Status.Turn != 2 || len(payload.Status.Covered) != 2 || len(payload.Status.Gaps) != 2 {
		t.Fatalf("status payload = %#v", payload.Status)
	}
	if payload.Status.SubmitReady {
		t.Fatal("status should not be submit ready")
	}
	if len(client.requests) != 1 || client.requests[0].MaxTokens != 900 {
		t.Fatalf("client requests = %#v", client.requests)
	}
	if !strings.Contains(client.requests[0].Messages[0].Content, "对话状态评估模式") {
		t.Fatal("status skill prompt was not injected")
	}
}

func TestConversationProgressIncreasesWithDiminishingSteps(t *testing.T) {
	t.Parallel()

	progress := 35
	previousIncrease := 100
	for turn := 1; turn <= 7; turn++ {
		next := calculateConversationProgress(float64(progress), turn, 72)
		if next <= progress || next >= 100 {
			t.Fatalf("turn %d progress changed from %d to %d", turn, progress, next)
		}
		increase := next - progress
		if increase > previousIncrease {
			t.Fatalf("turn %d increase grew from %d to %d", turn, previousIncrease, increase)
		}
		previousIncrease = increase
		progress = next
	}
}

func TestConversationStatusRequiresUserAnswer(t *testing.T) {
	t.Parallel()

	client := &fakeClient{}
	router := newTestRouter(client)
	response := performRequest(
		router,
		http.MethodPost,
		"/api/agents/task/status",
		[]byte(`{"messages":[{"role":"assistant","content":"你想解决什么问题？"}],"context":{},"progress":35}`),
		"",
	)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if len(client.requests) != 0 {
		t.Fatal("model should not be called without a user answer")
	}
}

func TestRejectsUnknownAgentAndOrigin(t *testing.T) {
	t.Parallel()

	router := newTestRouter(&fakeClient{})
	unknown := performRequest(
		router,
		http.MethodPost,
		"/api/agents/unknown/chat",
		[]byte(`{"messages":[{"role":"user","content":"测试"}],"context":{}}`),
		"",
	)
	if unknown.Code != http.StatusNotFound {
		t.Fatalf("unknown agent status = %d", unknown.Code)
	}

	blocked := performRequest(
		router,
		http.MethodPost,
		"/api/agents/task/chat",
		[]byte(`{"messages":[{"role":"user","content":"测试"}],"context":{}}`),
		"https://example.com",
	)
	if blocked.Code != http.StatusForbidden {
		t.Fatalf("blocked origin status = %d", blocked.Code)
	}
}

func performRequest(handler http.Handler, method, path string, body []byte, origin string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, bytes.NewReader(body))
	if len(body) > 0 {
		request.Header.Set("Content-Type", "application/json")
	}
	if origin != "" {
		request.Header.Set("Origin", origin)
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}
