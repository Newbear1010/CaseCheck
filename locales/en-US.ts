export const enUS = {
  // Common
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    submit: 'Submit',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    refresh: 'Refresh',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    viewAll: 'View All',
    viewDetails: 'View Details',
    createNew: 'Create New',
  },

  // Authentication
  auth: {
    signIn: 'Sign In',
    signOut: 'Sign Out',
    welcomeBack: 'Welcome Back',
    selectRole: 'Select Role to Sign In',
  },

  // Roles
  roles: {
    ADMIN: 'Administrator',
    USER: 'User',
    GUEST: 'Guest',
    policyAdministrator: 'Policy Administrator',
    employeePortal: 'Employee Portal',
    guestTerminal: 'Guest Terminal',
  },

  // Status
  status: {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    ONGOING: 'Ongoing',
    CLOSED: 'Closed',
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
  },

  // Risk Levels
  risk: {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
  },

  // Navigation
  nav: {
    dashboard: 'Dashboard',
    activities: 'Activities',
    newActivity: 'New Activity',
    approvalCenter: 'Approval Center',
    systemReports: 'System Reports',
    settings: 'Settings',
    signOut: 'Sign Out',
    workbench: 'Workbench',
    caseDirectory: 'Case Directory',
  },

  // Dashboard
  dashboard: {
    welcomeBack: 'Welcome back, {name}. Here\'s your overview for today.',
    activeCases: 'Active Cases',
    pendingApprovals: 'Pending Approvals',
    systemAlerts: 'System Alerts',
    recentActivities: 'Recent Activities',
    needNewActivity: 'Need a new activity?',
    needNewActivityDesc: 'Create a case and follow the step-by-step wizard to get approval and start tracking check-ins.',
    initializeCase: 'Initialize Case',
    pendingDecisions: 'Pending Decisions',
    pendingDecisionsDesc: 'You have 3 cases that were rejected or need additional risk documentation. Review your "Draft" and "Rejected" cases in the activity list.',
    caseId: 'Case ID',
  },

  // Activity Management
  activity: {
    title: 'Activity Title',
    description: 'Activity Description',
    createNew: 'Create New Activity',
    createNewCase: 'Create New Case',
    newCaseFromArchive: 'New Case from Archive',
    referencingRejectedCase: 'Referencing Rejected Case',
    status: 'Status',
    riskLevel: 'Risk Level',
    location: 'Location',
    startTime: 'Start Time',
    endTime: 'End Time',
    creator: 'Creator',
    members: 'Members',
    participants: 'Participants',
    attachments: 'Attachments',
    scopeAndPurpose: 'Scope & Purpose',
    scopePlaceholder: 'Describe the objectives and business impact...',
    titlePlaceholder: 'e.g., Annual Board Meeting 2024',
    viewDetails: 'View Details',
    editActivity: 'Edit Activity',
    deleteActivity: 'Delete Activity',
    submitForApproval: 'Submit for Approval',
    approve: 'Approve',
    reject: 'Reject',
    rejectReason: 'Rejection Reason',
    remakeFromRejected: 'Remake from Rejected',
    rejectionReason: 'Rejection Reason',
    centralizedManagement: 'Centralized activity management and audit trails',
  },

  // Activity Wizard
  wizard: {
    steps: {
      basicInfo: 'Basic Info',
      timeAndVenue: 'Time & Venue',
      riskAndPolicies: 'Risk & Policies',
      team: 'Team',
      attachments: 'Attachments',
    },
    activityDefinition: 'Activity Definition',
    caseTitle: 'Case Title',
    riskAssessment: 'Risk Assessment',
    runAiAnalysis: 'Gemini AI Analysis',
    policyVerification: 'Policy Verification...',
    analysisResult: 'Analysis Result',
    runAnalysisPrompt: 'Run AI Analysis to see policy compliance suggestions.',
    submitCase: 'Submit Case',
    nextStep: 'Next Step',
    standardFieldsPlaceholder: 'Standard enterprise fields for {step} go here.',
  },

  // Approval
  approval: {
    center: 'Approval Center',
    pendingApproval: 'Pending Approval',
    approveCase: 'Approve Case',
    rejectCase: 'Reject Case',
    approvalHistory: 'Approval History',
    approver: 'Approver',
    approvalDate: 'Approval Date',
    noPermission: 'You do not have permission to perform this action',
  },

  // Attendance & Check-in
  attendance: {
    checkIn: 'Check In',
    checkOut: 'Check Out',
    record: 'Attendance Record',
    report: 'Attendance Report',
    generateQRCode: 'Generate QR Code',
    scanQRCode: 'Scan QR Code',
    memberCheckIn: 'Member Check-in',
    visitorCheckIn: 'Visitor Check-in',
    attendanceStats: 'Attendance Statistics',
    totalAttendees: 'Total Attendees',
    checkInTime: 'Check-in Time',
    checkOutTime: 'Check-out Time',
  },

  // Admin & System
  admin: {
    system: 'System Administration',
    userManagement: 'User Management',
    roleManagement: 'Role Management',
    policyManagement: 'Policy Management',
    auditLog: 'Audit Log',
    systemSettings: 'System Settings',
    users: 'Users',
    roles: 'Roles',
    permissions: 'Permissions',
  },

  // Header
  header: {
    searchPlaceholder: 'Search Cases, IDs, Members...',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Settings',
  },

  // Messages & Notifications
  messages: {
    success: 'Operation Successful',
    error: 'Operation Failed',
    createSuccess: 'Created Successfully',
    updateSuccess: 'Updated Successfully',
    deleteSuccess: 'Deleted Successfully',
    submitSuccess: 'Submitted Successfully',
    approveSuccess: 'Approved Successfully',
    rejectSuccess: 'Rejected Successfully',
    confirmDelete: 'Are you sure you want to delete?',
    unsavedChanges: 'You have unsaved changes',
    networkError: 'Network Error',
    unauthorized: 'Unauthorized',
    forbidden: 'Forbidden',
    notFound: 'Resource Not Found',
  },

  // Branding
  branding: {
    appName: 'CaseFlow Enterprise',
    appSubtitle: 'Unified Activity Governance Platform',
    securedBy: 'Secured by Enterprise Auth Engine',
    caseFlow: 'CASE FLOW',
  },

  // Policies & Permissions
  policy: {
    policyDriven: 'Policy-Driven Authorization',
    separationOfDuties: 'Separation of Duties',
    riskCompliance: 'Risk Compliance',
    cannotApproveOwn: 'You cannot approve your own activity (Separation of Duties)',
    insufficientPermission: 'Insufficient Permission',
    policyViolation: 'Policy Violation',
    rejectedImmutable: 'Rejected cases are archived and cannot be modified. Please create a new case based on this record.',
  },

  // Date & Time
  dateTime: {
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    lastWeek: 'Last Week',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'MM/DD/YYYY HH:mm',
  },
};
