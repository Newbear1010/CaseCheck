export const zhTW = {
  // Common
  common: {
    loading: '載入中...',
    save: '儲存',
    cancel: '取消',
    confirm: '確認',
    delete: '刪除',
    edit: '編輯',
    submit: '提交',
    search: '搜尋',
    filter: '篩選',
    export: '匯出',
    import: '匯入',
    refresh: '重新整理',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    close: '關閉',
    viewAll: '檢視全部',
    viewDetails: '檢視詳情',
    createNew: '新增',
  },

  // Authentication
  auth: {
    signIn: '登入',
    signOut: '登出',
    welcomeBack: '歡迎回來',
    selectRole: '選擇角色登入',
  },

  // Roles
  roles: {
    ADMIN: '系統管理員',
    USER: '一般使用者',
    GUEST: '訪客',
    policyAdministrator: '政策管理員',
    employeePortal: '員工入口',
    guestTerminal: '訪客終端',
  },

  // Status
  status: {
    DRAFT: '草稿',
    SUBMITTED: '已提交',
    APPROVED: '已核准',
    REJECTED: '已拒絕',
    ONGOING: '進行中',
    CLOSED: '已結束',
    ACTIVE: '啟用',
    INACTIVE: '停用',
  },

  // Risk Levels
  risk: {
    LOW: '低風險',
    MEDIUM: '中風險',
    HIGH: '高風險',
  },

  // Navigation
  nav: {
    dashboard: '儀表板',
    activities: '活動列表',
    newActivity: '新增活動',
    approvalCenter: '審批中心',
    systemReports: '系統報表',
    settings: '設定',
    signOut: '登出',
    workbench: '工作台',
    caseDirectory: '案件目錄',
  },

  // Dashboard
  dashboard: {
    welcomeBack: '歡迎回來，{name}。以下是今日概覽。',
    activeCases: '進行中案件',
    pendingApprovals: '待審批',
    systemAlerts: '系統提醒',
    recentActivities: '最近活動',
    needNewActivity: '需要建立新活動嗎？',
    needNewActivityDesc: '建立案件並遵循精靈步驟來獲得核准並開始追蹤簽到。',
    initializeCase: '建立案件',
    pendingDecisions: '待處理決策',
    pendingDecisionsDesc: '您有 3 個被拒絕或需要額外風險文件的案件。請檢視活動列表中的「草稿」和「已拒絕」案件。',
    caseId: '案件編號',
  },

  // Activity Management
  activity: {
    title: '活動標題',
    description: '活動描述',
    createNew: '建立新活動',
    createNewCase: '建立新案件',
    newCaseFromArchive: '從已拒絕案件重建',
    referencingRejectedCase: '參考已拒絕案件',
    status: '狀態',
    riskLevel: '風險等級',
    location: '地點',
    startTime: '開始時間',
    endTime: '結束時間',
    creator: '建立者',
    members: '成員',
    participants: '參與者',
    attachments: '附件',
    scopeAndPurpose: '範圍與目的',
    scopePlaceholder: '描述目標和業務影響...',
    titlePlaceholder: '例如：2024年度董事會會議',
    viewDetails: '檢視詳情',
    editActivity: '編輯活動',
    deleteActivity: '刪除活動',
    submitForApproval: '提交審批',
    approve: '核准',
    reject: '拒絕',
    rejectReason: '拒絕原因',
    remakeFromRejected: '基於此案件重建',
    rejectionReason: '拒絕原因',
    centralizedManagement: '集中式活動管理與稽核追蹤',
  },

  // Activity Wizard
  wizard: {
    steps: {
      basicInfo: '基本資訊',
      timeAndVenue: '時間與地點',
      riskAndPolicies: '風險與政策',
      team: '團隊',
      attachments: '附件',
    },
    activityDefinition: '活動定義',
    caseTitle: '案件標題',
    riskAssessment: '風險評估',
    runAiAnalysis: 'Gemini AI 分析',
    policyVerification: '政策驗證中...',
    analysisResult: '分析結果',
    runAnalysisPrompt: '執行 AI 分析以查看政策合規建議。',
    submitCase: '提交案件',
    nextStep: '下一步',
    standardFieldsPlaceholder: '{step} 的企業標準欄位將在此處顯示。',
  },

  // Approval
  approval: {
    center: '審批中心',
    pendingApproval: '待審批',
    approveCase: '核准案件',
    rejectCase: '拒絕案件',
    approvalHistory: '審批歷史',
    approver: '審批人',
    approvalDate: '審批日期',
    noPermission: '您沒有權限執行此操作',
  },

  // Attendance & Check-in
  attendance: {
    checkIn: '簽到',
    checkOut: '簽退',
    record: '出席記錄',
    report: '出席報表',
    generateQRCode: '生成 QR Code',
    scanQRCode: '掃描 QR Code',
    memberCheckIn: '成員簽到',
    visitorCheckIn: '訪客簽到',
    attendanceStats: '出席統計',
    totalAttendees: '總出席人數',
    checkInTime: '簽到時間',
    checkOutTime: '簽退時間',
  },

  // Admin & System
  admin: {
    system: '系統管理',
    userManagement: '使用者管理',
    roleManagement: '角色管理',
    policyManagement: '政策管理',
    auditLog: '稽核日誌',
    systemSettings: '系統設定',
    users: '使用者',
    roles: '角色',
    permissions: '權限',
  },

  // Header
  header: {
    searchPlaceholder: '搜尋案件、編號、成員...',
    notifications: '通知',
    profile: '個人資料',
    settings: '設定',
  },

  // Messages & Notifications
  messages: {
    success: '操作成功',
    error: '操作失敗',
    createSuccess: '建立成功',
    updateSuccess: '更新成功',
    deleteSuccess: '刪除成功',
    submitSuccess: '提交成功',
    approveSuccess: '核准成功',
    rejectSuccess: '拒絕成功',
    confirmDelete: '確定要刪除嗎？',
    unsavedChanges: '有未儲存的變更',
    networkError: '網路錯誤',
    unauthorized: '未授權',
    forbidden: '無權限',
    notFound: '找不到資源',
  },

  // Branding
  branding: {
    appName: 'CaseFlow Enterprise',
    appSubtitle: '統一活動治理平台',
    securedBy: '由企業認證引擎保護',
    caseFlow: 'CASE FLOW',
  },

  // Policies & Permissions
  policy: {
    policyDriven: '政策驅動授權',
    separationOfDuties: '職責分離',
    riskCompliance: '風險合規',
    cannotApproveOwn: '您無法核准自己建立的活動（職責分離原則）',
    insufficientPermission: '權限不足',
    policyViolation: '政策違規',
    rejectedImmutable: '已拒絕的案件無法修改。請基於此記錄建立新案件。',
  },

  // Date & Time
  dateTime: {
    today: '今天',
    yesterday: '昨天',
    tomorrow: '明天',
    thisWeek: '本週',
    lastWeek: '上週',
    thisMonth: '本月',
    lastMonth: '上月',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'YYYY/MM/DD HH:mm',
  },
};

export type TranslationKeys = typeof zhTW;
