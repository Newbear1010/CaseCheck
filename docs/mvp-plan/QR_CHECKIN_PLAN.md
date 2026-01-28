# QR Code 報到流程實作計畫

## 目標
- 參與者必須登入後才能報到（JWT / cookie）。
- 主辦方顯示 QR code，**每 30 秒刷新**。
- QR token **60 秒過期**，含 `eventId` + `gateId` + `sessionToken`。
- 後端從 auth 取得 `userId`，驗證 registration 與 sessionToken，寫入 check-in。
- 以 DB **唯一索引**防止重複報到。

---

## Phase A — 資料結構與 DB 基礎

### A1. 新增/擴充資料表
**方案建議：新表**

1) `attendance_sessions`（或 `event_gate_sessions`）
- `id` (UUID)
- `activity_id`
- `gate_id`
- `session_token`
- `expires_at`
- `created_at`

2) `attendance_checkins`（或擴充 `attendance_records`）
- `activity_id`
- `user_id`
- `gate_id`
- `checked_in_at`

### A2. 唯一索引
- 方案 1：`UNIQUE (activity_id, user_id)`  
- 方案 2：`UNIQUE (activity_id, user_id, gate_id)`  

### A3. Migration
- Alembic migration 建立資料表與索引。
- 若沿用 `attendance_records`，需新增 `gate_id` 與 unique 索引。

---

## Phase B — QR 產生與刷新

### B1. QR Payload (JWT)
- `eventId`（activity_id）
- `gateId`
- `sessionToken`
- `exp = now + 60s`

### B2. 刷新策略
- 主辦方端 **每 30 秒**產生新的 JWT
- 同步建立/更新 `attendance_sessions` 記錄
- 前端顯示倒數計時

### B3. API 設計
- `POST /attendance/qr-code`
  - Input: `activity_id`, `gate_id`
  - Output: `{ token, expires_at }`

---

## Phase C — 報到驗證流程

### C1. 驗證流程
- 從 JWT 解析 `eventId` / `gateId` / `sessionToken`
- 從 auth 取得 `userId`
- 驗證：
  1) sessionToken 是否存在、有效、未過期  
  2) 是否已註冊 (registration)  
  3) 是否已報到（unique index 防重複）

### C2. API 設計
- `POST /attendance/check-in`
  - Input: `qr_code` (JWT)
  - Output: check-in record

---

## Phase D — 前端 UI

### D1. 主辦方端
- 案件詳情顯示 QR code
- 30 秒刷新 + 倒數計時
- 顯示 gateId

### D2. 參與者端
- `/check-in?code=...`
- 必須登入
- 顯示「成功 / 已簽到 / 未註冊 / QR 過期」

---

## Phase E — 權限與 OPA
- 新增 policy：
  - `attendance:generate_qr`（主辦方 / admin）
  - `attendance:checkin`（登入 + 已註冊）
- 統一錯誤訊息

---

## Phase F — 測試與驗證
- sessionToken 失效
- QR 過期
- 重複簽到（unique index）
- 未註冊報到

---

## 待你確認
1) gateId 模式：  
   - A) 固定單一 gate  
   - B) 可選 gate（管理員選）
2) registration 是否必須：  
   - A) 必須註冊才能報到  
   - B) 先不強制
3) unique 索引策略：  
   - A) `(activity_id, user_id)`  
   - B) `(activity_id, user_id, gate_id)`  
