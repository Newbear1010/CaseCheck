# i18n 使用指南

本專案已完成前端國際化（i18n）系統建置，支援繁體中文（zh-TW）和英文（en-US）切換。

## 已完成的更新

### 核心組件
- ✅ i18n Context 和 Hook (`context/I18nContext.tsx`)
- ✅ 語言檔案結構 (`locales/`)
  - `locales/zh-TW.ts` - 繁體中文翻譯
  - `locales/en-US.ts` - 英文翻譯
  - `locales/index.ts` - 匯出入口

### 已更新的元件
- ✅ App.tsx - 登入頁面和主路由
- ✅ AppShell.tsx - 側邊欄導航、語言切換按鈕
- ✅ Dashboard.tsx - 儀表板頁面
- ✅ ActivityWizard.tsx - 活動建立精靈
- ✅ CaseDetail.tsx - 活動詳情頁面
- ✅ ApprovalCenter.tsx - 審批中心
- ✅ AttendanceReport.tsx - 出席報表
- ✅ CheckInModule.tsx - 簽到模組
- ✅ AdminSystem.tsx - 系統管理

## 如何使用

### 在元件中使用翻譯

```typescript
import { useI18n } from '../context/I18nContext';

const MyComponent = () => {
  const { t, translate, locale, setLocale } = useI18n();

  return (
    <div>
      {/* 基本翻譯 */}
      <h1>{t.nav.dashboard}</h1>

      {/* 狀態值翻譯 */}
      <span>{t.status.APPROVED}</span>

      {/* 帶參數的翻譯 */}
      <p>{translate('dashboard.welcomeBack', { name: user.name })}</p>

      {/* 語言切換 */}
      <button onClick={() => setLocale(locale === 'zh-TW' ? 'en-US' : 'zh-TW')}>
        {locale === 'zh-TW' ? 'English' : '中文'}
      </button>
    </div>
  );
};
```

### 新增翻譯

在 `locales/zh-TW.ts` 和 `locales/en-US.ts` 中新增對應的翻譯：

```typescript
// locales/zh-TW.ts
export const zhTW = {
  // ...existing translations
  myNewSection: {
    title: '我的新標題',
    description: '我的新描述',
  },
};

// locales/en-US.ts
export const enUS = {
  // ...existing translations
  myNewSection: {
    title: 'My New Title',
    description: 'My New Description',
  },
};
```

然後在元件中使用：

```typescript
const { t } = useI18n();
console.log(t.myNewSection.title); // 中文: "我的新標題", 英文: "My New Title"
```

## 翻譯結構

```
locales/
├── zh-TW.ts      # 繁體中文翻譯（預設語言）
├── en-US.ts      # 英文翻譯
└── index.ts      # 匯出配置
```

### 翻譯分類

翻譯文件按功能分類：

- `common` - 通用文字（儲存、取消、確認等）
- `auth` - 認證相關
- `roles` - 角色名稱
- `status` - 狀態值翻譯（保留英文大寫狀態碼）
- `risk` - 風險等級
- `nav` - 導航選單
- `dashboard` - 儀表板
- `activity` - 活動管理
- `wizard` - 活動建立精靈
- `approval` - 審批相關
- `attendance` - 出席簽到
- `admin` - 管理員功能
- `header` - 頁首
- `messages` - 訊息提示
- `branding` - 品牌名稱
- `policy` - 政策與權限
- `dateTime` - 日期時間

## 狀態值處理

**重要**: 後端 API 的狀態值（如 `DRAFT`, `APPROVED`, `REJECTED`）保持英文大寫不變，僅在前端顯示時翻譯：

```typescript
// 後端 API 狀態（不變）
const activity = {
  status: 'APPROVED', // 保持英文
  riskLevel: 'HIGH',  // 保持英文
};

// 前端顯示（翻譯）
<span>{t.status[activity.status]}</span>  // 顯示：已核准 / Approved
<span>{t.risk[activity.riskLevel]}</span> // 顯示：高風險 / High
```

## 語言切換

語言切換按鈕已整合在側邊欄底部：

- 點擊「🌐 English」切換至英文
- 點擊「🌐 中文」切換至繁體中文
- 語言偏好儲存於 localStorage

## 待更新的頁面

以下頁面尚未更新 i18n，需要時可參考已更新的頁面模式進行修改：

- [x] CaseDetail.tsx
- [x] ApprovalCenter.tsx
- [x] AttendanceReport.tsx
- [x] CheckInModule.tsx
- [x] AdminSystem.tsx
- [ ] PermissionWrapper.tsx

**注意**: PermissionWrapper.tsx 主要是權限控制元件，不包含需要翻譯的使用者介面文字。所有前端頁面的 i18n 整合已完成！

## 更新範例

參考 `App.tsx` 的更新方式：

### Before (英文硬編碼)
```typescript
<h1>CaseFlow Enterprise</h1>
<p>Unified Activity Governance Platform</p>
```

### After (使用 i18n)
```typescript
const { t } = useI18n();

<h1>{t.branding.appName}</h1>
<p>{t.branding.appSubtitle}</p>
```

## 注意事項

1. **保持一致性**: 新增翻譯時，確保 zh-TW 和 en-US 兩個檔案都有對應的翻譯
2. **型別安全**: TranslationKeys 型別確保翻譯鍵值的正確性
3. **預設語言**: 繁體中文（zh-TW）為預設語言
4. **參數替換**: 使用 `translate()` 函數進行參數替換，格式：`{paramName}`
5. **狀態碼**: 後端 API 狀態值保持英文，不要修改資料結構

## 測試

啟動開發服務器並測試語言切換：

```bash
cd frontend
npm run dev
```

1. 登入系統
2. 點擊側邊欄底部的語言切換按鈕
3. 確認所有文字正確切換為目標語言
4. 檢查瀏覽器 localStorage 是否正確儲存語言偏好

## 問題排查

### 翻譯未顯示
- 確認已在元件中使用 `useI18n()` hook
- 確認翻譯鍵值在 `locales/zh-TW.ts` 和 `locales/en-US.ts` 中都存在
- 檢查控制台是否有錯誤訊息

### 參數替換失敗
- 確認使用 `translate('key', { param: value })` 而不是 `t.key`
- 檢查翻譯文字中的參數格式：`{paramName}`

### TypeScript 錯誤
- 確認新增的翻譯鍵值在兩個語言檔案中結構一致
- 執行 TypeScript 編譯檢查：`npm run build`
