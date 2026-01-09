
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
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  requiredRole?: Role;
}

export interface Visitor {
  id: string;
  name: string;
  company: string;
  checkInTime: string;
}

export interface ActivityCase {
  id: string;
  parentId?: string; // Links to a rejected case if this is a re-submission
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
