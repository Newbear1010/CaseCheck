
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}

export enum CaseStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  requiredRole?: Role;
}

export interface AttendanceRecord {
  id: string;
  userId?: string;
  visitorName?: string;
  type: 'MEMBER' | 'VISITOR';
  timestamp: string;
  location: string;
}

export interface ActivityCase {
  id: string;
  caseNumber?: string;
  parentId?: string;
  title: string;
  description: string;
  status: CaseStatus;
  rejectionReason?: string;
  creatorId: string;
  activityTypeId?: string;
  createdAt: string;
  startTime: string;
  endTime: string;
  location: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  members: string[]; // User IDs
}

export type PermissionAction = 
  | 'activity:create'
  | 'activity:view'
  | 'activity:edit'
  | 'activity:delete'
  | 'activity:approve'
  | 'activity:qr-display'
  | 'activity:check-in'
  | 'activity:report'
  | 'admin:policy_manage'
  | 'admin:user_manage';
