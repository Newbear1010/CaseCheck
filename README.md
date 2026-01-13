# CaseCheck - 活動案件管理系統

一個全功能的活動案件管理系統，支援活動申請、審批、QR Code 簽到與政策驅動授權。

## 專案架構

```
CaseCheck/
├── frontend/              # React 19 + TypeScript + Vite 前端應用
│   ├── src/
│   │   ├── components/   # React 元件
│   │   ├── contexts/     # Context API 狀態管理
│   │   ├── pages/        # 頁面元件
│   │   ├── services/     # API 服務層
│   │   └── types/        # TypeScript 型別定義
│   └── index.html
│
├── backend/              # Python FastAPI 後端 API
│   ├── app/
│   │   ├── api/v1/      # RESTful API 端點 (45+ endpoints)
│   │   ├── models/      # SQLAlchemy ORM 模型 (12 tables)
│   │   ├── schemas/     # Pydantic schemas (OpenAPI)
│   │   ├── core/        # 核心配置 (JWT, Database, Config)
│   │   └── main.py      # FastAPI 應用入口
│   ├── alembic/         # 資料庫遷移
│   └── requirements.txt
│
└── docs/                # 完整技術文檔
    ├── ARCHITECTURE.md   # 系統架構設計
    ├── DATABASE_SCHEMA.md # 資料庫設計
    ├── API_SPEC.md       # API 規格
    ├── RBAC_DESIGN.md    # 權限設計
    └── INTEGRATION.md    # 整合指南
```

## 核心功能

### 🎯 活動管理
- 建立、編輯、刪除活動案件
- 活動類型分類與風險評估
- 審批工作流程（DRAFT → PENDING_APPROVAL → APPROVED）
- 職責分離原則（Separation of Duties）

### 👥 使用者管理
- 三種角色：ADMIN、USER、GUEST
- JWT 認證（15 分鐘 access token + 7 天 refresh token）
- 基於角色與屬性的存取控制（RBAC + ABAC）

### 📱 QR Code 簽到
- 自動生成活動簽到 QR Code
- 掃碼簽到/簽退功能
- 即時出席統計與報表

### 🔒 政策驅動授權
- OPA (Open Policy Agent) 政策引擎整合
- Rego 語言定義授權規則
- 時間限制、狀態檢查、上下文感知授權

### 📊 審計追蹤
- 不可變審計日誌（append-only）
- 完整的操作記錄追蹤
- 支援合規性稽核需求

## 技術棧

### 前端
- **框架**: React 19.2.3
- **構建工具**: Vite 6.2.0
- **語言**: TypeScript
- **樣式**: TailwindCSS (CDN)
- **圖示**: Lucide React
- **部署**: Cloudflare Pages

### 後端
- **框架**: FastAPI 0.109.0
- **語言**: Python 3.11+
- **ORM**: SQLAlchemy 2.0 (async)
- **資料庫**: PostgreSQL 15+
- **遷移工具**: Alembic
- **認證**: JWT (python-jose)
- **授權**: OPA (Open Policy Agent)

## 快速開始

### 前端開發

**前置需求**: Node.js 18+

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 構建生產版本
npm run build

# 預覽生產版本
npm run preview
```

前端應用會在 `http://localhost:5173` 運行。

**注意**: AI 風險評估功能已暫時停用，需要後端 API 整合。

### 後端開發

**前置需求**: Python 3.11+, PostgreSQL 15+

```bash
# 切換到後端目錄
cd backend

# 建立虛擬環境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安裝依賴
pip install -r requirements.txt

# 設定環境變數
cp .env.example .env
# 編輯 .env 設定 DATABASE_URL 和 SECRET_KEY

# 建立資料庫
createdb casecheck

# 執行資料庫遷移
alembic upgrade head

# 啟動開發伺服器
uvicorn app.main:app --reload
```

後端 API 會在 `http://localhost:8000` 運行。

**API 文檔**:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

詳細的後端設定說明請參考 [backend/README.md](backend/README.md)。

## 線上部署

### 前端部署 (Cloudflare Pages)

前端已部署至 Cloudflare Pages，設定自動部署：

1. 連接 GitHub 倉庫到 Cloudflare Pages
2. 構建設定：
   - 構建命令: `npm run build`
   - 輸出目錄: `dist`
   - 環境變數: 無需設定（AI 功能已停用）
3. 每次推送到 `main` 分支自動觸發部署

### 後端部署

後端建議部署方案：

1. **VPS / 雲端主機**
   - 使用 Docker 容器化部署
   - Nginx 作為反向代理
   - PostgreSQL 作為資料庫

2. **部署步驟**
   ```bash
   # 安裝 Python 與依賴
   pip install -r requirements.txt

   # 設定環境變數
   export DATABASE_URL="postgresql://..."
   export SECRET_KEY="..."

   # 執行遷移
   alembic upgrade head

   # 使用 Gunicorn 啟動
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

3. **OPA 部署**（選用）
   ```bash
   # 使用 Docker 運行 OPA
   docker run -d -p 8181:8181 openpolicyagent/opa:latest \
     run --server --addr :8181
   ```

## 開發指南

### 資料庫遷移

```bash
# 自動生成遷移
alembic revision --autogenerate -m "描述變更"

# 套用遷移
alembic upgrade head

# 回滾遷移
alembic downgrade -1

# 查看遷移歷史
alembic history
```

### API 端點概覽

總共 45+ 個端點，分為四個模組：

- **認證** (`/v1/auth`): 登入、註冊、刷新 token、登出
- **活動** (`/v1/activities`): CRUD、審批、退回、提交、參與者
- **出席** (`/v1/attendance`): 報名、簽到/退、QR Code、統計
- **使用者** (`/v1/users`): 個人資料、使用者列表

完整 API 規格請參考 [docs/API_SPEC.md](docs/API_SPEC.md)。

### 前端路由結構

- `/` - 首頁 / 儀表板
- `/activities` - 活動列表
- `/activities/new` - 建立新活動
- `/activities/:id` - 活動詳情
- `/attendance/:id` - 出席管理
- `/approval` - 待審批清單
- `/profile` - 個人資料

## 文檔

完整技術文檔位於 `docs/` 目錄：

- [系統架構設計](docs/ARCHITECTURE.md) - 整體架構、PEP/PDP 授權模型
- [資料庫設計](docs/DATABASE_SCHEMA.md) - 12 張表的完整 schema
- [API 規格](docs/API_SPEC.md) - 45+ 端點的詳細規格
- [RBAC 設計](docs/RBAC_DESIGN.md) - 角色權限與 OPA 政策
- [整合指南](docs/INTEGRATION.md) - 前後端整合方式

## 專案狀態

### ✅ 已完成
- 前端完整 UI 與路由結構
- 後端 FastAPI 框架與 ORM 模型
- Pydantic schemas 與 OpenAPI 文檔
- 資料庫設計與 Alembic 遷移配置
- JWT 認證機制
- 完整技術文檔

### 🚧 開發中
- 後端業務邏輯實作
- OPA 中介層整合
- 前後端 API 整合
- QR Code 掃描功能
- 單元測試與整合測試

### 📋 規劃中
- Docker 容器化
- CI/CD 流程
- 系統監控與日誌
- 效能優化
- 國際化支援

## 授權條款

MIT License

## 聯絡資訊

如有問題或建議，請開啟 GitHub Issue。
