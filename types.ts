
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}

export enum CaseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ONGOING = 'ONGOING',
  CLOSED = 'CLOSED'
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
  parentId?: string;
  title: string;
  description: string;
  status: CaseStatus;
  rejectionReason?: string;
  creatorId: string;
  createdAt: string;
  startTime: string;
  endTime: string;
  location: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  members: string[]; // User IDs
}

export type PermissionAction = 
  | 'activity:view'
  | 'activity:edit'
  | 'activity:delete'
  | 'activity:approve'
  | 'activity:check-in'
  | 'activity:report'
  | 'admin:policy_manage'
  | 'admin:user_manage';
