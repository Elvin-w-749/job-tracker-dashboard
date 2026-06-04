# 求职追踪看板 (Job Tracker Dashboard)

中文 | [English](README.md)

一个本地优先、全栈架构的求职记录追踪看板。支持从 CSV 或 Excel 导入您的投递记录，支持通过直接粘贴职位描述 (JD) 文本或截图，让大模型 (LLM) 自动解析提取关键信息，并与您的简历进行匹配打分，最后通过看板视图 (Kanban) 直观地展示您的整个求职漏斗和数据分析。

> 技术栈：**FastAPI + SQLAlchemy + SQLite** (后端) · **Next.js 14 + TypeScript + Tailwind + shadcn/ui + Recharts + TanStack Query** (前端) · **LLM 驱动** 的 JD 解析与简历匹配。

---

## 核心功能

- **CSV / Excel 导入** — 批量导入已有的求职投递记录。
- **JD 智能解析** — 支持粘贴 JD 文本或上传截图、PDF、DOCX 文件；大语言模型将自动提取公司名称、职位、城市、薪资、技能要求等，并输出结构化 JSON 数据。
- **简历背景提取** — 上传您的简历（支持图片、DOCX、TXT、MD 格式），大语言模型会为您生成一份用于匹配的结构化能力模型。
- **匹配度打分** — 系统会将每一个解析后的 JD 与您的简历背景进行匹配，给出 0-100 的评分，支持批量处理。
- **数据分析看板** — 使用 Recharts 可视化展示投递状态漏斗、城市分布、公司层级分布、渠道分布以及匹配度分布。
- **公司图鉴** — 以卡片网格的形式展示，并按公司层级进行分组。
- **多用户数据隔离** — 所有的 API 请求都会通过 `X-User-ID` 请求头进行隔离；前端通过 `localStorage` 在客户端管理多用户身份。

---

## 快速启动

### 1. 克隆项目

```bash
git clone <your-repo-url> job-tracker-dashboard
cd job-tracker-dashboard
```

### 2. 后端服务 (FastAPI :8000)

后端是一个纯 Python 项目。需要 **Python 3.10+** 版本（代码中使用了诸如 `str | None` 的现代类型提示）。强烈建议使用虚拟环境 (virtualenv)。

```bash
cd backend
python -m venv venv

# Windows 激活虚拟环境
venv\Scripts\activate
# macOS / Linux 激活虚拟环境
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

SQLite 数据库 (`backend/job_tracker.db`) 会在第一次运行时自动创建，并且已被加入 **.gitignore** 忽略列表——请勿将其提交到 Git。

### 3. 前端服务 (Next.js :3001)

```bash
cd frontend
npm install        # 也可以使用 pnpm install 或 yarn

# (可选) 如果需要自定义 API 地址
cp .env.local.example .env.local
# 如果您的后端没有运行在 http://localhost:8000，请编辑 .env.local

