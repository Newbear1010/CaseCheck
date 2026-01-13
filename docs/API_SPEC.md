# API 規格文檔 (API Specification)

> **版本**: v1.0
> **更新日期**: 2026-01-09
> **Base URL**: `https://api.caseflow.com/v1`

---

## 目錄

1. [概述](#1-概述)
2. [認證與授權](#2-認證與授權)
3. [通用規範](#3-通用規範)
4. [認證 API](#4-認證-api)
5. [活動管理 API](#5-活動管理-api)
6. [簽到管理 API](#6-簽到管理-api)
7. [審批流程 API](#7-審批流程-api)
8. [用戶管理 API](#8-用戶管理-api)
9. [報表與統計 API](#9-報表與統計-api)
10. [文件管理 API](#10-文件管理-api)
11. [錯誤處理](#11-錯誤處理)
12. [附錄](#12-附錄)

---

## 1. 概述

### 1.1 設計原則

- **RESTful**: 遵循 REST 架構風格
- **資源導向**: URL 代表資源，HTTP 動詞代表操作
- **無狀態**: 每個請求包含完整的認證與上下文資訊
- **HATEOAS**: 回應包含相關資源連結（未來實作）
- **版本控制**: URL 路徑包含版本號 (`/v1/`)

### 1.2 支援的格式

- **請求格式**: `application/json`
- **回應格式**: `application/json`
- **字元編碼**: UTF-8

### 1.3 HTTP 動詞語義

| 動詞 | 用途 | 冪等性 |
|------|------|--------|
| `GET` | 讀取資源 | ✅ |
| `POST` | 創建資源 | ❌ |
| `PUT` | 完整替換資源 | ✅ |
| `PATCH` | 部分更新資源 | ❌ |
| `DELETE` | 刪除資源 | ✅ |

---

## 2. 認證與授權

### 2.1 認證方式

使用 **Bearer Token (JWT)** 進行認證。

**請求 Header**:
```http
Authorization: Bearer <access_token>
```

### 2.2 JWT 結構

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440001",
  "email": "john@caseflow.com",
  "name": "John Doe",
  "role": "USER",
  "department": "Engineering",
  "clearance": 2,
  "exp": 1640995200,
  "iat": 1640991600,
  "jti": "unique-jwt-id"
}
```

### 2.3 Token 生命週期

- **Access Token**: 15 分鐘
- **Refresh Token**: 7 天
- **Token 刷新**: 使用 `/auth/refresh` 端點

### 2.4 授權模型

採用 **PEP/PDP 架構**：
1. 前端發送請求帶 JWT
2. API Gateway/中間件（PEP）攔截請求
3. PEP 調用 PDP（OPA）進行授權決策
4. 根據決策結果允許/拒絕請求

---

## 3. 通用規範

### 3.1 統一回應格式

#### 成功回應

```json
{
  "success": true,
  "data": {
    // 實際資料
  },
  "meta": {
    "timestamp": "2024-05-20T10:30:00Z",
    "request_id": "req-123456"
  }
}
```

#### 分頁回應

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

#### 錯誤回應

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "details": {
      "field": "token",
      "reason": "Token has expired"
    }
  },
  "meta": {
    "timestamp": "2024-05-20T10:30:00Z",
    "request_id": "req-123456"
  }
}
```

### 3.2 HTTP 狀態碼

| 狀態碼 | 說明 | 使用場景 |
|-------|------|---------|
| `200 OK` | 成功 | GET、PATCH、DELETE 成功 |
| `201 Created` | 已創建 | POST 成功創建資源 |
| `204 No Content` | 無內容 | DELETE 成功但無回應內容 |
| `400 Bad Request` | 請求錯誤 | 參數驗證失敗 |
| `401 Unauthorized` | 未認證 | Token 無效或過期 |
| `403 Forbidden` | 無權限 | 授權失敗（Policy 拒絕）|
| `404 Not Found` | 資源不存在 | 資源 ID 不存在 |
| `409 Conflict` | 衝突 | 資源狀態衝突（如重複創建）|
| `422 Unprocessable Entity` | 無法處理 | 業務邏輯驗證失敗 |
| `429 Too Many Requests` | 請求過多 | Rate Limiting |
| `500 Internal Server Error` | 伺服器錯誤 | 未預期的錯誤 |

### 3.3 分頁參數

所有列表端點支援以下查詢參數：

| 參數 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `page` | integer | 1 | 頁碼（從 1 開始）|
| `limit` | integer | 20 | 每頁筆數（最大 100）|
| `sort` | string | - | 排序欄位（前綴 `-` 表示降序）|

**範例**:
```
GET /v1/activities?page=2&limit=50&sort=-created_at
```

### 3.4 過濾參數

支援的過濾運算符：

| 運算符 | 說明 | 範例 |
|--------|------|------|
| `eq` | 等於 | `?status=eq:APPROVED` |
| `ne` | 不等於 | `?status=ne:DRAFT` |
| `gt` | 大於 | `?created_at=gt:2024-05-01` |
| `lt` | 小於 | `?created_at=lt:2024-06-01` |
| `in` | 包含 | `?status=in:APPROVED,ONGOING` |
| `like` | 模糊匹配 | `?title=like:Launch` |

---

## 4. 認證 API

### 4.1 登入

```http
POST /auth/login
```

**請求 Body**:
```json
{
  "email": "john@caseflow.com",
  "password": "SecurePassword123!"
}
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "john@caseflow.com",
      "name": "John Doe",
      "role": "USER",
      "department": "Engineering",
      "status": "ACTIVE"
    }
  }
}
```

**錯誤回應** (`401 Unauthorized`):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

### 4.2 刷新 Token

```http
POST /auth/refresh
```

**請求 Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900
  }
}
```

---

### 4.3 登出

```http
POST /auth/logout
Authorization: Bearer <access_token>
```

**成功回應** (`204 No Content`):
無內容

---

### 4.4 當前用戶資訊

```http
GET /auth/me
Authorization: Bearer <access_token>
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "john@caseflow.com",
    "name": "John Doe",
    "role": "USER",
    "department": "Engineering",
    "clearance_level": 2,
    "allowed_locations": ["Main Auditorium", "Conference Room A"],
    "status": "ACTIVE",
    "email_verified": true,
    "last_login_at": "2024-05-20T09:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## 5. 活動管理 API

### 5.1 獲取活動列表

```http
GET /activities
Authorization: Bearer <access_token>
```

**查詢參數**:
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `status` | string | ❌ | 過濾狀態（DRAFT/SUBMITTED/APPROVED/REJECTED/ONGOING/CLOSED）|
| `creator_id` | uuid | ❌ | 過濾創建者 |
| `risk_level` | string | ❌ | 風險等級（LOW/MEDIUM/HIGH）|
| `start_time_from` | datetime | ❌ | 開始時間範圍（起）|
| `start_time_to` | datetime | ❌ | 開始時間範圍（迄）|
| `page` | integer | ❌ | 頁碼（預設 1）|
| `limit` | integer | ❌ | 每頁筆數（預設 20）|
| `sort` | string | ❌ | 排序（預設 `-created_at`）|

**範例請求**:
```
GET /v1/activities?status=APPROVED&page=1&limit=20&sort=-start_time
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "C-9021",
        "title": "Q3 Product Launch Event",
        "description": "Global launch event...",
        "status": "ONGOING",
        "location": "Main Auditorium",
        "start_time": "2024-05-20T09:00:00Z",
        "end_time": "2024-05-20T17:00:00Z",
        "risk_level": "MEDIUM",
        "creator": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "name": "John Doe",
          "email": "john@caseflow.com"
        },
        "members_count": 3,
        "attendance_count": 150,
        "created_at": "2024-05-01T10:00:00Z",
        "updated_at": "2024-05-20T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

---

### 5.2 獲取活動詳情

```http
GET /activities/{activity_id}
Authorization: Bearer <access_token>
```

**路徑參數**:
- `activity_id` (string): 活動 ID（例: `C-9021`）

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "C-9021",
    "parent_id": null,
    "title": "Q3 Product Launch Event",
    "description": "Global launch event for the new enterprise suite involving 200+ partners.",
    "status": "ONGOING",
    "location": "Main Auditorium",
    "start_time": "2024-05-20T09:00:00Z",
    "end_time": "2024-05-20T17:00:00Z",
    "risk_level": "MEDIUM",
    "risk_assessment": {
      "score": 65,
      "reasoning": "AI analysis is currently disabled. Manual review required.",
      "suggestions": [
        "Review activity details carefully",
        "Ensure all safety protocols are followed"
      ]
    },
    "creator": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "John Doe",
      "email": "john@caseflow.com",
      "department": "Engineering"
    },
    "approved_by": {
      "id": "550e8400-e29b-41d4-a716-446655440099",
      "name": "Admin User",
      "email": "admin@caseflow.com"
    },
    "approved_at": "2024-05-15T14:30:00Z",
    "members": [
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "John Doe",
        "role": "organizer",
        "joined_at": "2024-05-01T10:00:00Z"
      },
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Jane Smith",
        "role": "participant",
        "joined_at": "2024-05-02T11:00:00Z"
      }
    ],
    "files": [
      {
        "id": "file-uuid-1",
        "file_name": "event_plan.pdf",
        "file_size": 2048576,
        "uploaded_by": "John Doe",
        "created_at": "2024-05-10T15:00:00Z"
      }
    ],
    "statistics": {
      "total_members": 3,
      "checked_in_members": 2,
      "total_visitors": 50,
      "total_attendance": 52
    },
    "created_at": "2024-05-01T10:00:00Z",
    "updated_at": "2024-05-20T08:00:00Z"
  }
}
```

**錯誤回應** (`404 Not Found`):
```json
{
  "success": false,
  "error": {
    "code": "ACTIVITY_NOT_FOUND",
    "message": "Activity with ID 'C-9999' not found"
  }
}
```

---

### 5.3 創建活動

```http
POST /activities
Authorization: Bearer <access_token>
```

**請求 Body**:
```json
{
  "title": "Q4 Team Building Event",
  "description": "Annual team building activity for all departments.",
  "location": "Conference Room B",
  "start_time": "2024-06-15T09:00:00Z",
  "end_time": "2024-06-15T17:00:00Z",
  "member_ids": [
    "550e8400-e29b-41d4-a716-446655440002",
    "550e8400-e29b-41d4-a716-446655440003"
  ]
}
```

**成功回應** (`201 Created`):
```json
{
  "success": true,
  "data": {
    "id": "C-9022",
    "title": "Q4 Team Building Event",
    "description": "Annual team building activity for all departments.",
    "status": "DRAFT",
    "location": "Conference Room B",
    "start_time": "2024-06-15T09:00:00Z",
    "end_time": "2024-06-15T17:00:00Z",
    "risk_level": null,
    "creator_id": "550e8400-e29b-41d4-a716-446655440001",
    "created_at": "2024-05-20T10:30:00Z",
    "updated_at": "2024-05-20T10:30:00Z"
  }
}
```

**錯誤回應** (`400 Bad Request`):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "title": ["Title is required"],
      "start_time": ["Start time must be in the future"],
      "end_time": ["End time must be after start time"]
    }
  }
}
```

---

### 5.4 更新活動

```http
PATCH /activities/{activity_id}
Authorization: Bearer <access_token>
```

**請求 Body** (部分更新):
```json
{
  "title": "Updated Title",
  "location": "New Location",
  "risk_level": "HIGH"
}
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "C-9022",
    "title": "Updated Title",
    "location": "New Location",
    "risk_level": "HIGH",
    "updated_at": "2024-05-20T11:00:00Z"
  }
}
```

**錯誤回應** (`403 Forbidden`):
```json
{
  "success": false,
  "error": {
    "code": "POLICY_DENIED",
    "message": "You are not allowed to edit this activity",
    "details": {
      "reason": "Only the creator can edit DRAFT activities",
      "required_permission": "activity:edit",
      "policy_decision": {
        "allow": false,
        "reasons": [
          {
            "code": "NOT_OWNER",
            "message": "You are not the creator of this activity"
          }
        ]
      }
    }
  }
}
```

---

### 5.5 刪除活動

```http
DELETE /activities/{activity_id}
Authorization: Bearer <access_token>
```

**成功回應** (`204 No Content`):
無內容

**錯誤回應** (`403 Forbidden`):
```json
{
  "success": false,
  "error": {
    "code": "POLICY_DENIED",
    "message": "You are not allowed to delete this activity",
    "details": {
      "reason": "Only ADMIN can delete activities"
    }
  }
}
```

---

### 5.6 提交活動審批

```http
POST /activities/{activity_id}/submit
Authorization: Bearer <access_token>
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "C-9022",
    "status": "SUBMITTED",
    "submitted_at": "2024-05-20T12:00:00Z"
  }
}
```

**錯誤回應** (`422 Unprocessable Entity`):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot submit activity in current status",
    "details": {
      "current_status": "APPROVED",
      "allowed_statuses": ["DRAFT"]
    }
  }
}
```

---

### 5.7 批准活動 (僅 ADMIN)

```http
POST /activities/{activity_id}/approve
Authorization: Bearer <access_token>
```

**請求 Body** (可選):
```json
{
  "comment": "Approved with recommendations for safety protocols."
}
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "C-9022",
    "status": "APPROVED",
    "approved_by_id": "550e8400-e29b-41d4-a716-446655440099",
    "approved_at": "2024-05-20T13:00:00Z"
  }
}
```

---

### 5.8 拒絕活動 (僅 ADMIN)

```http
POST /activities/{activity_id}/reject
Authorization: Bearer <access_token>
```

**請求 Body**:
```json
{
  "reason": "The venue does not meet fire safety standards for 50+ people."
}
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "C-9022",
    "status": "REJECTED",
    "rejection_reason": "The venue does not meet fire safety standards for 50+ people.",
    "rejected_by_id": "550e8400-e29b-41d4-a716-446655440099",
    "rejected_at": "2024-05-20T13:15:00Z"
  }
}
```

---

### 5.9 基於被拒絕活動重新創建

```http
POST /activities/{rejected_activity_id}/remake
Authorization: Bearer <access_token>
```

**請求 Body** (可選修改):
```json
{
  "location": "Approved Auditorium",
  "start_time": "2024-06-20T09:00:00Z"
}
```

**成功回應** (`201 Created`):
```json
{
  "success": true,
  "data": {
    "id": "C-9023",
    "parent_id": "C-8900",
    "title": "Internal Hackathon 2024",
    "description": "Two-day internal development sprint...",
    "status": "DRAFT",
    "location": "Approved Auditorium",
    "start_time": "2024-06-20T09:00:00Z",
    "created_at": "2024-05-20T14:00:00Z"
  }
}
```

---

## 6. 簽到管理 API

### 6.1 生成活動 QR Code

```http
GET /activities/{activity_id}/qrcode
Authorization: Bearer <access_token>
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "qr_code_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_at": "2024-05-20T17:00:00Z"
  }
}
```

**說明**:
- `qr_code_url`: Base64 編碼的 QR Code 圖片
- `token`: 加密的簽到 Token（包含 activity_id、有效期）
- `expires_at`: Token 過期時間（通常為活動結束時間）

---

### 6.2 成員簽到 (掃描 QR Code)

```http
POST /activities/{activity_id}/check-in
Authorization: Bearer <access_token>
```

**請求 Body**:
```json
{
  "type": "MEMBER",
  "qr_token": "eyJhbGciOiJIUzI1NiIs...",
  "location": "Main Auditorium Entrance"
}
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "attendance-uuid-1",
    "activity_id": "C-9021",
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "type": "MEMBER",
    "check_in_time": "2024-05-20T09:15:00Z",
    "check_in_method": "QR_CODE",
    "check_in_location": "Main Auditorium Entrance"
  }
}
```

**錯誤回應** (`422 Unprocessable Entity`):
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_CHECKED_IN",
    "message": "You have already checked in to this activity",
    "details": {
      "check_in_time": "2024-05-20T09:10:00Z"
    }
  }
}
```

---

### 6.3 訪客簽到 (手動登記)

```http
POST /activities/{activity_id}/check-in
Authorization: Bearer <access_token>
```

**請求 Body**:
```json
{
  "type": "VISITOR",
  "visitor_name": "David Miller",
  "visitor_company": "Global Tech Inc.",
  "visitor_email": "david@globaltech.com",
  "location": "Reception Desk"
}
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "attendance-uuid-2",
    "activity_id": "C-9021",
    "type": "VISITOR",
    "visitor_name": "David Miller",
    "visitor_company": "Global Tech Inc.",
    "check_in_time": "2024-05-20T10:00:00Z",
    "check_in_method": "MANUAL"
  }
}
```

---

### 6.4 簽退 (可選功能)

```http
POST /activities/{activity_id}/check-out
Authorization: Bearer <access_token>
```

**請求 Body**:
```json
{
  "attendance_id": "attendance-uuid-1"
}
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "attendance-uuid-1",
    "check_in_time": "2024-05-20T09:15:00Z",
    "check_out_time": "2024-05-20T17:30:00Z",
    "duration_minutes": 495
  }
}
```

---

### 6.5 獲取活動簽到記錄

```http
GET /activities/{activity_id}/attendance
Authorization: Bearer <access_token>
```

**查詢參數**:
- `type`: 過濾類型（MEMBER/VISITOR）
- `page`: 頁碼
- `limit`: 每頁筆數

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "attendance-uuid-1",
        "activity_id": "C-9021",
        "user": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "name": "John Doe",
          "department": "Engineering"
        },
        "type": "MEMBER",
        "check_in_time": "2024-05-20T09:15:00Z",
        "check_in_method": "QR_CODE"
      },
      {
        "id": "attendance-uuid-2",
        "activity_id": "C-9021",
        "visitor_name": "David Miller",
        "visitor_company": "Global Tech Inc.",
        "type": "VISITOR",
        "check_in_time": "2024-05-20T10:00:00Z",
        "check_in_method": "MANUAL"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 152
    },
    "summary": {
      "total_attendance": 152,
      "member_count": 102,
      "visitor_count": 50
    }
  }
}
```

