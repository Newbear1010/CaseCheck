# 資料庫設計文檔 (Database Schema)

> **版本**: v1.0
> **更新日期**: 2026-01-09
> **資料庫**: PostgreSQL 15+

---

## 目錄

1. [概述](#1-概述)
2. [ER 圖](#2-er-圖)
3. [資料表設計](#3-資料表設計)
4. [索引設計](#4-索引設計)
5. [約束與觸發器](#5-約束與觸發器)
6. [資料遷移策略](#6-資料遷移策略)
7. [性能優化](#7-性能優化)

---

## 1. 概述

### 1.1 設計原則

1. **正規化**: 符合第三正規式 (3NF)，避免資料冗餘
2. **可擴展性**: 支援未來功能擴展（如多租戶、國際化）
3. **審計追蹤**: 所有敏感表包含 `created_at` 和 `updated_at`
4. **軟刪除**: 關鍵資料使用 `deleted_at` 而非物理刪除
5. **UUID 主鍵**: 用戶、審計等敏感表使用 UUID
6. **不可變日誌**: 審計表使用 append-only 模式

### 1.2 命名規範

- **表名**: 小寫複數，單詞間用底線分隔 (例: `activity_cases`)
- **欄位名**: 小寫，單詞間用底線分隔 (例: `creator_id`)
- **主鍵**: `id`
- **外鍵**: `{table_name}_id` (例: `user_id`)
- **時間戳**: `created_at`, `updated_at`, `deleted_at`
- **布林值**: `is_{condition}` (例: `is_active`)

### 1.3 核心實體關係

```
users ←─────┐
  ↓         │
  │         │ (創建者)
  │         │
  ├─────→ activity_cases ←──── roles (審批者角色)
  │         ↓
  │         ├─────→ activity_members (多對多)
  │         ├─────→ attendance_records
  │         ├─────→ activity_files
  │         └─────→ approval_history
  │
  ├─────→ audit_logs
  └─────→ user_sessions
```

---

## 2. ER 圖

### 2.1 核心實體關係圖 (簡化版)

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   users     │1      * │  activity_cases  │*      1 │   roles     │
│─────────────│◄────────│──────────────────│◄────────│─────────────│
│ id (PK)     │creator  │ id (PK)          │         │ id (PK)     │
│ email       │         │ title            │         │ name        │
│ role_id (FK)│         │ status           │         │ description │
│ department  │         │ creator_id (FK)  │         └─────────────┘
└─────────────┘         │ risk_level       │
      ↑                 └──────────────────┘
      │                         │
      │                         │ 1
      │                         │
      │                         │ *
      │                 ┌──────────────────┐
      │                 │activity_members  │
      │                 │──────────────────│
      │                 │ activity_id (FK) │
      │                 │ user_id (FK)     │
      │                 │ role             │
      │                 └──────────────────┘
      │                         │
      │                         │ 1
      │                         │
      │                         │ *
      │                 ┌──────────────────────┐
      │                 │ attendance_records   │
      │                 │──────────────────────│
      │                 │ id (PK)              │
      │                 │ activity_id (FK)     │
      │                 │ user_id (FK)         │
      │                 │ visitor_name         │
      │                 │ type                 │
      │                 │ check_in_time        │
      │                 └──────────────────────┘
      │
      │ *
┌─────────────────┐
│  audit_logs     │
│─────────────────│
│ id (PK)         │
│ user_id (FK)    │
│ action          │
│ resource_type   │
│ resource_id     │
│ changes (JSONB) │
└─────────────────┘
```

---

## 3. 資料表設計

### 3.1 用戶與身分管理

#### 3.1.1 users (用戶表)

用戶基本資訊與身分管理。

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    phone VARCHAR(20),

    -- RBAC
    role_id UUID NOT NULL,

    -- 屬性 (ABAC)
    clearance_level SMALLINT DEFAULT 1 CHECK (clearance_level BETWEEN 1 AND 5),
    allowed_locations TEXT[], -- 允許的活動地點

    -- 狀態
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,

    -- 審計
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- 外鍵
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

COMMENT ON TABLE users IS '用戶基本資訊表';
COMMENT ON COLUMN users.clearance_level IS '安全等級 (1-5)，用於 ABAC 授權';
COMMENT ON COLUMN users.allowed_locations IS '允許管理的活動地點，用於政策檢查';
```

**範例資料**:
```sql
INSERT INTO users (id, email, password_hash, name, department, role_id, clearance_level) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@caseflow.com', '$2b$12$...', 'Admin User', 'IT', (SELECT id FROM roles WHERE name = 'ADMIN'), 5),
('550e8400-e29b-41d4-a716-446655440002', 'john@caseflow.com', '$2b$12$...', 'John Doe', 'Engineering', (SELECT id FROM roles WHERE name = 'USER'), 2);
```

---

#### 3.1.2 roles (角色表)

RBAC 角色定義。

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL CHECK (name IN ('ADMIN', 'USER', 'GUEST')),
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT TRUE, -- 系統預設角色不可刪除

    -- 審計
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roles_name ON roles(name);

COMMENT ON TABLE roles IS 'RBAC 角色定義表';
COMMENT ON COLUMN roles.is_system IS '系統角色（ADMIN/USER/GUEST）不可刪除';

-- 初始化系統角色
INSERT INTO roles (name, display_name, description, is_system) VALUES
('ADMIN', 'Policy Administrator', '完全權限，可審批、管理用戶與政策', TRUE),
('USER', 'Employee', '一般員工，可創建活動、簽到', TRUE),
('GUEST', 'Guest', '訪客，僅可查看與簽到', TRUE);
```

---

#### 3.1.3 permissions (權限表)

細粒度權限定義（用於 OPA Policy）。

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) UNIQUE NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    description TEXT,

    -- 審計
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_permissions_resource ON permissions(resource_type);

COMMENT ON TABLE permissions IS '權限動作定義表（用於 OPA Policy）';

-- 初始化權限
INSERT INTO permissions (action, resource_type, description) VALUES
('activity:view', 'activity', '查看活動'),
('activity:create', 'activity', '創建活動'),
('activity:edit', 'activity', '編輯活動'),
('activity:delete', 'activity', '刪除活動'),
('activity:approve', 'activity', '批准活動'),
('activity:reject', 'activity', '拒絕活動'),
('activity:check_in', 'activity', '活動簽到'),
('activity:report', 'activity', '查看活動報表'),
('admin:user_manage', 'user', '管理用戶'),
('admin:policy_manage', 'policy', '管理政策');
```

---

#### 3.1.4 role_permissions (角色-權限關聯表)

```sql
CREATE TABLE role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

COMMENT ON TABLE role_permissions IS '角色與權限的多對多關聯表';

-- 初始化 ADMIN 角色權限（全權限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'ADMIN'),
    id
FROM permissions;

-- 初始化 USER 角色權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'USER'),
    id
FROM permissions
WHERE action IN ('activity:view', 'activity:create', 'activity:edit', 'activity:check_in', 'activity:report');

-- 初始化 GUEST 角色權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'GUEST'),
    id
FROM permissions
WHERE action IN ('activity:view', 'activity:check_in');
```

---

#### 3.1.5 user_sessions (用戶會話表)

JWT Token 管理與會話追蹤。

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,

    -- Token 資訊
    access_token_jti VARCHAR(255) UNIQUE NOT NULL, -- JWT ID
    refresh_token_jti VARCHAR(255) UNIQUE, -- Refresh Token JWT ID

    -- 裝置與環境
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),

    -- 時間
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),

    -- 狀態
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,

    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_access_token ON user_sessions(access_token_jti) WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token_jti) WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = TRUE;

COMMENT ON TABLE user_sessions IS 'JWT 會話管理與追蹤';
COMMENT ON COLUMN user_sessions.access_token_jti IS 'JWT ID (jti claim)，用於 Token 撤銷';
```

---

### 3.2 活動管理

#### 3.2.1 activity_cases (活動案例表)

核心業務實體，管理活動生命週期。

```sql
CREATE TABLE activity_cases (
    id VARCHAR(20) PRIMARY KEY, -- 格式: C-{序號} 例: C-9021
    parent_id VARCHAR(20), -- 關聯到被拒絕的案例（重新提交）

    -- 基本資訊
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(200) NOT NULL,

    -- 時間
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,

    -- 狀態機
    status VARCHAR(20) DEFAULT 'DRAFT' NOT NULL CHECK (
        status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ONGOING', 'CLOSED')
    ),
    rejection_reason TEXT,

    -- 風險評估
    risk_level VARCHAR(10) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    risk_assessment JSONB, -- AI 分析結果

    -- 所有權
    creator_id UUID NOT NULL,
    approved_by_id UUID,
    approved_at TIMESTAMPTZ,
    rejected_by_id UUID,
    rejected_at TIMESTAMPTZ,

    -- 審計
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- 約束
    CONSTRAINT fk_activity_cases_parent FOREIGN KEY (parent_id) REFERENCES activity_cases(id) ON DELETE SET NULL,
    CONSTRAINT fk_activity_cases_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_activity_cases_approved_by FOREIGN KEY (approved_by_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_activity_cases_rejected_by FOREIGN KEY (rejected_by_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_activity_time CHECK (end_time > start_time),
    CONSTRAINT chk_rejection_reason CHECK (
        (status = 'REJECTED' AND rejection_reason IS NOT NULL) OR
        (status != 'REJECTED')
    )
);

CREATE INDEX idx_activity_cases_creator ON activity_cases(creator_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_activity_cases_status ON activity_cases(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_activity_cases_start_time ON activity_cases(start_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_activity_cases_parent ON activity_cases(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_activity_cases_risk_level ON activity_cases(risk_level);

-- GIN 索引用於 JSONB 查詢
CREATE INDEX idx_activity_cases_risk_assessment ON activity_cases USING GIN (risk_assessment);

COMMENT ON TABLE activity_cases IS '活動案例主表';
COMMENT ON COLUMN activity_cases.parent_id IS '父案例 ID（重新提交時關聯到被拒絕的案例）';
COMMENT ON COLUMN activity_cases.risk_assessment IS 'AI 風險分析結果（JSON 格式）';

-- 觸發器：自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_activity_cases_updated_at
BEFORE UPDATE ON activity_cases
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**範例資料**:
```sql
INSERT INTO activity_cases (id, title, description, location, start_time, end_time, status, risk_level, creator_id) VALUES
('C-9021', 'Q3 Product Launch Event', 'Global launch event for the new enterprise suite involving 200+ partners.', 'Main Auditorium', '2024-05-20 09:00:00+00', '2024-05-20 17:00:00+00', 'ONGOING', 'MEDIUM', '550e8400-e29b-41d4-a716-446655440001');
```

---

#### 3.2.2 activity_members (活動成員關聯表)

多對多關聯：活動與成員。

```sql
CREATE TABLE activity_members (
    activity_id VARCHAR(20) NOT NULL,
    user_id UUID NOT NULL,

    role VARCHAR(50) DEFAULT 'participant', -- organizer, participant, observer

    -- 審計
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (activity_id, user_id),
    CONSTRAINT fk_activity_members_activity FOREIGN KEY (activity_id) REFERENCES activity_cases(id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_activity_members_activity ON activity_members(activity_id);
CREATE INDEX idx_activity_members_user ON activity_members(user_id);

COMMENT ON TABLE activity_members IS '活動與成員的多對多關聯表';
COMMENT ON COLUMN activity_members.role IS '成員角色：organizer（組織者）、participant（參與者）、observer（觀察者）';
```

---

#### 3.2.3 attendance_records (點名記錄表)

簽到/簽退記錄。

```sql
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id VARCHAR(20) NOT NULL,

    -- 成員 OR 訪客
    user_id UUID, -- 成員簽到
    visitor_name VARCHAR(100), -- 訪客姓名
    visitor_company VARCHAR(100), -- 訪客公司
    visitor_email VARCHAR(255), -- 訪客郵箱

    type VARCHAR(10) NOT NULL CHECK (type IN ('MEMBER', 'VISITOR')),

    -- 簽到資訊
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    check_out_time TIMESTAMPTZ,
    check_in_method VARCHAR(50) DEFAULT 'QR_CODE' CHECK (
        check_in_method IN ('QR_CODE', 'MANUAL', 'FACE_ID', 'NFC')
    ),

    -- 位置
    check_in_location VARCHAR(200),

    -- 裝置資訊
    device_info JSONB,

    -- 審計
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_attendance_activity FOREIGN KEY (activity_id) REFERENCES activity_cases(id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_attendance_type CHECK (
        (type = 'MEMBER' AND user_id IS NOT NULL AND visitor_name IS NULL) OR
        (type = 'VISITOR' AND user_id IS NULL AND visitor_name IS NOT NULL)
    ),
    CONSTRAINT chk_check_out_after_in CHECK (
        check_out_time IS NULL OR check_out_time > check_in_time
    )
);

CREATE INDEX idx_attendance_activity ON attendance_records(activity_id);
CREATE INDEX idx_attendance_user ON attendance_records(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_attendance_check_in_time ON attendance_records(check_in_time);
CREATE INDEX idx_attendance_type ON attendance_records(type);

COMMENT ON TABLE attendance_records IS '活動簽到/簽退記錄';
COMMENT ON COLUMN attendance_records.type IS '簽到類型：MEMBER（成員）、VISITOR（訪客）';
COMMENT ON COLUMN attendance_records.check_in_method IS '簽到方式：QR_CODE、MANUAL、FACE_ID、NFC';
```

---

#### 3.2.4 activity_files (活動附件表)

活動相關文件管理。

```sql
CREATE TABLE activity_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id VARCHAR(20) NOT NULL,

    -- 文件資訊
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100), -- application/pdf, image/jpeg
    file_size BIGINT, -- bytes

    -- 儲存
    storage_path TEXT NOT NULL, -- S3/MinIO 路徑
    storage_bucket VARCHAR(100) DEFAULT 'activity-files',

    -- 上傳者
    uploaded_by_id UUID NOT NULL,

    -- 審計
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT fk_activity_files_activity FOREIGN KEY (activity_id) REFERENCES activity_cases(id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_files_uploader FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_activity_files_activity ON activity_files(activity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_activity_files_uploader ON activity_files(uploaded_by_id);

COMMENT ON TABLE activity_files IS '活動附件管理表';
COMMENT ON COLUMN activity_files.storage_path IS 'MinIO/S3 對象路徑';
```

---

### 3.3 審批流程

#### 3.3.1 approval_history (審批歷史表)

記錄活動的審批過程。

```sql
CREATE TABLE approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id VARCHAR(20) NOT NULL,

    -- 審批者
    approver_id UUID NOT NULL,

    -- 決策
    action VARCHAR(20) NOT NULL CHECK (action IN ('SUBMIT', 'APPROVE', 'REJECT', 'REQUEST_CHANGE')),
    decision VARCHAR(20) CHECK (decision IN ('APPROVED', 'REJECTED')),

    -- 備註
    comment TEXT,
    reason TEXT, -- 拒絕/要求修改的原因

    -- 審計
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_approval_activity FOREIGN KEY (activity_id) REFERENCES activity_cases(id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_approval_decision CHECK (
        (action = 'APPROVE' AND decision = 'APPROVED') OR
        (action = 'REJECT' AND decision = 'REJECTED') OR
        (action IN ('SUBMIT', 'REQUEST_CHANGE') AND decision IS NULL)
    )
);

CREATE INDEX idx_approval_activity ON approval_history(activity_id);
CREATE INDEX idx_approval_approver ON approval_history(approver_id);
CREATE INDEX idx_approval_created_at ON approval_history(created_at DESC);

COMMENT ON TABLE approval_history IS '活動審批歷史記錄';
COMMENT ON COLUMN approval_history.action IS '操作：SUBMIT（提交）、APPROVE（批准）、REJECT（拒絕）、REQUEST_CHANGE（要求修改）';
```

---

### 3.4 審計與日誌

#### 3.4.1 audit_logs (審計日誌表)

**不可變日誌 (Append-Only)**，記錄所有敏感操作。

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 操作者
    user_id UUID,
    user_email VARCHAR(255), -- 冗餘欄位（防止用戶刪除後無法追蹤）

    -- 操作
    action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, APPROVE, LOGIN, etc.
    resource_type VARCHAR(50) NOT NULL, -- activity_case, user, file, etc.
    resource_id VARCHAR(100),

    -- 變更內容
    changes JSONB, -- {"before": {...}, "after": {...}}

    -- 請求資訊
    request_method VARCHAR(10), -- GET, POST, PUT, DELETE
    request_path TEXT,
    request_body JSONB,
    response_status INTEGER,

    -- 授權決策
    policy_decision JSONB, -- PDP 回傳的決策結果

    -- 環境
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),

    -- 時間戳
    timestamp TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 禁止 UPDATE 和 DELETE（不可變日誌）
CREATE OR REPLACE RULE audit_logs_no_update AS
ON UPDATE TO audit_logs
DO INSTEAD NOTHING;

CREATE OR REPLACE RULE audit_logs_no_delete AS
ON DELETE TO audit_logs
DO INSTEAD NOTHING;

-- 撤銷所有非 INSERT 權限
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_ip ON audit_logs(ip_address);

-- GIN 索引用於 JSONB 查詢
CREATE INDEX idx_audit_changes ON audit_logs USING GIN (changes);
CREATE INDEX idx_audit_policy_decision ON audit_logs USING GIN (policy_decision);

COMMENT ON TABLE audit_logs IS '不可變審計日誌（Append-Only）';
COMMENT ON COLUMN audit_logs.changes IS '變更內容（JSON 格式）：{"before": {...}, "after": {...}}';
COMMENT ON COLUMN audit_logs.policy_decision IS 'PDP 授權決策結果';
```

**範例審計日誌**:
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "action": "UPDATE",
  "resource_type": "activity_case",
  "resource_id": "C-9021",
  "changes": {
    "before": {"status": "DRAFT", "title": "Old Title"},
    "after": {"status": "SUBMITTED", "title": "New Title"}
  },
  "policy_decision": {
    "allow": true,
    "reasons": [],
    "obligations": []
  },
  "ip_address": "192.168.1.100",
  "timestamp": "2024-05-20T10:30:00Z"
}
```

---

### 3.5 系統配置

#### 3.5.1 system_settings (系統設定表)

鍵值對配置表。

```sql
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    value_type VARCHAR(20) DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- 是否可被前端讀取

    -- 審計
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trigger_system_settings_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE system_settings IS '系統配置鍵值表';
COMMENT ON COLUMN system_settings.is_public IS '是否允許前端讀取（敏感配置設為 FALSE）';

-- 初始化設定
INSERT INTO system_settings (key, value, value_type, description, is_public) VALUES
('app.name', 'CaseFlow Enterprise', 'string', '應用名稱', TRUE),
('app.version', '1.0.0', 'string', '版本號', TRUE),
('security.session_timeout', '900', 'number', 'Session 超時（秒）', FALSE),
('security.max_login_attempts', '5', 'number', '最大登入嘗試次數', FALSE),
('feature.ai_risk_analysis', 'false', 'boolean', '是否啟用 AI 風險分析', FALSE);
```

---

## 4. 索引設計

### 4.1 核心索引策略

| 表名 | 索引類型 | 索引欄位 | 用途 |
|------|---------|---------|------|
| `users` | B-tree | `email` | 登入查詢 |
| `users` | B-tree | `role_id` | 角色過濾 |
| `activity_cases` | B-tree | `creator_id` | 查詢用戶活動 |
| `activity_cases` | B-tree | `status` | 狀態過濾 |
| `activity_cases` | B-tree | `start_time` | 時間範圍查詢 |
| `activity_cases` | GIN | `risk_assessment` | JSONB 查詢 |
| `attendance_records` | B-tree | `activity_id` | 活動簽到記錄 |
| `attendance_records` | B-tree | `check_in_time` | 時間排序 |
| `audit_logs` | B-tree | `timestamp` (DESC) | 日誌查詢 |
| `audit_logs` | GIN | `changes` | JSONB 查詢 |

### 4.2 複合索引

```sql
-- 活動列表查詢優化（狀態 + 創建者 + 時間）
CREATE INDEX idx_activity_cases_list
ON activity_cases(status, creator_id, start_time DESC)
WHERE deleted_at IS NULL;

-- 簽到記錄查詢優化（活動 + 時間）
CREATE INDEX idx_attendance_activity_time
ON attendance_records(activity_id, check_in_time DESC);
```

---

## 5. 約束與觸發器

### 5.1 CHECK 約束

已在表定義中包含，主要有：

- `activity_cases.end_time > start_time` - 確保結束時間晚於開始時間
- `activity_cases.status` - 限制狀態值
- `attendance_records.type` - 限制簽到類型
- `audit_logs` - 禁止 UPDATE/DELETE（不可變日誌）

### 5.2 觸發器

#### 5.2.1 自動更新 updated_at

```sql
-- 已在 activity_cases 和 system_settings 上啟用
-- 其他需要的表也可套用相同觸發器

CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

#### 5.2.2 審計觸發器（自動寫入 audit_logs）

```sql
CREATE OR REPLACE FUNCTION audit_activity_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            changes,
            timestamp
        ) VALUES (
            NEW.updated_by_id, -- 需要在應用層設定
            'UPDATE',
            'activity_case',
            NEW.id,
            jsonb_build_object(
                'before', row_to_json(OLD),
                'after', row_to_json(NEW)
            ),
            NOW()
        );
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            changes,
            timestamp
        ) VALUES (
            NEW.creator_id,
            'CREATE',
            'activity_case',
            NEW.id,
            jsonb_build_object('after', row_to_json(NEW)),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_activity_cases
AFTER INSERT OR UPDATE ON activity_cases
FOR EACH ROW
EXECUTE FUNCTION audit_activity_changes();
```

---

## 6. 資料遷移策略

### 6.1 Alembic 遷移流程

```bash
# 初始化 Alembic
alembic init alembic

# 創建初始 migration
alembic revision -m "initial_schema"

# 執行遷移
alembic upgrade head

# 回滾
alembic downgrade -1
```

### 6.2 版本控制

所有 Schema 變更必須通過 Alembic Migration：

```python
# alembic/versions/001_initial_schema.py
def upgrade():
    op.create_table('users', ...)
    op.create_table('roles', ...)
    # ...

def downgrade():
    op.drop_table('users')
    op.drop_table('roles')
    # ...
```

### 6.3 資料遷移最佳實踐

1. **向後相容性**: 新增欄位時使用 `DEFAULT` 或 `NULL`
2. **分階段遷移**: 大表變更分多次小步驟執行
3. **索引建立**: 使用 `CONCURRENTLY` 避免鎖表
```sql
CREATE INDEX CONCURRENTLY idx_new_column ON table_name(new_column);
```

---

## 7. 性能優化

### 7.1 查詢優化建議

#### 7.1.1 活動列表查詢

```sql
-- 優化前（全表掃描）
SELECT * FROM activity_cases WHERE status = 'APPROVED';

-- 優化後（使用索引 + 分頁）
SELECT id, title, status, start_time, risk_level
FROM activity_cases
WHERE status = 'APPROVED' AND deleted_at IS NULL
ORDER BY start_time DESC
LIMIT 20 OFFSET 0;
```

#### 7.1.2 簽到記錄統計

```sql
-- 使用 CTE 優化複雜查詢
WITH activity_stats AS (
    SELECT
        activity_id,
        COUNT(*) FILTER (WHERE type = 'MEMBER') AS member_count,
        COUNT(*) FILTER (WHERE type = 'VISITOR') AS visitor_count
    FROM attendance_records
    WHERE activity_id = 'C-9021'
    GROUP BY activity_id
)
SELECT
    ac.id,
    ac.title,
    COALESCE(ast.member_count, 0) AS members,
    COALESCE(ast.visitor_count, 0) AS visitors
FROM activity_cases ac
LEFT JOIN activity_stats ast ON ac.id = ast.activity_id
WHERE ac.id = 'C-9021';
```

### 7.2 分區策略（未來擴展）

當 `audit_logs` 超過千萬筆時，考慮按時間分區：

```sql
-- 按月份分區
CREATE TABLE audit_logs_2024_05 PARTITION OF audit_logs
FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');

CREATE TABLE audit_logs_2024_06 PARTITION OF audit_logs
FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
```

### 7.3 連線池設定

PostgreSQL 連線池建議：

```python
# SQLAlchemy
engine = create_engine(
    "postgresql://user:pass@localhost/caseflow",
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

---

## 附錄

### A. 完整 Schema SQL

完整的 SQL 腳本位於: `backend/database/schema.sql`

### B. 種子資料

初始化資料腳本: `backend/database/seed.sql`

### C. ER 圖工具

使用 [dbdiagram.io](https://dbdiagram.io) 生成視覺化 ER 圖。

---

**文檔維護者**: CaseFlow 開發團隊
**最後更新**: 2026-01-09
