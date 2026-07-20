# Know-how Hub Gin Backend

360智汇的 Go + Gin Agent 服务端。它负责保管 360 智脑 API Key，并向前端提供四个 Agent：

- `task`：任务澄清与任务草稿，调用 `$clarify-knowhow-task`；
- `contribution`：贡献访谈与结构化贡献，调用 `$interview-practice-contribution`；
- `free-create`：自由创建 Know-how，调用 `$create-practice-knowhow`；
- `iteration`：基于现有版本生成迭代任务，调用 `$plan-knowhow-iteration`。

四个技能的标准文档位于 `skills/*/SKILL.md`。服务启动时会校验技能映射，并把对应技能嵌入每次 Agent 对话或草稿生成的系统提示词。技能文档通过 Go `embed` 打包进服务，修改后需要重新启动服务。

## 本地启动

`Backend/` 与 `FrontEnd/` 位于同一项目根目录下。要求 Go 1.25 或更高版本。首次启动会自动下载 Go 模块。

从项目根目录启动：

```bash
cd Backend
go mod download
go run ./cmd/server
```

或者已经位于 `Backend/` 时：

```bash
go mod download
go run ./cmd/server
```

默认地址为 `http://127.0.0.1:8787`。前端开发服务器通过 `/api` 代理访问。

真实密钥只保存在本地 `.env`，该文件已经被 `.gitignore` 排除。

## 配置

复制 `.env.example` 为 `.env`，并在服务端填写配置：

```dotenv
ZHINAO_API_BASE_URL=https://api.360.cn/v1
ZHINAO_API_KEY=replace-with-your-api-key
ZHINAO_MODEL=deepseek/deepseek-v4-flash
HOST=127.0.0.1
PORT=8787
ALLOWED_ORIGINS=http://localhost:5174,http://127.0.0.1:5174,https://know-how-hub-web-tonybotboy520.onrender.com,https://know-how-hub.vercel.app
```

API Key 只能保存在后端环境变量或密钥管理系统中，不能写入 React 源码或提交到仓库。

线上部署时，把 `ALLOWED_ORIGINS` 配置为实际前端域名，并在前端托管服务中把环境变量 `VITE_API_BASE_URL` 配置为这个后端服务的公开 HTTPS 地址。

## API

- `GET /api/health`：服务状态；
- `GET /api/agents`：四个 Agent 的公开信息；
- `POST /api/agents/:agentId/chat`：Agent 多轮对话；
- `POST /api/agents/:agentId/suggest`：为用户生成可编辑但不会自动发送的回答草稿；
- `POST /api/agents/:agentId/status`：动态分析对话覆盖度、关键缺口和可提交状态；
- `POST /api/agents/:agentId/generate`：生成结构化草稿。

## 验证

从项目根目录执行：

```bash
cd Backend
go test ./...
go vet ./...
go build -o bin/server ./cmd/server
```