---

## 7. 審批流程 API

### 7.1 獲取待審批列表 (僅 ADMIN)

```http
GET /approvals/pending
Authorization: Bearer <access_token>
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "C-9022",
        "title": "Q4 Team Building Event",
        "status": "SUBMITTED",
        "creator": {
          "id": "550e8400-e29b-41d4-a716-446655440002",
          "name": "Jane Smith"
        },
        "submitted_at": "2024-05-20T12:00:00Z",
        "risk_level": "LOW",
        "location": "Conference Room B",
        "start_time": "2024-06-15T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 4
    }
  }
}
```

---

### 7.2 獲取審批歷史

```http
GET /activities/{activity_id}/approval-history
Authorization: Bearer <access_token>
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "approval-uuid-1",
        "activity_id": "C-9021",
        "action": "SUBMIT",
        "approver": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "name": "John Doe"
        },
        "created_at": "2024-05-10T10:00:00Z"
      },
      {
        "id": "approval-uuid-2",
        "activity_id": "C-9021",
        "action": "APPROVE",
        "decision": "APPROVED",
        "approver": {
          "id": "550e8400-e29b-41d4-a716-446655440099",
          "name": "Admin User"
        },
        "comment": "Approved with safety recommendations",
        "created_at": "2024-05-15T14:30:00Z"
      }
    ]
  }
}
```

