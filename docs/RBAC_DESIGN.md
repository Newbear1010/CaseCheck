# RBAC 權限設計文檔 (RBAC Design)

> **版本**: v1.0
> **更新日期**: 2026-01-09
> **授權模型**: RBAC + ABAC (Hybrid)

---

## 目錄

1. [概述](#1-概述)
2. [角色定義](#2-角色定義)
3. [權限矩陣](#3-權限矩陣)
4. [Policy 規則](#4-policy-規則)
5. [OPA Policy 實作](#5-opa-policy-實作)
6. [前端權限檢查](#6-前端權限檢查)
7. [測試案例](#7-測試案例)

---

## 1. 概述

### 1.1 授權架構

CaseFlow 採用 **混合授權模型**：

- **RBAC (Role-Based Access Control)**: 粗粒度權限控制
- **ABAC (Attribute-Based Access Control)**: 細粒度條件判斷
- **Policy-First**: 所有決策由 OPA Policy 計算

### 1.2 設計原則

1. **Default Deny**: 預設拒絕，必須明確授權
2. **最小權限**: 只給必要的權限
3. **職責分離 (SoD)**: 申請者不能審批自己的請求
4. **可解釋性**: 每個拒絕都有明確原因
5. **動態授權**: 基於資源狀態、時間、環境等條件

### 1.3 授權流程

```
┌─────────────────┐
│  1. 前端請求     │
│  + JWT Token    │
└────────┬────────┘
         ↓
┌─────────────────┐
│  2. PEP 攔截     │
│  (API Middleware)│
└────────┬────────┘
         ↓
┌─────────────────────────────┐
│  3. 組裝 Decision Request   │
│  {                          │
│    subject: {id, role, ...} │
│    action: "activity:edit"  │
│    resource: {id, status...}│
│    context: {time, ip...}   │
│  }                          │
└────────┬────────────────────┘
         ↓
┌─────────────────┐
│  4. PDP (OPA)   │
│  評估 Policy     │
└────────┬────────┘
         ↓
┌─────────────────────────────┐
│  5. Decision Response       │
│  {                          │
│    allow: false,            │
│    reasons: [{...}],        │
│    obligations: []          │
│  }                          │
└────────┬────────────────────┘
         ↓
┌─────────────────┐
│  6. PEP 執行     │
│  allow → 放行    │
│  deny → 403     │
└─────────────────┘
```

---

## 2. 角色定義

### 2.1 系統角色

| 角色代碼 | 角色名稱 | 說明 | 典型用戶 |
|---------|---------|------|---------|
| `ADMIN` | Policy Administrator | 完全權限，可審批、管理用戶與政策 | 系統管理員、高層主管 |
| `USER` | Employee | 一般員工，可創建活動、簽到、查看報表 | 一般員工 |
| `GUEST` | Guest | 訪客，僅可查看公開活動與簽到 | 外部訪客、承包商 |

### 2.2 角色特性

#### ADMIN (管理員)

**核心能力**:
- ✅ 完全權限（繞過大部分 Policy 檢查）
- ✅ 審批所有活動（批准/拒絕）
- ✅ 管理用戶（CRUD）
- ✅ 管理政策規則
- ✅ 查看所有審計日誌

**使用場景**:
- 活動審批
- 用戶權限管理
- 系統配置
- 安全審計

#### USER (員工)

**核心能力**:
- ✅ 創建活動（DRAFT 狀態）
- ✅ 編輯自己的 DRAFT 活動
- ✅ 提交審批
- ✅ 簽到（自己參與的活動）
- ✅ 查看自己創建/參與的活動報表

**限制**:
- ❌ 不能審批活動
- ❌ 不能編輯已提交/已批准的活動
- ❌ 不能查看其他用戶的私有資料

**使用場景**:
- 組織部門活動
- 參加公司活動
- 查看自己的簽到記錄

#### GUEST (訪客)

**核心能力**:
- ✅ 查看已批准/進行中的活動（非 DRAFT）
- ✅ 簽到（僅限 IN_PROGRESS 狀態活動）
- ✅ 查看公開資訊

**限制**:
- ❌ 不能創建活動
- ❌ 不能編輯任何資源
- ❌ 不能查看 DRAFT 或 REJECTED 活動
- ❌ 不能查看報表

**使用場景**:
- 外部訪客參加活動
- 承包商簽到
- 臨時訪問

---

## 3. 權限矩陣

### 3.1 活動管理權限

| 操作 | ADMIN | USER | GUEST | 說明 |
|------|-------|------|-------|------|
| **查看活動列表** | ✅ 全部 | ✅ 自己的 + 公開的 | ✅ 僅公開的（非 DRAFT） | - |
| **查看活動詳情** | ✅ | ✅ | ✅ (非 DRAFT) | - |
| **創建活動** | ✅ | ✅ | ❌ | - |
| **編輯活動** | ✅ | ✅ (條件) | ❌ | USER: 僅 DRAFT + 自己是創建者 |
| **刪除活動** | ✅ | ❌ | ❌ | 僅 ADMIN |
| **提交審批** | ✅ | ✅ (自己的) | ❌ | 狀態必須是 DRAFT |
| **批准活動** | ✅ | ❌ | ❌ | 僅 ADMIN，且不能批准自己的 |
| **拒絕活動** | ✅ | ❌ | ❌ | 僅 ADMIN |
| **基於被拒絕活動重建** | ✅ | ✅ (自己的) | ❌ | 關聯 parent_id |

### 3.2 簽到權限

| 操作 | ADMIN | USER | GUEST | 說明 |
|------|-------|------|-------|------|
| **生成 QR Code** | ✅ | ✅ (自己的活動) | ❌ | - |
| **成員簽到** | ✅ | ✅ | ❌ | 必須是活動成員 |
| **訪客簽到** | ✅ | ✅ | ✅ | 僅限 IN_PROGRESS 狀態 |
| **查看簽到記錄** | ✅ 全部 | ✅ 自己參與的 | ❌ | - |
| **導出簽到報表** | ✅ | ✅ (自己的) | ❌ | - |

### 3.3 用戶管理權限

| 操作 | ADMIN | USER | GUEST | 說明 |
|------|-------|------|-------|------|
| **查看用戶列表** | ✅ | ❌ | ❌ | - |
| **創建用戶** | ✅ | ❌ | ❌ | - |
| **編輯用戶** | ✅ | ✅ (僅自己) | ❌ | USER 只能改自己的 profile |
| **刪除用戶** | ✅ | ❌ | ❌ | 軟刪除 |
| **修改角色** | ✅ | ❌ | ❌ | - |

### 3.4 審計與報表權限

| 操作 | ADMIN | USER | GUEST | 說明 |
|------|-------|------|-------|------|
| **查看審計日誌** | ✅ 全部 | ❌ | ❌ | - |
| **查看活動報表** | ✅ 全部 | ✅ 自己的 | ❌ | - |
| **查看統計儀表板** | ✅ | ✅ | ❌ | - |
| **導出報表** | ✅ | ✅ (自己的) | ❌ | - |

---

## 4. Policy 規則

### 4.1 全域規則

#### 規則 1: Default Deny

**描述**: 沒有明確 `allow` 的操作一律拒絕

**OPA 實作**:
```rego
package caseflow

default allow = false
```

#### 規則 2: ADMIN 完全權限

**描述**: ADMIN 角色繞過大部分權限檢查

**OPA 實作**:
```rego
allow if {
    input.subject.role == "ADMIN"
}
```

**例外**: ADMIN 仍受 SoD 規則限制（不能批准自己的活動）

---

### 4.2 活動管理規則

#### 規則 3: 查看活動

**USER 可以查看**:
- 自己創建的活動（任何狀態）
- 自己參與的活動（任何狀態）
- 所有 APPROVED/IN_PROGRESS/COMPLETED 活動

**GUEST 可以查看**:
- 僅 APPROVED/IN_PROGRESS/COMPLETED 狀態的活動

**OPA 實作**:
```rego
allow if {
    input.action == "activity:view"
    input.subject.role == "USER"
    # 自己創建或參與
    activity_viewable_by_user(input.subject, input.resource)
}

allow if {
    input.action == "activity:view"
    input.subject.role == "GUEST"
    # 僅公開狀態
    input.resource.status in ["APPROVED", "IN_PROGRESS", "COMPLETED"]
}

activity_viewable_by_user(subject, resource) if {
    # 是創建者
    resource.creator_id == subject.id
}

activity_viewable_by_user(subject, resource) if {
    # 是成員
    subject.id in resource.member_ids
}

activity_viewable_by_user(subject, resource) if {
    # 公開狀態
    resource.status in ["APPROVED", "IN_PROGRESS", "COMPLETED"]
}
```

---

#### 規則 4: 編輯活動

**允許條件**:
- USER 可以編輯自己創建的 DRAFT 活動
- ADMIN 可以編輯任何活動

**拒絕條件**:
- REJECTED 活動不可編輯（不可變規則）
- 非創建者不能編輯
- 已提交/已批准的活動不可編輯

**OPA 實作**:
```rego
# 不可變規則：REJECTED 案例不可編輯
deny contains reason if {
    input.action == "activity:edit"
    input.resource.status == "REJECTED"
    reason := {
        "code": "REJECTED_IMMUTABLE",
        "message": "Rejected cases are archived and cannot be modified. Please create a new case based on this record.",
        "field": "status"
    }
}

# USER 編輯自己的 DRAFT
allow if {
    input.action == "activity:edit"
    input.subject.role == "USER"
    input.resource.status == "DRAFT"
    input.resource.creator_id == input.subject.id
}

# 其他情況拒絕（有明確原因）
deny contains reason if {
    input.action == "activity:edit"
    input.subject.role == "USER"
    input.resource.status != "DRAFT"
    reason := {
        "code": "INVALID_STATUS",
        "message": "You can only edit DRAFT activities",
        "current_status": input.resource.status,
        "allowed_statuses": ["DRAFT"]
    }
}

deny contains reason if {
    input.action == "activity:edit"
    input.subject.role == "USER"
    input.resource.creator_id != input.subject.id
    reason := {
        "code": "NOT_OWNER",
        "message": "You can only edit activities you created",
        "owner_id": input.resource.creator_id
    }
}
```

---

#### 規則 5: 提交審批

**允許條件**:
- 創建者可以提交自己的 DRAFT 活動
- 狀態必須是 DRAFT

**OPA 實作**:
```rego
allow if {
    input.action == "activity:submit"
    input.resource.status == "DRAFT"
    input.resource.creator_id == input.subject.id
}

deny contains reason if {
    input.action == "activity:submit"
    input.resource.status != "DRAFT"
    reason := {
        "code": "INVALID_STATUS_TRANSITION",
        "message": "Can only submit DRAFT activities",
        "current_status": input.resource.status
    }
}
```

---

### 4.3 審批規則

#### 規則 6: 職責分離 (SoD)

**描述**: 申請者不能審批自己的活動

**適用**: ADMIN 也受此規則限制

**OPA 實作**:
```rego
# SoD: 不能批准自己的活動
deny contains reason if {
    input.action in ["activity:approve", "activity:reject"]
    input.resource.creator_id == input.subject.id
    reason := {
        "code": "SOD_VIOLATION",
        "message": "You cannot approve your own activity (Separation of Duties)",
        "policy": "Self-approval is prohibited for audit compliance",
        "required": "Different approver"
    }
}

# ADMIN 可以批准（但非自己的）
allow if {
    input.action == "activity:approve"
    input.subject.role == "ADMIN"
    input.resource.creator_id != input.subject.id
    input.resource.status == "PENDING_APPROVAL"
}

# ADMIN 可以拒絕
allow if {
    input.action == "activity:reject"
    input.subject.role == "ADMIN"
    input.resource.status == "PENDING_APPROVAL"
}
```

---

### 4.4 簽到規則

#### 規則 7: 成員簽到

**允許條件**:
- 活動狀態為 APPROVED 或 IN_PROGRESS
- 用戶是活動成員
- 在活動時間範圍內（可選）

**OPA 實作**:
```rego
allow if {
    input.action == "activity:check_in"
    input.resource.status in ["APPROVED", "IN_PROGRESS"]
    input.subject.id in input.resource.member_ids
}

# 時間範圍檢查（可選）
deny contains reason if {
    input.action == "activity:check_in"
    not time_in_range(
        input.context.time,
        input.resource.start_time,
        input.resource.end_time
    )
    reason := {
        "code": "OUT_OF_TIME_WINDOW",
        "message": "Check-in is only allowed during the activity time",
        "start_time": input.resource.start_time,
        "end_time": input.resource.end_time
    }
}

time_in_range(current, start, end) if {
    current_ns := time.parse_rfc3339_ns(current)
    start_ns := time.parse_rfc3339_ns(start)
    end_ns := time.parse_rfc3339_ns(end)
    current_ns >= start_ns
    current_ns <= end_ns
}
```

---

#### 規則 8: 訪客簽到

**允許條件**:
- 活動狀態為 IN_PROGRESS
- 任何角色（包括 GUEST）

**OPA 實作**:
```rego
allow if {
    input.action == "activity:visitor_check_in"
    input.resource.status == "IN_PROGRESS"
}

deny contains reason if {
    input.action == "activity:visitor_check_in"
    input.resource.status != "IN_PROGRESS"
    reason := {
        "code": "ACTIVITY_NOT_IN_PROGRESS",
        "message": "Visitor check-in is only allowed for ongoing activities",
        "current_status": input.resource.status
    }
}
```

---

### 4.5 ABAC 規則（屬性條件）

#### 規則 9: 安全等級限制

**描述**: 高風險活動需要高安全等級用戶才能編輯

**OPA 實作**:
```rego
deny contains reason if {
    input.action == "activity:edit"
    input.resource.risk_level == "HIGH"
    input.subject.clearance_level < 3
    reason := {
        "code": "INSUFFICIENT_CLEARANCE",
        "message": "High-risk activities require clearance level 3 or higher",
        "required_clearance": 3,
        "current_clearance": input.subject.clearance_level
    }
}
```

---

#### 規則 10: 地點限制

**描述**: 用戶只能管理被允許的地點

**OPA 實作**:
```rego
deny contains reason if {
    input.action in ["activity:create", "activity:edit"]
    not location_allowed(input.subject, input.resource.location)
    reason := {
        "code": "LOCATION_NOT_ALLOWED",
        "message": "You are not authorized to manage activities in this location",
        "location": input.resource.location,
        "allowed_locations": input.subject.allowed_locations
    }
}

location_allowed(subject, location) if {
    # ADMIN 不受限制
    subject.role == "ADMIN"
}

location_allowed(subject, location) if {
    # 用戶的允許地點列表為空（表示無限制）
    count(subject.allowed_locations) == 0
}

location_allowed(subject, location) if {
    # 地點在允許列表中
    location in subject.allowed_locations
}
```

---

### 4.6 Context-based 規則

#### 規則 11: MFA 要求

**描述**: 高風險操作需要 MFA

**OPA 實作**:
```rego
deny contains reason if {
    input.action in ["activity:approve", "activity:delete", "user:delete"]
    input.context.mfa_level < 2
    reason := {
        "code": "INSUFFICIENT_MFA",
        "message": "This operation requires multi-factor authentication (MFA level 2)",
        "obligations": [
            {
                "type": "STEP_UP_MFA",
                "message": "Please complete MFA verification"
            }
        ]
    }
}
```

---

#### 規則 12: IP 限制

**描述**: 現場簽到只能來自特定網段

**OPA 實作**:
```rego
deny contains reason if {
    input.action == "activity:check_in"
    input.resource.location == "Main Auditorium"
    not net.cidr_contains("192.168.10.0/24", input.context.ip)
    reason := {
        "code": "LOCATION_RESTRICTED",
        "message": "Check-in for this location is only allowed from on-site network",
        "required_network": "192.168.10.0/24",
        "your_ip": input.context.ip
    }
}
```

---

## 5. OPA Policy 實作

### 5.1 完整 Policy 範例

```rego
# policy/policies/activity.rego

package caseflow.activity

import future.keywords.if
import future.keywords.in
import future.keywords.contains

# ===== Default Deny =====
default allow = false

# ===== ADMIN 完全權限 =====
allow if {
    input.subject.role == "ADMIN"
    # 但仍受 SoD 規則限制
}

# ===== 不可變規則 =====
deny contains reason if {
    input.action == "activity:edit"
    input.resource.status == "REJECTED"
    reason := {
        "code": "REJECTED_IMMUTABLE",
        "message": "Rejected cases are archived and cannot be modified",
        "field": "status"
    }
}

# ===== 查看權限 =====
allow if {
    input.action == "activity:view"
    input.subject.role == "USER"
    activity_viewable_by_user(input.subject, input.resource)
}

allow if {
    input.action == "activity:view"
    input.subject.role == "GUEST"
    input.resource.status in ["APPROVED", "IN_PROGRESS", "COMPLETED"]
}

activity_viewable_by_user(subject, resource) if {
    resource.creator_id == subject.id
}

activity_viewable_by_user(subject, resource) if {
    subject.id in resource.member_ids
}

activity_viewable_by_user(subject, resource) if {
    resource.status in ["APPROVED", "IN_PROGRESS", "COMPLETED"]
}

# ===== 編輯權限 =====
allow if {
    input.action == "activity:edit"
    input.subject.role == "USER"
    input.resource.status == "DRAFT"
    input.resource.creator_id == input.subject.id
}

# ===== 提交審批 =====
allow if {
    input.action == "activity:submit"
    input.resource.status == "DRAFT"
    input.resource.creator_id == input.subject.id
}

# ===== SoD 規則 =====
deny contains reason if {
    input.action in ["activity:approve", "activity:reject"]
    input.resource.creator_id == input.subject.id
    reason := {
        "code": "SOD_VIOLATION",
        "message": "You cannot approve your own activity",
        "policy": "Separation of Duties"
    }
}

# ===== 批准/拒絕 =====
allow if {
    input.action in ["activity:approve", "activity:reject"]
    input.subject.role == "ADMIN"
    input.resource.creator_id != input.subject.id
    input.resource.status == "PENDING_APPROVAL"
}

# ===== 簽到權限 =====
allow if {
    input.action == "activity:check_in"
    input.resource.status in ["APPROVED", "IN_PROGRESS"]
    input.subject.id in input.resource.member_ids
}

allow if {
    input.action == "activity:visitor_check_in"
    input.resource.status == "IN_PROGRESS"
}

# ===== Helper Functions =====
time_in_range(current, start, end) if {
    current_ns := time.parse_rfc3339_ns(current)
    start_ns := time.parse_rfc3339_ns(start)
    end_ns := time.parse_rfc3339_ns(end)
    current_ns >= start_ns
    current_ns <= end_ns
}
```

---

### 5.2 Policy 測試

```rego
# policy/tests/activity_test.rego

package caseflow.activity

import future.keywords.if

# ===== 測試 ADMIN 完全權限 =====
test_admin_can_view_any_activity if {
    allow with input as {
        "subject": {"role": "ADMIN", "id": "admin-1"},
        "action": "activity:view",
        "resource": {"id": "C-001", "status": "DRAFT", "creator_id": "user-1"}
    }
}

# ===== 測試 USER 只能查看自己的 DRAFT =====
test_user_can_view_own_draft if {
    allow with input as {
        "subject": {"role": "USER", "id": "user-1"},
        "action": "activity:view",
        "resource": {"id": "C-001", "status": "DRAFT", "creator_id": "user-1", "member_ids": ["user-1"]}
    }
}

test_user_cannot_view_others_draft if {
    not allow with input as {
        "subject": {"role": "USER", "id": "user-2"},
        "action": "activity:view",
        "resource": {"id": "C-001", "status": "DRAFT", "creator_id": "user-1", "member_ids": ["user-1"]}
    }
}

# ===== 測試 REJECTED 不可編輯 =====
test_rejected_activity_immutable if {
    not allow with input as {
        "subject": {"role": "USER", "id": "user-1"},
        "action": "activity:edit",
        "resource": {"id": "C-001", "status": "REJECTED", "creator_id": "user-1"}
    }

    count(deny) > 0 with input as {
        "subject": {"role": "USER", "id": "user-1"},
        "action": "activity:edit",
        "resource": {"id": "C-001", "status": "REJECTED", "creator_id": "user-1"}
    }
}

# ===== 測試 SoD =====
test_cannot_approve_own_activity if {
    not allow with input as {
        "subject": {"role": "ADMIN", "id": "admin-1"},
        "action": "activity:approve",
        "resource": {"id": "C-001", "status": "PENDING_APPROVAL", "creator_id": "admin-1"}
    }
}

test_admin_can_approve_others_activity if {
    allow with input as {
        "subject": {"role": "ADMIN", "id": "admin-1"},
        "action": "activity:approve",
        "resource": {"id": "C-001", "status": "PENDING_APPROVAL", "creator_id": "user-1"}
    }
}
```

**運行測試**:
```bash
opa test policy/ -v
```

---

## 6. 前端權限檢查

### 6.1 前端權限服務

前端實作 **鏡像後端邏輯** 用於 UI 優化（按鈕顯示/隱藏）。

**注意**: 前端檢查僅為 UX，真正授權在後端。

```typescript
// services/policyEngine.ts

import { Role, CaseStatus, ActivityCase, PermissionAction, PolicyDecision, User } from '../types';

export const checkPolicy = (
  user: User,
  action: PermissionAction,
  resource?: ActivityCase
): PolicyDecision => {
  // ADMIN 完全權限
  if (user.role === Role.ADMIN) {
    // 但 SoD 例外
    if (
      action === 'activity:approve' &&
      resource?.creatorId === user.id
    ) {
      return {
        allowed: false,
        reason: 'You cannot approve your own activity (SoD)'
      };
    }
    return { allowed: true };
  }

  // REJECTED 不可編輯
  if (
    resource?.status === CaseStatus.REJECTED &&
    action === 'activity:edit'
  ) {
    return {
      allowed: false,
      reason: 'Rejected cases cannot be modified. Please create a new case.'
    };
  }

  // GUEST 限制
  if (user.role === Role.GUEST) {
    if (
      action === 'activity:view' &&
      resource?.status !== CaseStatus.DRAFT
    ) {
      return { allowed: true };
    }
    if (
      action === 'activity:check-in' &&
      resource?.status === CaseStatus.IN_PROGRESS
    ) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Guests have restricted access'
    };
  }

  // USER 規則
  switch (action) {
    case 'activity:view':
      return { allowed: true };

    case 'activity:edit':
      if (
        resource?.creatorId === user.id &&
        resource?.status === CaseStatus.DRAFT
      ) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'You can only edit your own DRAFT activities'
      };

    case 'activity:check-in':
      if (
        resource?.status === CaseStatus.IN_PROGRESS ||
        resource?.status === CaseStatus.APPROVED
      ) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Check-in is only allowed for ongoing activities'
      };

    default:
      return {
        allowed: false,
        reason: 'Permission denied'
      };
  }
};
```

---

### 6.2 React Hook

```typescript
// hooks/usePermission.ts

import { useAuth } from '../context/AuthContext';
import { checkPolicy } from '../services/policyEngine';
import { PermissionAction, ActivityCase } from '../types';

export const usePermission = (
  action: PermissionAction,
  resource?: ActivityCase
) => {
  const { user } = useAuth();

  if (!user) {
    return {
      allowed: false,
      reason: 'Not authenticated'
    };
  }

  return checkPolicy(user, action, resource);
};
```

---

### 6.3 UI 使用範例

```typescript
// pages/CaseDetail.tsx

const CaseDetail: React.FC<{ activity: ActivityCase }> = ({ activity }) => {
  const editPermission = usePermission('activity:edit', activity);
  const approvePermission = usePermission('activity:approve', activity);

  return (
    <div>
      <h1>{activity.title}</h1>

      {/* 編輯按鈕 */}
      {editPermission.allowed && (
        <button onClick={handleEdit}>Edit</button>
      )}

      {/* 批准按鈕 */}
      {approvePermission.allowed && (
        <button onClick={handleApprove}>Approve</button>
      )}

      {/* 顯示權限拒絕原因 */}
      {!editPermission.allowed && (
        <p className="text-red-500">{editPermission.reason}</p>
      )}
    </div>
  );
};
```

---

## 7. 測試案例

### 7.1 單元測試範例

```typescript
// tests/policyEngine.test.ts

import { checkPolicy } from '../services/policyEngine';
import { Role, CaseStatus } from '../types';

describe('Policy Engine', () => {
  const adminUser = {
    id: 'admin-1',
    role: Role.ADMIN,
    name: 'Admin',
    email: 'admin@test.com',
    department: 'IT'
  };

  const normalUser = {
    id: 'user-1',
    role: Role.USER,
    name: 'User',
    email: 'user@test.com',
    department: 'Engineering'
  };

  const draftActivity = {
    id: 'C-001',
    title: 'Test Activity',
    status: CaseStatus.DRAFT,
    creatorId: 'user-1',
    // ...
  };

  test('ADMIN can view any activity', () => {
    const result = checkPolicy(adminUser, 'activity:view', draftActivity);
    expect(result.allowed).toBe(true);
  });

  test('USER can edit own DRAFT activity', () => {
    const result = checkPolicy(normalUser, 'activity:edit', draftActivity);
    expect(result.allowed).toBe(true);
  });

  test('USER cannot edit REJECTED activity', () => {
    const rejectedActivity = { ...draftActivity, status: CaseStatus.REJECTED };
    const result = checkPolicy(normalUser, 'activity:edit', rejectedActivity);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Rejected cases cannot be modified');
  });

  test('SoD: ADMIN cannot approve own activity', () => {
    const ownActivity = { ...draftActivity, creatorId: 'admin-1' };
    const result = checkPolicy(adminUser, 'activity:approve', ownActivity);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('SoD');
  });
});
```

---

## 附錄

### A. 權限速查表

| 我想... | 我需要... | 條件 |
|--------|----------|------|
| 查看任何活動 | ADMIN 角色 | 無 |
| 創建活動 | USER 或以上 | 無 |
| 編輯活動 | ADMIN 或 自己的 DRAFT | 狀態=DRAFT + 是創建者 |
| 批准活動 | ADMIN 角色 | 不是自己創建的 + 狀態=PENDING_APPROVAL |
| 拒絕活動 | ADMIN 角色 | 狀態=PENDING_APPROVAL |
| 簽到 | 任何角色 | 狀態=IN_PROGRESS (訪客) 或 是成員 |
| 管理用戶 | ADMIN 角色 | 無 |

### B. 錯誤碼對照

| 錯誤碼 | 說明 |
|--------|------|
| `POLICY_DENIED` | 一般授權失敗 |
| `SOD_VIOLATION` | 職責分離違規 |
| `REJECTED_IMMUTABLE` | REJECTED 案例不可變 |
| `NOT_OWNER` | 不是資源所有者 |
| `INVALID_STATUS` | 無效的資源狀態 |
| `INSUFFICIENT_CLEARANCE` | 安全等級不足 |
| `LOCATION_NOT_ALLOWED` | 地點不被允許 |
| `INSUFFICIENT_MFA` | MFA 等級不足 |

---

**文檔維護者**: CaseFlow 開發團隊
**最後更新**: 2026-01-09
