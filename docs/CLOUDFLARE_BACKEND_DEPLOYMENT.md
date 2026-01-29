# CaseCheck 後端上雲（Cloudflare 搭配）部署指南

> **更新日期**: 2026-01-29
> **適用範圍**: CaseCheck FastAPI + PostgreSQL + OPA
> **目標**: 已用 Cloudflare 部署前端，現在讓後端安全上線並接上 Cloudflare

---

## 0) 為什麼後端要配合 Cloudflare？

Cloudflare 在你的架構中扮演「入口」與「安全層」：
- **DDoS/惡意流量防護**
- **TLS 憑證與 HTTPS**（免費）
- **WAF / Firewall Rules / Rate Limit**
- **Cloudflare Tunnel**：不需要公開後端 IP，也能讓後端上線
citeturn2search5turn2search8turn1search6

對 CaseCheck 來說，後端牽涉 **JWT、OPA 授權、資料庫**，因此 **必須穩定且可長時間運作** 的伺服器環境；Cloudflare Workers 適合輕量 API，但對本專案（FastAPI + SQLAlchemy + OPA）現階段不合適（依套件相容性與執行限制而定）。citeturn0search0turn0search1

---

## 1) 架構選擇（建議方案）

### 方案 A（推薦）
**後端部署在 VPS / Cloud VM（或 Render / Fly.io），再用 Cloudflare Tunnel 對外。**

```
User -> Cloudflare (DNS + TLS + WAF) -> Cloudflare Tunnel -> Backend (FastAPI) + OPA + Postgres
```

**理由**
- 你現有後端依賴（SQLAlchemy/asyncpg/OPA）在 Workers 受限
- Cloudflare Tunnel 可避免公開 IP，安全性更高

### 方案 B（不推薦給本專案）
**Cloudflare Workers + Python**
- 官方支援 FastAPI（ASGI），並由 Workers runtime 提供 ASGI server。citeturn0search0
- 但 Python Workers 在套件部署上仍有約束（官方文件會標示當前限制），不一定適合完整後端依賴。citeturn0search1

---

## 2) 先決條件

- 你有一個可用的 **VM / VPS**（Ubuntu 22.04 以上建議）
- 該 VM 能連外（可 `apt` / `pip`）
- Domain 已在 Cloudflare DNS 管理（或準備轉移過去）

---

## 3) 後端部署（VPS/VM 端）

> 以下以 Ubuntu 為例

### 3.1 安裝系統依賴
```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip nginx
```

### 3.2 取得專案與安裝依賴
```bash
git clone <你的repo>
cd CaseCheck/backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3.3 設定 `.env`
```bash
cp .env.example .env
# 填入 DB 連線、JWT SECRET、OPA 等設定
```

### 3.4 啟動 OPA（同機器）
```bash
opa run --server --watch ../policy
```

> 注意：`OPA_URL=http://localhost:8181`、`OPA_POLICY_PATH=/v1/data/casecheck/authz/response`

### 3.5 資料庫遷移
```bash
alembic upgrade head
```

### 3.6 啟動 FastAPI
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

> 生產環境建議使用 systemd 或 Gunicorn + Uvicorn workers

---

## 4) 使用 Cloudflare Tunnel 暴露後端

Cloudflare Tunnel 的好處：**後端不需公開 IP，也不需開 80/443**。

### 4.1 安裝 cloudflared
```bash
sudo apt install -y cloudflared
```
citeturn1search0

### 4.2 建立 Tunnel
```bash
cloudflared tunnel login
cloudflared tunnel create casecheck-backend
```
citeturn1search1

會產生一個 tunnel UUID（例如 `1234-...-abcd`）。

### 4.3 建立 Tunnel 設定檔
```bash
sudo mkdir -p /etc/cloudflared
sudo tee /etc/cloudflared/config.yml > /dev/null <<'YAML'
tunnel: <你的-tunnel-UUID>
credentials-file: /home/<user>/.cloudflared/<UUID>.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
YAML
```
citeturn0search7

### 4.4 設定 DNS
在 Cloudflare DNS 加一筆：
- `api.yourdomain.com` → **CNAME** → `<UUID>.cfargotunnel.com`

Cloudflare 會將這筆 DNS 指向 tunnel。citeturn0search2

### 4.5 啟動 Tunnel
```bash
cloudflared tunnel run casecheck-backend
```
citeturn1search9

---

## 5) Cloudflare 安全設定（建議）

### 5.1 啟用 Access（可選）
若是內網系統，建議搭配 **Cloudflare Access**，讓未登入者完全無法碰到後端。citeturn1search4

### 5.2 保護 Origin
- 建議限制 VM 只接受 `localhost` 或 Tunnel 連線
- 不要開公開 8000 埠（避免繞過 Cloudflare）
- 可使用 Cloudflare Tunnel 取代公開防火牆規則（對外只曝光 DNS）citeturn0search2

---

## 6) 前端接後端

前端 `.env` 指向 Cloudflare 子網域：
```bash
VITE_API_URL=https://api.yourdomain.com
```