---

## 8. 用戶管理 API

### 8.1 獲取用戶列表 (僅 ADMIN)

```http
GET /users
Authorization: Bearer <access_token>
```

**查詢參數**:
- `role`: 過濾角色（ADMIN/USER/GUEST）
- `department`: 過濾部門
- `status`: 過濾狀態（ACTIVE/INACTIVE）
- `search`: 搜尋（姓名/郵箱）

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "email": "john@caseflow.com",
        "name": "John Doe",
        "role": "USER",
        "department": "Engineering",
        "status": "ACTIVE",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150
    }
  }
}
```

---

### 8.2 創建用戶 (僅 ADMIN)

```http
POST /users
Authorization: Bearer <access_token>
```

**請求 Body**:
```json
{
  "email": "newuser@caseflow.com",
  "name": "New User",
  "password": "SecurePassword123!",
  "role": "USER",
  "department": "Marketing",
  "clearance_level": 2
}
```

**成功回應** (`201 Created`):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "email": "newuser@caseflow.com",
    "name": "New User",
    "role": "USER",
    "department": "Marketing",
    "clearance_level": 2,
    "status": "ACTIVE",
    "created_at": "2024-05-20T15:00:00Z"
  }
}
```

---

### 8.3 更新用戶 (僅 ADMIN)