npm run dev
```

在浏览器中打开 <http://localhost:3001>。

### 4. 配置 LLM API 密钥

第一次打开系统时，点击数据看板页面的 **设置 (Settings)** 齿轮图标，在弹窗中粘贴您的 **MiniMax API 密钥**。该密钥会保存在本地 SQLite 数据库中，与用户绑定。除了请求 MiniMax 的接口外，它**绝对不会**被发送到任何其他地方。

> 本项目默认配置使用 MiniMax (一个支持图文多模态输入并能返回 JSON 的大语言模型)。如果您想使用其他供应商，请修改 `backend/services/minimax_service.py`。

---

## 项目结构

```text
job-tracker-dashboard/
├── backend/                 # FastAPI 应用
│   ├── main.py              # 所有的 REST 路由、跨域配置、启动时的数据库迁移
│   ├── database.py          # SQLAlchemy 引擎配置 + 迁移辅助函数
│   ├── models.py            # 数据表模型 (Application / UserConfig / BatchTask / BatchResult)
│   ├── schemas.py           # Pydantic 请求/响应数据校验模型
│   ├── prompts/             # LLM 提示词模板 (针对 JD 和简历)
│   └── services/
│       ├── minimax_service.py     # MiniMax LLM 客户端 (处理图文)
│       └── file_parser_service.py # CSV / Excel / DOCX / TXT 文件解析
├── frontend/                # Next.js 14 App Router 应用
│   ├── app/
│   │   ├── page.tsx         # 入口重定向
│   │   ├── dashboard/       # 数据分析看板页面
│   │   └── companies/       # 公司图鉴网格页面
│   ├── components/          # shadcn/ui 组件库 + 自定义业务组件
│   ├── hooks/               # React 自定义 hooks
│   ├── lib/                 # 工具函数 (用户信息上下文、API 客户端等)
│   └── package.json
├── .env.example             # 后端环境变量模板
├── .gitignore
├── LICENSE                  # MIT 开源协议
└── README.md
```

---

## API 概览

所有的接口路由都定义在 `backend/main.py` 中，并按资源分类。以下是最核心的几个接口：

| 请求方式 | 路径 | 描述 |
|---|---|---|
| `GET`  | `/api/applications` | 获取投递记录列表 (支持分页和过滤) |
| `POST` | `/api/applications` | 新增单条投递记录 |
| `POST` | `/api/applications/import` | 批量导入 CSV / Excel |
| `POST` | `/api/jd/parse-text` | 从文本中解析 JD |
| `POST` | `/api/jd/parse-image` | 从上传的图片中解析 JD |
| `POST` | `/api/resume/parse` | 解析简历并保存用户能力模型 |
| `POST` | `/api/batch/score` | 触发批量匹配打分任务 |
| `GET`  | `/api/stats/overview` | 获取看板所需的聚合统计数据 |
| `GET`  | `/api/settings/api-key` | 检查是否已配置 API 密钥 |
| `POST` | `/api/settings/api-key` | 保存 API 密钥 |
| `POST` | `/api/settings/api-key/test` | 测试验证 API 密钥的有效性 |

后端启动后，您可以访问 <http://localhost:8000/docs> 查看交互式接口文档 (Swagger UI)。

---

## 技术栈

**后端**
- [FastAPI](https://fastapi.tiangolo.com/) — REST 框架
- [SQLAlchemy](https://www.sqlalchemy.org/) — ORM
- SQLite — 轻量级嵌入式数据库
- [httpx](https://www.python-httpx.org/) — 异步 HTTP 客户端 (用于调用大模型)
- [pandas](https://pandas.pydata.org/), [openpyxl](https://openpyxl.readthedocs.io/), [python-docx](https://python-docx.readthedocs.io/) — 文件处理与解析
- [uvicorn](https://www.uvicorn.org/) — ASGI 服务器

**前端**
- [Next.js 14](https://nextjs.org/) (App Router 模式)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/) — 图表库
- [TanStack Query](https://tanstack.com/query) — 数据状态管理与请求缓存

**大语言模型 (LLM)**
- MiniMax (多模态模型：支持输入图片+文本，输出结构化 JSON)

---

## 配置参考

| 变量名 | 位置 | 默认值 | 作用 |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE` | `frontend/.env.local` | `http://localhost:8000` | 前端调用后端接口的基础 URL |

> **注意：** MiniMax 的 API 密钥**不会**从环境变量文件中读取，而是要求用户在运行时的 UI 设置页面中提供，并保存在 SQLite 数据库中。

---

## 开发注意事项

- 后端包含了一个启动时的自动迁移脚本 (`migrate_add_user_id`)，用于向旧数据库中补充 `user_id` 字段。
- 获取投递记录接口的 `page_size` 被硬性限制为最大 5000，以防止数据库查询过载。
- LLM 返回的响应有时可能会被 markdown 代码块 (`` `json ... ` ``) 包裹；`services/minimax_service.py` 中的解析器会在进行 JSON 解码之前自动剥离这些外壳。
- 解析 DOCX 简历时，会同时读取 `doc.paragraphs` (段落) 和 `doc.tables` (表格) 的内容——因为在真实场景中，很多人的简历会使用表格来排版教育或工作经历。

---

## 开源协议

[MIT](./LICENSE) — 详细信息请参阅 `LICENSE` 文件。
