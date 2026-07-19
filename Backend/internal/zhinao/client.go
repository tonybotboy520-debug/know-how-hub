package zhinao

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const maxResponseBytes = 2 << 20

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type CompletionRequest struct {
	Messages    []Message
	Temperature float64
	MaxTokens   int
}

type CompletionResult struct {
	Content   string
	Model     string
	Usage     any
	RequestID string
}

type Config struct {
	BaseURL string
	APIKey  string
	Model   string
	Timeout time.Duration
}

type Client struct {
	baseURL    string
	apiKey     string
	model      string
	httpClient *http.Client
}

type ServiceError struct {
	Message string
	Status  int
	Detail  string
}

func (e *ServiceError) Error() string {
	return e.Message
}

func NewClient(config Config) *Client {
	timeout := config.Timeout
	if timeout <= 0 {
		timeout = 60 * time.Second
	}

	return &Client{
		baseURL: strings.TrimRight(strings.TrimSpace(config.BaseURL), "/"),
		apiKey:  strings.TrimSpace(config.APIKey),
		model:   strings.TrimSpace(config.Model),
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c *Client) Complete(ctx context.Context, request CompletionRequest) (CompletionResult, error) {
	if c.baseURL == "" || c.apiKey == "" || c.model == "" {
		return CompletionResult{}, &ServiceError{
			Message: "服务端尚未完成智脑 API 配置。",
			Status:  http.StatusServiceUnavailable,
		}
	}

	body, err := json.Marshal(map[string]any{
		"model":       c.model,
		"messages":    request.Messages,
		"temperature": request.Temperature,
		"max_tokens":  request.MaxTokens,
	})
	if err != nil {
		return CompletionResult{}, &ServiceError{
			Message: "Agent 请求无法生成，请重试。",
			Status:  http.StatusInternalServerError,
			Detail:  err.Error(),
		}
	}

	httpRequest, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/chat/completions",
		bytes.NewReader(body),
	)
	if err != nil {
		return CompletionResult{}, &ServiceError{
			Message: "Agent 请求无法生成，请重试。",
			Status:  http.StatusInternalServerError,
			Detail:  err.Error(),
		}
	}
	httpRequest.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpRequest.Header.Set("Content-Type", "application/json")
	httpRequest.Header.Set("Accept", "application/json")

	response, err := c.httpClient.Do(httpRequest)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return CompletionResult{}, &ServiceError{
				Message: "Agent 响应超时，请重试。",
				Status:  http.StatusGatewayTimeout,
				Detail:  err.Error(),
			}
		}
		return CompletionResult{}, &ServiceError{
			Message: "无法连接 Agent 服务，请检查网络后重试。",
			Status:  http.StatusBadGateway,
			Detail:  err.Error(),
		}
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBytes))
	if err != nil {
		return CompletionResult{}, &ServiceError{
			Message: "无法读取 Agent 返回结果，请重试。",
			Status:  http.StatusBadGateway,
			Detail:  err.Error(),
		}
	}

	var payload struct {
		ID      string `json:"id"`
		Model   string `json:"model"`
		Message string `json:"message"`
		Choices []struct {
			Message Message `json:"message"`
		} `json:"choices"`
		Usage any `json:"usage"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(responseBody, &payload); err != nil {
		return CompletionResult{}, &ServiceError{
			Message: "模型返回了无法识别的结果，请重试。",
			Status:  http.StatusBadGateway,
			Detail:  err.Error(),
		}
	}

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		detail := payload.Message
		if payload.Error != nil && payload.Error.Message != "" {
			detail = payload.Error.Message
		}
		return CompletionResult{}, &ServiceError{
			Message: "Agent 暂时无法完成请求，请稍后重试。",
			Status:  response.StatusCode,
			Detail:  detail,
		}
	}

	if len(payload.Choices) == 0 || strings.TrimSpace(payload.Choices[0].Message.Content) == "" {
		return CompletionResult{}, &ServiceError{
			Message: "模型返回了无法识别的结果，请重试。",
			Status:  http.StatusBadGateway,
		}
	}
	if payload.Model == "" {
		payload.Model = c.model
	}

	return CompletionResult{
		Content:   strings.TrimSpace(payload.Choices[0].Message.Content),
		Model:     payload.Model,
		Usage:     payload.Usage,
		RequestID: payload.ID,
	}, nil
}

func ParseJSONArtifact(content string) (map[string]any, error) {
	normalized := strings.TrimSpace(content)
	if strings.HasPrefix(normalized, "```") {
		firstLineEnd := strings.IndexByte(normalized, '\n')
		if firstLineEnd >= 0 {
			normalized = normalized[firstLineEnd+1:]
		}
	}
	normalized = strings.TrimSpace(strings.TrimSuffix(strings.TrimSpace(normalized), "```"))

	start := strings.IndexByte(normalized, '{')
	end := strings.LastIndexByte(normalized, '}')
	if start < 0 || end <= start {
		return nil, &ServiceError{
			Message: "Agent 未能生成有效草稿，请重试。",
			Status:  http.StatusBadGateway,
		}
	}

	var artifact map[string]any
	if err := json.Unmarshal([]byte(normalized[start:end+1]), &artifact); err != nil {
		return nil, &ServiceError{
			Message: "Agent 生成的草稿格式不完整，请重试。",
			Status:  http.StatusBadGateway,
			Detail:  fmt.Sprintf("decode artifact: %v", err),
		}
	}
	if artifact == nil {
		return nil, &ServiceError{
			Message: "Agent 未能生成有效草稿，请重试。",
			Status:  http.StatusBadGateway,
		}
	}
	return artifact, nil
}