並且後端 `.env` CORS 要允許你的前端域名：
```bash
CORS_ORIGINS=["https://your-frontend.pages.dev"]
```

---

## 7) 常見問題

### Q1: 為什麼不用 Cloudflare Workers 當後端？
本專案後端依賴 SQLAlchemy + OPA + PostgreSQL，Workers Python 目前仍有套件部署限制。citeturn0search0turn0search1

### Q2: `curl /v1/data/casecheck/authz/response` 一直回 `allow:false`
正常，因為你沒帶 input。可用帶 input 的測試請求確認。

### Q3: Tunnel 要不要開 8000 端口
不需要。Tunnel 是 outbound 連線，後端可以只綁 `localhost`。

---

## 8) 驗證清單

- [ ] 後端 `uvicorn` 正常啟動
- [ ] OPA `http://localhost:8181` 正常回應
- [ ] `api.yourdomain.com` 可連線到 `/docs`
- [ ] 前端能呼叫 `/v1/auth/login`
- [ ] QR check-in 流程可正常運作

---

## 9) 結論

目前最穩定、最貼近 MVP 的方式是：
**VPS/VM 部署 FastAPI + OPA + PostgreSQL，再用 Cloudflare Tunnel 作為公開入口。**

這樣能兼顧安全與維運成本，也可隨需求逐步擴展。

如果需要，我可以再補：
- systemd 服務檔範例
- Nginx 反向代理
- 使用 Docker Compose 一鍵啟動

---

## 10) 其他可行架構選項（雲端）

以下提供多種後端部署選項，方便你比較成本、維運難度與擴展性。

### 選項 A：AWS EC2 + RDS（傳統 VM）

**架構**：EC2（FastAPI + OPA） + RDS PostgreSQL  
**適合**：希望掌控細節與成本彈性，能接受自行維運。

**優點**
- 控制權高（OS/套件/網路）
- 成本可控、可逐步擴展
- RDS 提供備份與高可用選項

**缺點**
- 需維護伺服器、更新與監控
- 安全性與網路設定需要自行配置

**參考**（官方文件）
```text
EC2: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/LaunchingAndUsingInstances.html
RDS (PostgreSQL): https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.CreatingConnecting.PostgreSQL.html
```

---

### 選項 B：AWS ECS Fargate + RDS（容器化、免管伺服器）

**架構**：ECS Fargate（FastAPI 容器 + OPA sidecar） + RDS  
**適合**：想用容器化部署、又不想管理 EC2。

**優點**
- 不需維護 VM
- 容器部署流程標準化
- 可搭配 ALB 與 Auto Scaling

**缺點**
- 架構配置較複雜（VPC/SG/ECR/Task 定義）
- 成本可能高於單機 EC2

**參考**（官方文件）
```text
ECS: https://aws.amazon.com/documentation-overview/ecs/
Fargate: https://aws.amazon.com/documentation-overview/fargate/
```

---

### 選項 C：AWS Elastic Beanstalk + RDS（快速部署）

**架構**：Elastic Beanstalk（Python） + RDS  
**適合**：想快速部署、不想處理容器或多服務。

**優點**
- 部署快速、學習成本低
- 內建環境管理與基本監控

**缺點**
- 彈性與可控性較低
- OPA 通常要另起一個服務

**參考**（官方文件）
```text
EB Python Quickstart: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/python-quickstart.html
```

---

### 選項 D：AWS App Runner + RDS（托管容器）

**架構**：App Runner（FastAPI container） + RDS  
**適合**：你已經有 Docker image，想快速上線。

**優點**
- 部署簡化、可自動擴縮
- 內建 HTTPS 與簡易整合

**缺點**
- 多服務（OPA sidecar）支援有限
- 彈性不如 ECS

**參考**（官方文件）
```text
App Runner Overview: https://docs.aws.amazon.com/whitepapers/latest/overview-deployment-options/aws-apprunner.html
```

---

### 選項 E：GCP（Cloud Run + Cloud SQL）

**架構**：Cloud Run（FastAPI container） + Cloud SQL (PostgreSQL)  
**適合**：已容器化、希望自動擴縮且管理最少。

**優點**
- 無伺服器部署（按量計費）
- 自動擴縮、HTTPS 內建
- 與 Cloud SQL 整合成熟
ㄘ
**缺點**
- 需容器化與連線設定（VPC Connector）
- 高併發時成本可能上升

**參考**（官方文件）
```text
Cloud Run: https://cloud.google.com/run/docs
Cloud SQL (Postgres): https://cloud.google.com/sql/docs/postgres
```

---

## 11) 選擇建議

| 需求 | 建議方案 |
|------|----------|
| 快速上線、最省事 | Elastic Beanstalk / App Runner |
| 可控性高、成本彈性 | EC2 + RDS |
| 容器化、易擴展 | ECS Fargate + RDS |
| 不公開 IP、快速 MVP | Cloudflare Tunnel + VPS |
| GCP 生態 / Serverless | Cloud Run + Cloud SQL |