```http
PATCH /users/{user_id}
Authorization: Bearer <access_token>
```

**請求 Body**:
```json
{
  "department": "Sales",
  "clearance_level": 3,
  "status": "INACTIVE"
}
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "department": "Sales",
    "clearance_level": 3,
    "status": "INACTIVE",
    "updated_at": "2024-05-20T16:00:00Z"
  }
}
```

---

### 8.4 刪除用戶 (僅 ADMIN)

```http
DELETE /users/{user_id}
Authorization: Bearer <access_token>
```

**成功回應** (`204 No Content`):
無內容

**說明**: 使用軟刪除（`deleted_at` 設定為當前時間）

---

## 9. 報表與統計 API

### 9.1 簽到統計報表

```http
GET /reports/attendance
Authorization: Bearer <access_token>
```

**查詢參數**:
- `activity_id`: 過濾活動（可選）
- `start_date`: 開始日期
- `end_date`: 結束日期
- `department`: 過濾部門

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_activities": 10,
      "total_attendance": 1250,
      "member_attendance": 1000,
      "visitor_attendance": 250,
      "average_per_activity": 125
    },
    "by_activity": [
      {
        "activity_id": "C-9021",
        "activity_title": "Q3 Product Launch Event",
        "date": "2024-05-20",
        "total_attendance": 152,
        "member_count": 102,
        "visitor_count": 50
      }
    ],
    "by_department": [
      {
        "department": "Engineering",
        "total_attendance": 500,
        "activity_count": 5
      }
    ],
    "trend": [
      {
        "date": "2024-05-01",
        "attendance_count": 120
      },
      {
        "date": "2024-05-02",
        "attendance_count": 135
      }
    ]
  }
}
```

---

### 9.2 活動統計儀表板

```http
GET /reports/dashboard
Authorization: Bearer <access_token>
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "active_cases": 12,
    "pending_approvals": 4,
    "ongoing_activities": 3,
    "total_attendance_today": 85,
    "recent_activities": [
      {
        "id": "C-9021",
        "title": "Q3 Product Launch Event",
        "status": "ONGOING",
        "start_time": "2024-05-20T09:00:00Z"
      }
    ],
    "alerts": [
      {
        "type": "WARNING",
        "message": "Activity C-9020 has low attendance (30% of expected)"
      }
    ]
  }
}
```

---

## 10. 文件管理 API

### 10.1 上傳活動附件

```http
POST /activities/{activity_id}/files
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**請求 Body** (multipart/form-data):
- `file`: 文件（最大 10MB）

