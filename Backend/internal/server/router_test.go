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
		Suggestion zhinao.Message `json:"suggestion"`
	}
	_ = json.Unmarshal(response.Body.Bytes(), &payload)
	if payload.Agent.Skill != "interview-practice-contribution" {
		t.Fatalf("skill = %q", payload.Agent.Skill)
	}
	if payload.Suggestion.Content == "" {
		t.Fatal("suggestion is empty")
	}
	if len(client.requests) != 1 || client.requests[0].MaxTokens != 500 {
		t.Fatalf("client requests = %#v", client.requests)
	}
	systemPrompt := client.requests[0].Messages[0].Content
	if !strings.Contains(systemPrompt, "用户回答辅助模式") || !strings.Contains(systemPrompt, "不得虚构") {
		t.Fatal("suggestion safety prompt was not injected")
	}
	lastMessage := client.requests[0].Messages[len(client.requests[0].Messages)-1].Content
	if !strings.Contains(lastMessage, "我负责访谈") {
		t.Fatal("existing draft was not included")
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
		Suggestion zhinao.Message `json:"suggestion"`
	}
	_ = json.Unmarshal(response.Body.Bytes(), &payload)
	if !strings.Contains(payload.Suggestion.Content, "【请补充") {
		t.Fatalf("unsafe suggestion was not replaced: %q", payload.Suggestion.Content)
	}
	if len(client.requests) != 1 {
		t.Fatalf("model was not called")
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
