package zhinao

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestComplete(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer test-key" {
			t.Fatalf("Authorization = %q", got)
		}
		if r.URL.Path != "/chat/completions" {
			t.Fatalf("path = %q", r.URL.Path)
		}

		var request map[string]any
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if request["model"] != "deepseek/deepseek-v4-flash" {
			t.Fatalf("model = %v", request["model"])
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"id":"request-1",
			"model":"deepseek/deepseek-v4-flash",
			"choices":[{"message":{"role":"assistant","content":" 已收到 "}}],
			"usage":{"total_tokens":12}
		}`))
	}))
	defer upstream.Close()

	client := NewClient(Config{
		BaseURL: upstream.URL,
		APIKey:  "test-key",
		Model:   "deepseek/deepseek-v4-flash",
		Timeout: time.Second,
	})
	result, err := client.Complete(context.Background(), CompletionRequest{
		Messages:    []Message{{Role: "user", Content: "测试"}},
		Temperature: 0.4,
		MaxTokens:   900,
	})
	if err != nil {
		t.Fatalf("Complete() error = %v", err)
	}
	if result.Content != "已收到" || result.RequestID != "request-1" {
		t.Fatalf("unexpected result: %#v", result)
	}
}

func TestCompleteUpstreamErrorDoesNotExposeDetail(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"error":{"message":"provider detail"}}`))
	}))
	defer upstream.Close()

	client := NewClient(Config{
		BaseURL: upstream.URL,
		APIKey:  "test-key",
		Model:   "test-model",
		Timeout: time.Second,
	})
	_, err := client.Complete(context.Background(), CompletionRequest{})
	serviceError, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("error type = %T", err)
	}
	if serviceError.Status != http.StatusTooManyRequests || serviceError.Detail != "provider detail" {
		t.Fatalf("unexpected service error: %#v", serviceError)
	}
	if strings.Contains(serviceError.Message, "provider detail") {
		t.Fatalf("public message exposed provider detail: %q", serviceError.Message)
	}
}

func TestParseJSONArtifact(t *testing.T) {
	t.Parallel()

	artifact, err := ParseJSONArtifact("```json\n{\"title\":\"可执行方法\",\"reward\":680}\n```")
	if err != nil {
		t.Fatalf("ParseJSONArtifact() error = %v", err)
	}
	if artifact["title"] != "可执行方法" || artifact["reward"] != float64(680) {
		t.Fatalf("artifact = %#v", artifact)
	}
}

func TestParseJSONArtifactRejectsInvalidJSON(t *testing.T) {
	t.Parallel()

	_, err := ParseJSONArtifact("这里没有结构化草稿")
	if err == nil {
		t.Fatal("expected parse error")
	}
}