**成功回應** (`201 Created`):
```json
{
  "success": true,
  "data": {
    "id": "file-uuid-1",
    "activity_id": "C-9021",
    "file_name": "event_plan.pdf",
    "file_type": "application/pdf",
    "file_size": 2048576,
    "storage_path": "activities/C-9021/event_plan.pdf",
    "uploaded_by": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "John Doe"
    },
    "created_at": "2024-05-10T15:00:00Z"
  }
}
```

---

### 10.2 獲取文件下載連結 (Pre-signed URL)

```http
GET /files/{file_id}/download
Authorization: Bearer <access_token>
```

**成功回應** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "download_url": "https://storage.caseflow.com/activities/C-9021/event_plan.pdf?signature=...",
    "expires_in": 300
  }
}
```

**說明**:
- `download_url`: 臨時下載連結（有效期 5 分鐘）
- 使用 MinIO/S3 Pre-signed URL 機制

---

### 10.3 刪除文件

```http
DELETE /files/{file_id}
Authorization: Bearer <access_token>
```

**成功回應** (`204 No Content`):
無內容

---

## 11. 錯誤處理

### 11.1 錯誤碼列表

| 錯誤碼 | HTTP 狀態 | 說明 |
|--------|----------|------|
| `VALIDATION_ERROR` | 400 | 請求參數驗證失敗 |
| `INVALID_CREDENTIALS` | 401 | 登入憑證錯誤 |
| `TOKEN_EXPIRED` | 401 | Token 已過期 |
| `TOKEN_INVALID` | 401 | Token 無效 |
| `UNAUTHORIZED` | 401 | 未認證 |
| `POLICY_DENIED` | 403 | 授權失敗（Policy 拒絕）|
| `FORBIDDEN` | 403 | 無權限 |
| `NOT_FOUND` | 404 | 資源不存在 |
| `ACTIVITY_NOT_FOUND` | 404 | 活動不存在 |
| `USER_NOT_FOUND` | 404 | 用戶不存在 |
| `ALREADY_EXISTS` | 409 | 資源已存在 |
| `ALREADY_CHECKED_IN` | 422 | 已簽到 |
| `INVALID_STATUS_TRANSITION` | 422 | 無效的狀態轉換 |
| `SOD_VIOLATION` | 422 | 職責分離違規 |
| `RATE_LIMIT_EXCEEDED` | 429 | 超過速率限制 |
| `INTERNAL_ERROR` | 500 | 伺服器內部錯誤 |

### 11.2 Policy 拒絕錯誤範例

```json
{
  "success": false,
  "error": {
    "code": "POLICY_DENIED",
    "message": "You cannot approve your own activity",
    "details": {
      "policy_decision": {
        "allow": false,
        "reasons": [
          {
            "code": "SOD_VIOLATION",
            "message": "Separation of Duties: Approver cannot be the creator",
            "required": "Different approver"
          }
        ],
        "obligations": []
      }
    }
  }
}
```

---

## 12. 附錄

### 12.1 Rate Limiting

所有 API 端點受以下速率限制：

| 端點類型 | 限制 |
|---------|------|
| 認證 API | 10 requests/分鐘 |
| 讀取 API (GET) | 100 requests/分鐘 |
| 寫入 API (POST/PATCH/DELETE) | 30 requests/分鐘 |

**超過限制回應** (`429 Too Many Requests`):
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retry_after": 60
    }
  }
}
```

### 12.2 Webhook (未來功能)

支援以下事件的 Webhook 通知：

- `activity.created`
- `activity.submitted`
- `activity.approved`
- `activity.rejected`
- `attendance.checked_in`

### 12.3 WebSocket (未來功能)

實時簽到通知：
```
wss://api.caseflow.com/v1/ws/activities/{activity_id}/attendance
```

### 12.4 API 版本演進

- **v1**: 當前版本（穩定）
- **v2**: 計劃中（包含 GraphQL 支援）

### 12.5 開發環境

- **Production**: `https://api.caseflow.com/v1`
- **Staging**: `https://staging-api.caseflow.com/v1`
- **Development**: `http://localhost:5000/api/v1`

---

**文檔維護者**: CaseFlow 開發團隊
**最後更新**: 2026-01-09
**API 版本**: v1.0
