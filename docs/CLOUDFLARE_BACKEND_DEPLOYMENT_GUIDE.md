# Cloudflare 部署方式對照（Starter-kit vs 本專案 FastAPI）

本文件是額外補充說明，不會改動原有文件。

## 1) 你導師的 Starter-kit 在做什麼？

Starter-kit 是 **Cloudflare 原生架構**：

- **後端 API**：Cloudflare Workers
- **前端**：Cloudflare Pages
- **中間層**：Cloudflare Pages Functions 當作 API proxy

重點原因：
- OAuth / cookie 的 **同源需求**，用 Pages Functions 讓前後端看起來是同源。
- 環境路由（dev/prd）可以在 Pages Functions 做切換。

這是 **Cloudflare 原生專案**，不使用 FastAPI。

## 2) 本專案（FastAPI）跟它的差異

本專案是 **傳統後端框架**：
- **後端 API**：FastAPI（Python）
- **前端**：React + Vite
- **授權**：OPA
- **資料庫**：PostgreSQL

**關鍵差異**：FastAPI 不適合直接跑在 Workers，部署方式比較自然的是 **容器或 VM**。

## 3) FastAPI 架構應該怎麼選？

### 選擇原則（先求有）
- 你熟悉什麼平台，就先用什麼。
- 不熟就選最容易上手的：Render / Fly.io / Railway / VPS。

### 最合理、成本最低、維護簡單的組合

**前端：Cloudflare Pages**  
**後端：容器部署（任一平台）**  
**串接：CORS allowlist**

理由：
- FastAPI 容器化部署最直覺。
- Pages 只做前端，簡單穩定。
- CORS 控制前端網域即可，安全又好管理。

## 4) 串接方式（簡化版）

1. **後端部署到一個可跑容器/VM 的平台**
2. **後端開 CORS，只允許前端網域**
3. **前端用環境變數設定 API Base URL**

例如：

```
VITE_API_BASE_URL=https://api.yourdomain.com
```

## 5) 最小可行部署流程（需要你先選平台）

如果你告訴我你想用哪一個平台：

- Render
- Fly.io
- Railway
- VPS / 任一雲 VM

我可以直接給你一個「最小可行部署流程」，包含：
- 建置流程
- 環境變數設定
- CORS 範例
- 前端 Pages 設定

---

## 6) 推薦平台（MVP + 熟 Docker + 先以免費試用為主）

**建議選 Render（Free Web Service）**  
理由：對 Docker 友善、上手快，且官方有免費 Web Service 可用於試驗與 MVP。

補充對照：
- **Fly.io**：目前免費額度屬於舊方案（Legacy Free allowances），新帳號不一定有。
- **Railway**：有 30 天 $5 使用額度，之後會進入 $1/月（Free）或 $5/月（Hobby）起跳。

所以在「先求有」和「免費試用」前提下，Render 最單純。

---

## 7) Render 最小可行部署流程（Docker + FastAPI）

**A. 準備 Dockerfile（後端）**  
本專案已新增 `backend/Dockerfile`，可直接用 Render 的 Docker runtime。

你也可以先在本機測試：

```bash
cd backend
docker build -t casecheck-backend .
docker run --rm -p 8000:8000 --env-file .env casecheck-backend
```

**B. 在 Render 建立 Web Service**
1. 連接 GitHub repo  
2. 選 `Web Service`  
3. Runtime 選 `Docker`  
4. Root Directory 指向 `backend/`  
5. `Start Command` 可留空（Dockerfile 已有 `CMD`）  
6. 加入環境變數（最少要有以下幾個）

```
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DBNAME
SECRET_KEY=請換成安全字串
BACKEND_CORS_ORIGINS=["https://app.yourdomain.com"]
OPA_URL=http://<your-opa-host>:8181
```

注意：Render Postgres 提供的連線字串通常是 `postgresql://...`，請手動改成 `postgresql+asyncpg://...`。

**C. Render 資料庫**
若只要 MVP，可以先用 Render Postgres 的免費方案（建議用於試驗，不適合正式上線）。

**D. CORS 設定（後端）**
只允許你的 Cloudflare Pages 網域，例如：

```
https://app.yourdomain.com
```

**E. 前端串接**
在 `frontend/.env` 設定：

```
VITE_API_BASE_URL=https://api.yourdomain.com
```

**F. 前端部署**
前端持續使用 Cloudflare Pages（免費且穩定）。

**G. OPA（授權）提醒**
本專案啟用 PEP/OPA 授權，中介層會呼叫 `OPA_URL`。  
部署時你需要：
- 額外部署一個 OPA 服務（Render Private Service / 其他平台），或
- MVP 暫時停用 PEP（修改 `backend/app/main.py` 中的 `app.add_middleware(PEPMiddleware)`）

---

## 8) Render 部署 OPA（政策引擎）

本專案已新增 `opa/Dockerfile`，可直接部署 OPA 服務。

**A. 在 Render 建立 OPA Service**
1. 連接 GitHub repo  
2. 選 `Web Service`  
3. Runtime 選 `Docker`  
4. **Root Directory 設為 repo 根目錄**（不是 `opa/`）  
5. Dockerfile Path 設為 `opa/Dockerfile`  
6. 開放 `PORT`（Render 會自動提供）

**B. 設定後端 OPA_URL**
在後端 Web Service 環境變數加入：

```
OPA_URL=http://<opa-service-host>:8181
```

Render 內部服務建議使用 **Internal URL**（可減少外網暴露）。

**C. 驗證 OPA 是否可用**
部署完成後，你可以測試：

```
GET http://<opa-service-host>:8181/health
```

若顯示 `{"healthy": true}`，代表 OPA 正常。
