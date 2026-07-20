package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"know-how-hub/backend/internal/agents"
	"know-how-hub/backend/internal/server"
	"know-how-hub/backend/internal/zhinao"
)

func main() {
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		log.Printf("读取 .env 失败：%v", err)
	}

	host := envOrDefault("HOST", "127.0.0.1")
	port := envOrDefault("PORT", "8787")
	model := envOrDefault("ZHINAO_MODEL", "deepseek/deepseek-v4-flash")
	apiKey := strings.TrimSpace(os.Getenv("ZHINAO_API_KEY"))
	if err := agents.ValidateSkills(); err != nil {
		log.Fatalf("Agent 技能配置校验失败：%v", err)
	}

	client := zhinao.NewClient(zhinao.Config{
		BaseURL: os.Getenv("ZHINAO_API_BASE_URL"),
		APIKey:  apiKey,
		Model:   model,
		Timeout: 60 * time.Second,
	})
	router := server.NewRouter(server.Config{
		Model:          model,
		Configured:     apiKey != "",
		AllowedOrigins: splitCSV(os.Getenv("ALLOWED_ORIGINS")),
	}, client)

	httpServer := &http.Server{
		Addr:              host + ":" + port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       70 * time.Second,
		WriteTimeout:      70 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	shutdownSignals := make(chan os.Signal, 1)
	signal.Notify(shutdownSignals, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-shutdownSignals
		log.Println("正在停止 Know-how Hub 后端服务...")
		shutdownContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := httpServer.Shutdown(shutdownContext); err != nil {
			log.Printf("后端服务停止失败：%v", err)
		}
	}()

	if gin.Mode() != gin.ReleaseMode {
		log.Printf("Know-how Hub Gin backend is running at http://%s", httpServer.Addr)
	}
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("后端服务启动失败：%v", err)
	}
}

func envOrDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if value := strings.TrimSpace(part); value != "" {
			result = append(result, value)
		}
	}
	return result
}
