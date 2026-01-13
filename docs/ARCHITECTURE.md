# 系統架構設計文檔 (CaseFlow Enterprise)

> **版本**: v1.0
> **更新日期**: 2026-01-09
> **狀態**: Draft

---

## 目錄

1. [系統概述](#1-系統概述)
2. [整體架構](#2-整體架構)
3. [前端架構](#3-前端架構)
4. [後端架構](#4-後端架構)
5. [授權架構 (IBM Policy-Driven)](#5-授權架構-ibm-policy-driven)
6. [技術選型](#6-技術選型)
7. [部署架構](#7-部署架構)
8. [安全性設計](#8-安全性設計)

---

## 1. 系統概述

### 1.1 系統定位

CaseFlow Enterprise 是一個**企業級活動管理與簽到系統**，採用 **Policy-First** 授權架構，提供：

- 活動案例管理 (CRUD + 審批流程)
- 基於角色與屬性的訪問控制 (RBAC + ABAC)
- QR Code 簽到與點名管理
- 完整的審計追蹤 (Audit Trail)
- 風險評估與合規檢查

### 1.2 核心設計原則

1. **Default Deny + 最小權限**：所有操作預設拒絕，必須明確授權
2. **Policy-as-Code**：授權規則版本化、可審計、可回滾
3. **不可變日誌**：所有敏感操作寫入 append-only 審計日誌
4. **職責分離 (SoD)**：申請者不能審批自己的請求
5. **可解釋性**：每個拒絕決策都有明確原因

---

## 2. 整體架構

### 2.1 系統分層

```
┌───────────────────────────────────────────────────────────────┐
│  前端層 (Presentation Layer)                                   │
│  - React SPA (TypeScript + Vite)                              │
│  - 登入/認證 UI                                                │
│  - Dashboard / 活動管理 / 審批中心                             │
│  - QR Code 掃描/生成                                           │
│  - 報表與統計                                                  │
└───────────────────────────────────────────────────────────────┘
                          ↓ HTTPS + Bearer Token (JWT)
┌───────────────────────────────────────────────────────────────┐
│  API Gateway / Reverse Proxy                                  │
│  - Nginx / Traefik                                            │
│  - TLS Termination                                            │
│  - Rate Limiting                                              │
│  - PEP (Coarse-grained enforcement)                           │
└───────────────────────────────────────────────────────────────┘
                          ↓
┌───────────────────────────────────────────────────────────────┐
│  後端 API 層 (Application Layer) - FastAPI                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  PEP Middleware (Policy Enforcement Point)              │ │
│  │  - 每個請求攔截                                          │ │
│  │  - 組裝 Subject/Action/Resource/Context                 │ │
│  │  - 調用 PDP 決策                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │ Auth/IAM Module │  │ Activity Module  │  │ Audit Module│ │
│  │ - JWT 驗證      │  │ - CRUD           │  │ - Append-only│ │
│  │ - OIDC 整合     │  │ - 狀態機         │  │ - Immutable │ │
│  └─────────────────┘  └──────────────────┘  └─────────────┘ │
│                                                               │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │ Approval Module │  │ Attendance Module│  │ File Module │ │
│  │ - 工作流        │  │ - QR Code        │  │ - S3/MinIO  │ │
│  │ - SoD 檢查      │  │ - 簽到記錄       │  │ - Pre-signed│ │
│  └─────────────────┘  └──────────────────┘  └─────────────┘ │
└───────────────────────────────────────────────────────────────┘
                          ↓
┌───────────────────────────────────────────────────────────────┐
│  Policy Decision Point (PDP)                                  │
│  - Open Policy Agent (OPA)                                    │
│  - Policy-as-Code (Rego)                                      │
│  - 返回 allow/deny + reasons + obligations                    │
└───────────────────────────────────────────────────────────────┘
                          ↓
┌───────────────────────────────────────────────────────────────┐
│  服務層 (Business Logic Layer)                                 │
│  - 用戶管理服務                                                │
│  - 活動管理服務                                                │
│  - 審批流程引擎                                                │
│  - AI 分析服務 (後端調用 Google Gemini)                        │
│  - 通知服務 (Email/SMS)                                        │
└───────────────────────────────────────────────────────────────┘
                          ↓
┌───────────────────────────────────────────────────────────────┐
│  資料訪問層 (Data Access Layer)                                │
│  - SQLAlchemy 2.x ORM                                         │
│  - Alembic (Migrations)                                       │
│  - Repository Pattern                                         │
└───────────────────────────────────────────────────────────────┘
                          ↓
┌───────────────────────────────────────────────────────────────┐
│  基礎設施層 (Infrastructure Layer)                             │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────┐   │
│  │ PostgreSQL   │  │ Redis       │  │ Elasticsearch/     │   │
│  │ - 主資料庫   │  │ - Cache     │  │ OpenSearch         │   │
│  │ - Audit Log  │  │ - Session   │  │ - 全文檢索         │   │
│  └──────────────┘  └─────────────┘  └────────────────────┘   │
│                                                               │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────┐   │
│  │ MinIO/S3     │  │ RabbitMQ/   │  │ Prometheus/        │   │
│  │ - 文件儲存   │  │ Kafka       │  │ Grafana            │   │
│  │ - 附件管理   │  │ - 事件總線  │  │ - 監控/觀測        │   │
│  └──────────────┘  └─────────────┘  └────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 核心模組

| 模組名稱 | 職責 | 技術棧 |
|---------|------|--------|
| **Auth/IAM** | JWT 驗證、OIDC 整合、用戶屬性管理 | FastAPI + PyJWT + httpx |
| **Policy Engine** | 授權決策、規則引擎 | Open Policy Agent (OPA) |
| **Activity Management** | 活動 CRUD、狀態機、關聯管理 | FastAPI + SQLAlchemy |
| **Approval Workflow** | 審批流程、SoD 檢查、通知 | Celery + State Machine |
| **Attendance** | QR Code 生成/驗證、簽到記錄 | FastAPI + qrcode + PyJWT |
| **File Management** | 文件上傳/下載、權限控制 | MinIO + Pre-signed URL |
| **Audit Logging** | 不可變日誌、變更追蹤 | PostgreSQL (append-only) |
| **Search** | 全文檢索、快速過濾 | Elasticsearch |
| **Notification** | Email、SMS、推送通知 | Celery + SendGrid/Twilio |

---

## 3. 前端架構

### 3.1 技術棧

- **框架**: React 19 + TypeScript
- **構建工具**: Vite 6
- **狀態管理**: React Context API (未來可升級 Zustand/Redux)
- **路由**: 自建路由 (未來可升級 React Router)
- **UI 框架**: TailwindCSS (CDN → 生產環境需內建)
- **圖標庫**: Lucide React
- **HTTP 客戶端**: Axios
- **表單驗證**: React Hook Form + Zod (待實作)
- **QR Code**: react-qr-code + html5-qrcode

### 3.2 目錄結構

```
frontend/
├── src/
│   ├── components/          # 可複用組件
│   │   ├── AppShell.tsx     # 主框架
│   │   └── PermissionWrapper.tsx  # 權限包裝器
│   ├── pages/               # 頁面組件
│   │   ├── Dashboard.tsx    # 儀表板
│   │   ├── ActivityWizard.tsx  # 活動創建精靈
│   │   ├── CaseDetail.tsx   # 活動詳情
│   │   ├── ApprovalCenter.tsx  # 審批中心
│   │   ├── AttendanceReport.tsx  # 點名報表
│   │   ├── AdminSystem.tsx  # 管理員控制台
│   │   └── CheckInModule.tsx  # 簽到模組
│   ├── context/             # React Context
│   │   └── AuthContext.tsx  # 認證上下文
│   ├── services/            # 業務邏輯服務
│   │   ├── policyEngine.ts  # 前端權限檢查 (鏡像後端邏輯)
│   │   └── aiService.ts     # AI 服務 (已禁用)
│   ├── api/                 # API 客戶端 (待實作)
│   │   ├── client.ts        # Axios 配置
│   │   ├── auth.api.ts      # 認證 API
│   │   ├── activity.api.ts  # 活動 API
│   │   └── user.api.ts      # 用戶 API
│   ├── hooks/               # 自定義 Hooks (待實作)
│   │   ├── usePermission.ts # 權限檢查 Hook
│   │   ├── useApi.ts        # API 調用 Hook
│   │   └── useAuth.ts       # 認證 Hook
│   ├── types.ts             # TypeScript 類型定義
│   ├── App.tsx              # 主應用
│   └── index.tsx            # 入口文件
├── index.html
├── vite.config.ts
└── package.json
```

### 3.3 前端權限模型

前端實作 **鏡像後端的權限邏輯**，用於：
- UI 元素顯示/隱藏 (按鈕、選單)
- 預檢查 (減少無效 API 請求)
- 提供即時反饋

**注意**: 前端權限檢查僅為 UX 優化，**真正的授權在後端**。

### 3.4 前端狀態管理 (當前實作)

```typescript
// 認證狀態 (AuthContext)
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (role: Role) => void;
  logout: () => void;
}

// 用戶介面
interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  status: 'ACTIVE' | 'INACTIVE';
}

// 角色定義
enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}
```

---

## 4. 後端架構

### 4.1 技術選型 (Python)

| 分類 | 技術 | 用途 |
|------|------|------|
| **Web 框架** | FastAPI + Uvicorn | RESTful API、高效能、型別安全 |
| **ORM** | SQLAlchemy 2.x | 資料庫抽象層 |
| **資料庫** | PostgreSQL 15+ | 主資料庫 |
| **遷移工具** | Alembic | Schema 版本控制 |
| **驗證** | Pydantic v2 | 請求/回應驗證 |
| **快取** | Redis 7+ | Session、快取、Rate Limiting |
| **背景任務** | Celery + Redis/RabbitMQ | 異步任務、審批通知 |
| **工作流** | (未來) Temporal | 複雜審批流程 |
| **搜尋** | Elasticsearch 8+ | 全文檢索、過濾 |
| **檔案儲存** | MinIO (S3 相容) | 文件管理 |
| **事件總線** | RabbitMQ | 服務解耦 |
| **監控** | OpenTelemetry + Prometheus + Grafana | 可觀測性 |
| **日誌** | ELK Stack (Elasticsearch + Logstash + Kibana) | 集中式日誌 |
| **身分認證** | OIDC (IBM Security Verify / App ID) | 企業 SSO |

### 4.2 目錄結構 (Python FastAPI)

```
backend/
├── alembic/                # 資料庫遷移
│   ├── versions/
│   └── env.py
├── app/
│   ├── main.py             # FastAPI 主應用
│   ├── config.py           # 配置管理
│   ├── dependencies.py     # 依賴注入
│   │
│   ├── api/                # API 路由層
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py     # 認證 API
│   │   │   ├── activities.py  # 活動 API
│   │   │   ├── approvals.py   # 審批 API
│   │   │   ├── attendance.py  # 簽到 API
│   │   │   ├── users.py    # 用戶管理 API
│   │   │   ├── files.py    # 文件 API
│   │   │   └── reports.py  # 報表 API
│   │   └── deps.py         # API 依賴項
│   │
│   ├── core/               # 核心組件
│   │   ├── security.py     # 密碼雜湊、JWT
│   │   ├── config.py       # 配置類
│   │   └── logging.py      # 日誌配置
│   │
│   ├── db/                 # 資料庫
│   │   ├── base.py         # 基礎類
│   │   ├── session.py      # Session 管理
│   │   └── init_db.py      # 初始化
│   │
│   ├── models/             # SQLAlchemy Models
│   │   ├── user.py
│   │   ├── role.py
│   │   ├── permission.py
│   │   ├── activity_case.py
│   │   ├── attendance_record.py
│   │   └── audit_log.py
│   │
│   ├── schemas/            # Pydantic Schemas
│   │   ├── user.py
│   │   ├── activity.py
│   │   ├── attendance.py
│   │   └── common.py
│   │
│   ├── services/           # 業務邏輯層
│   │   ├── auth_service.py
│   │   ├── activity_service.py
│   │   ├── approval_service.py
│   │   ├── attendance_service.py
│   │   ├── policy_service.py     # PDP 客戶端
│   │   ├── ai_service.py         # AI 風險分析
│   │   ├── file_service.py
│   │   └── audit_service.py
│   │
│   ├── middleware/         # 中間件
│   │   ├── pep.py          # Policy Enforcement Point
│   │   ├── audit.py        # 審計中間件
│   │   ├── error_handler.py
│   │   └── rate_limit.py
│   │
│   ├── utils/              # 工具函數
│   │   ├── qrcode.py       # QR Code 生成/驗證
│   │   ├── validators.py   # 自定義驗證器
│   │   └── formatters.py
│   │
│   └── tasks/              # Celery 任務
│       ├── notifications.py
│       ├── reports.py
│       └── sync_search.py
│
├── policy/                 # OPA Policy Repository
│   ├── policies/
│   │   ├── activity.rego
│   │   ├── approval.rego
│   │   ├── attendance.rego
│   │   └── admin.rego
│   ├── data/               # Policy Data
│   │   └── roles.json
│   └── tests/              # Policy 測試
│       └── activity_test.rego
│
├── tests/                  # 單元測試/集成測試
│   ├── unit/
│   ├── integration/
│   └── conftest.py
│
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── docker-compose.dev.yml
│
├── .env.example
├── pyproject.toml
├── requirements.txt
└── README.md
```

### 4.3 API 設計原則

1. **RESTful 風格**
   - 資源導向 URL: `/api/v1/activities/{id}`
   - HTTP 動詞語義化: GET/POST/PATCH/DELETE
   - 狀態碼標準化: 200/201/400/401/403/404/500

2. **版本控制**
   - URL 路徑版本: `/api/v1/...`
   - 向後相容性保證

3. **統一回應格式**
```python
{
  "success": true,
  "data": {...},
  "pagination": {...},  # 可選
  "meta": {...}         # 可選
}

# 錯誤回應
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid token",
    "details": {...}
  }
}
```

4. **分頁**
```python
{
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

---

## 5. 授權架構 (IBM Policy-Driven)

### 5.1 核心概念

CaseFlow 採用 **IBM Cloud IAM** 風格的授權架構，實現：

- **Policy-First**: 所有決策以 policy 為準
- **Default Deny**: 預設拒絕，必須明確授權
- **最小權限**: 角色給粗粒度能力，細粒度靠 policy 條件補上
- **可解釋性**: 每個拒絕決策都有原因

### 5.2 授權三元素 (Subject / Target / Actions)

```
Subject (誰)           Target (什麼資源)          Actions (什麼操作)
───────────────        ──────────────────         ────────────────
• User                 • ActivityCase             • create
• Access Group         • Approval                 • read
• Role                 • Attendance               • update
• Attributes:          • File                     • delete
  - department         • Report                   • approve
  - clearance                                     • reject
  - location           Resource Attributes:       • check_in
                       - status                   • export
Context (環境):        - owner_id
• time                 - location
• ip_address           - risk_level
• mfa_level            - start_time
• device_type
```

### 5.3 PEP/PDP 架構

```
┌────────────────────────────────────────────────────────┐
│  API Request                                           │
│  POST /api/v1/activities/C-9021/approve                │
│  Authorization: Bearer <JWT>                           │
└────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│  PEP Middleware (FastAPI)                              │
│  1. 驗證 JWT                                            │
│  2. 提取 User Context (id, role, dept, attrs)         │
│  3. 載入 Resource (activity from DB)                  │
│  4. 組裝 Decision Request                              │
└────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│  Decision Request (JSON → OPA)                         │
│  {                                                     │
│    "subject": {                                        │
│      "id": "user-123",                                 │
│      "role": "USER",                                   │
│      "department": "Engineering",                      │
│      "clearance": 2                                    │
│    },                                                  │
│    "action": "activity.approve",                       │
│    "resource": {                                       │
│      "type": "activity_case",                          │
│      "id": "C-9021",                                   │
│      "owner_id": "user-456",                           │
│      "status": "SUBMITTED",                            │
│      "risk_level": "MEDIUM"                            │
│    },                                                  │
│    "context": {                                        │
│      "time": "2024-05-20T14:30:00Z",                   │
│      "ip": "192.168.1.100",                            │
│      "mfa_level": 1                                    │
│    }                                                   │
│  }                                                     │
└────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│  PDP (Open Policy Agent)                               │
│  • 載入 Rego Policies                                  │
│  • 評估規則                                             │
│  • 計算決策                                             │
└────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│  Decision Response                                      │
│  {                                                     │
│    "allow": false,                                     │
│    "reasons": [                                        │
│      {                                                 │
│        "code": "INSUFFICIENT_ROLE",                    │
│        "message": "Only ADMIN can approve activities", │
│        "required_role": "ADMIN"                        │
│      }                                                 │
│    ],                                                  │
│    "obligations": []                                   │
│  }                                                     │
└────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│  PEP Enforcement                                       │
│  • allow=true → 放行到 Service Layer                   │
│  • allow=false → 返回 403 + reasons                    │
└────────────────────────────────────────────────────────┘
```

### 5.4 Policy Repository (Git-based)

```
policy/
├── policies/
│   ├── activity.rego          # 活動權限規則
│   ├── approval.rego          # 審批規則 (含 SoD)
│   ├── attendance.rego        # 簽到規則
│   ├── file.rego              # 文件權限
│   └── admin.rego             # 管理員規則
├── data/
│   ├── roles.json             # 角色定義
│   └── permissions.json       # 權限映射
├── tests/
│   ├── activity_test.rego
│   └── approval_test.rego
└── bundle.tar.gz              # OPA Bundle (CI 生成)
```

**Policy 發佈流程**:
1. 開發者修改 `.rego` 文件
2. Git commit + Push
3. CI 運行 `opa test` 驗證
4. CI 構建 `bundle.tar.gz`
5. OPA 服務定期拉取 bundle
6. 自動 reload

### 5.5 OPA Policy 範例 (Rego)

```rego
# policy/policies/activity.rego

package caseflow.activity

import future.keywords.if
import future.keywords.in

# Default deny
default allow = false

# Rule: ADMIN 可以做任何事
allow if {
    input.subject.role == "ADMIN"
}

# Rule: 只有活動創建者可以編輯 DRAFT 狀態的活動
allow if {
    input.action == "activity.edit"
    input.resource.status == "DRAFT"
    input.resource.owner_id == input.subject.id
}

# Rule: REJECTED 案例不可編輯
deny[reason] if {
    input.action == "activity.edit"
    input.resource.status == "REJECTED"
    reason := {
        "code": "REJECTED_IMMUTABLE",
        "message": "Rejected cases are archived and cannot be modified. Please create a new case."
    }
}

# Rule: 只有在活動時間內可以簽到
allow if {
    input.action == "activity.check_in"
    input.resource.status in ["APPROVED", "ONGOING"]
    time_in_range(input.context.time, input.resource.start_time, input.resource.end_time)
}

# Helper function
time_in_range(current, start, end) if {
    time.parse_rfc3339_ns(current) >= time.parse_rfc3339_ns(start)
    time.parse_rfc3339_ns(current) <= time.parse_rfc3339_ns(end)
}

# 返回拒絕原因
deny[reason] if {
    not allow
    reason := {
        "code": "POLICY_DENIED",
        "message": "Access denied by policy"
    }
}
```

### 5.6 職責分離 (SoD) 實作

```rego
# policy/policies/approval.rego

package caseflow.approval

import future.keywords.if

# Rule: 申請者不能審批自己的請求 (SoD)
deny[reason] if {
    input.action == "activity.approve"
    input.resource.owner_id == input.subject.id
    reason := {
        "code": "SOD_VIOLATION",
        "message": "You cannot approve your own activity (Separation of Duties)",
        "required": "Different approver"
    }
}
```

### 5.7 Context-based Restrictions (IBM 風格)

```rego
# policy/policies/context_restrictions.rego

package caseflow.context

import future.keywords.if

# Rule: 高風險操作需要 MFA Level 2+
deny[reason] if {
    input.action in ["activity.approve", "file.download_sensitive"]
    input.context.mfa_level < 2
    reason := {
        "code": "INSUFFICIENT_MFA",
        "message": "This operation requires MFA level 2 or higher",
        "obligations": [{"type": "STEP_UP_MFA"}]
    }
}

# Rule: 現場簽到只能來自特定 IP 網段
deny[reason] if {
    input.action == "activity.check_in"
    input.resource.location == "Main Auditorium"
    not net.cidr_contains("192.168.10.0/24", input.context.ip)
    reason := {
        "code": "LOCATION_RESTRICTED",
        "message": "Check-in for this location is only allowed from on-site network"
    }
}
```

---

## 6. 技術選型

### 6.1 前端技術棧

| 技術 | 版本 | 用途 |
|------|------|------|
| React | 19.2.3 | UI 框架 |
| TypeScript | 5.8.2 | 型別安全 |
| Vite | 6.2.0 | 構建工具 |
| TailwindCSS | 3.x (CDN) | 樣式框架 |
| Lucide React | 0.562.0 | 圖標庫 |
| Axios | 1.x | HTTP 客戶端 |

### 6.2 後端技術棧

| 技術 | 版本 | 用途 |
|------|------|------|
| Python | 3.11+ | 程式語言 |
| FastAPI | 0.109+ | Web 框架 |
| SQLAlchemy | 2.0+ | ORM |
| PostgreSQL | 15+ | 主資料庫 |
| Redis | 7+ | 快取/Session |
| Celery | 5.3+ | 背景任務 |
| OPA | 0.60+ | Policy Engine |
| Elasticsearch | 8+ | 搜尋引擎 |
| MinIO | RELEASE.2024+ | 對象儲存 |

### 6.3 DevOps 技術棧

| 技術 | 用途 |
|------|------|
| Docker + Docker Compose | 容器化 |
| Nginx / Traefik | 反向代理 |
| Prometheus + Grafana | 監控 |
| ELK Stack | 日誌管理 |
| GitHub Actions | CI/CD |
| Kubernetes (未來) | 容器編排 |

---

## 7. 部署架構

### 7.1 MVP 部署 (單機版)

```
┌────────────────────────────────────────┐
│  Cloudflare Pages                      │
│  - 前端靜態資源                         │
│  - CDN 加速                             │
└────────────────────────────────────────┘
                ↓ API Requests
┌────────────────────────────────────────┐
│  VPS / EC2 (單機)                       │
│  ┌──────────────────────────────────┐  │
│  │  Docker Compose                  │  │
│  │  ┌────────────┐  ┌────────────┐ │  │
│  │  │ FastAPI    │  │ OPA        │ │  │
│  │  │ (Uvicorn)  │  │            │ │  │
│  │  └────────────┘  └────────────┘ │  │
│  │  ┌────────────┐  ┌────────────┐ │  │
│  │  │ PostgreSQL │  │ Redis      │ │  │
│  │  └────────────┘  └────────────┘ │  │
│  │  ┌────────────┐  ┌────────────┐ │  │
│  │  │ Celery     │  │ MinIO      │ │  │
│  │  │ Worker     │  │            │ │  │
│  │  └────────────┘  └────────────┘ │  │
│  │  ┌────────────┐                  │  │
│  │  │ Nginx      │                  │  │
│  │  └────────────┘                  │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### 7.2 生產部署 (微服務版)

```
                    ┌─────────────────┐
                    │ Cloudflare CDN  │
                    └─────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │         Load Balancer / Ingress       │
        │         (Nginx / Traefik)             │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │         API Gateway                   │
        │         - Rate Limiting               │
        │         - PEP (Coarse-grained)        │
        └───────────────────────────────────────┘
                            ↓
    ┌──────────┬──────────┬──────────┬──────────┐
    │ Auth/IAM │ Activity │ Approval │ Attendance│
    │ Service  │ Service  │ Service  │ Service   │
    └──────────┴──────────┴──────────┴──────────┘
                            ↓
            ┌───────────────────────────┐
            │   Policy Decision Point   │
            │   (OPA Cluster)           │
            └───────────────────────────┘
                            ↓
    ┌──────────┬──────────┬──────────┬──────────┐
    │ Postgres │ Redis    │ Elastic  │ MinIO    │
    │ (Primary)│ Cluster  │ search   │ Cluster  │
    └──────────┴──────────┴──────────┴──────────┘
```

---

## 8. 安全性設計

### 8.1 認證機制

1. **OIDC (OpenID Connect)**
   - IdP: IBM Security Verify / App ID / Keycloak
   - 前端: Authorization Code Flow + PKCE
   - 後端: 驗證 JWT (JWKS)

2. **JWT 結構**
```json
{
  "sub": "user-123",
  "email": "john@example.com",
  "name": "John Doe",
  "role": "USER",
  "department": "Engineering",
  "clearance": 2,
  "exp": 1640995200,
  "iss": "https://auth.caseflow.com"
}
```

3. **Token 刷新**
   - Access Token TTL: 15 分鐘
   - Refresh Token TTL: 7 天
   - Rotation: 每次刷新都更新 Refresh Token

### 8.2 授權機制

- **PEP/PDP 架構** (如第 5 節)
- **最小權限原則**
- **動態授權** (基於屬性與上下文)

### 8.3 資料加密

| 層級 | 加密方式 |
|------|----------|
| **傳輸中** | TLS 1.3 |
| **靜態資料** | PostgreSQL TDE / 文件加密 (AES-256) |
| **密碼** | bcrypt (成本因子 12) |
| **敏感欄位** | 應用層加密 (Fernet / AES-GCM) |

### 8.4 審計日誌

所有敏感操作寫入 **append-only** 審計表：

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    request_body JSONB,
    response_status INT,
    decision_result JSONB,  -- PDP 決策結果
    changes JSONB,
    CONSTRAINT append_only CHECK (FALSE)  -- 防止 UPDATE/DELETE
);

-- 只允許 INSERT
REVOKE UPDATE, DELETE ON audit_logs FROM ALL;
```

### 8.5 安全最佳實踐

1. **OWASP Top 10 防護**
   - SQL Injection: 使用 ORM + 參數化查詢
   - XSS: React 自動轉義 + CSP Header
   - CSRF: SameSite Cookie + CSRF Token
   - Authentication Broken: OIDC + MFA
   - Sensitive Data Exposure: TLS + 欄位加密

2. **API 安全**
   - Rate Limiting: 100 req/min per IP
   - Input Validation: Pydantic schema
   - Output Filtering: 依權限過濾回應欄位

3. **依賴管理**
   - 定期掃描: `pip-audit` / Snyk
   - 自動更新: Dependabot

---

## 附錄

### A. 術語表

| 術語 | 全名 | 說明 |
|------|------|------|
| **PEP** | Policy Enforcement Point | 授權執行點 (攔截請求) |
| **PDP** | Policy Decision Point | 授權決策點 (計算決策) |
| **RBAC** | Role-Based Access Control | 基於角色的訪問控制 |
| **ABAC** | Attribute-Based Access Control | 基於屬性的訪問控制 |
| **SoD** | Separation of Duties | 職責分離 |
| **OIDC** | OpenID Connect | 認證協議 |
| **IAM** | Identity and Access Management | 身分與訪問管理 |
| **OPA** | Open Policy Agent | 開源政策引擎 |

### B. 參考資源

- [IBM Cloud IAM](https://cloud.ibm.com/docs/account?topic=account-iamoverview)
- [OPA Documentation](https://www.openpolicyagent.org/docs/latest/)
- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

**文檔維護者**: CaseFlow 開發團隊
**最後更新**: 2026-01-09
