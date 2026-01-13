
import { Role, CaseStatus, ActivityCase, PermissionAction, PolicyDecision } from '../types';

export const checkPolicy = (
  userRole: Role,
  userId: string,
  action: PermissionAction,
  resource?: ActivityCase
): PolicyDecision => {
  if (userRole === Role.ADMIN) {
    return { allowed: true };
  }

  const isOwner = resource?.creatorId === userId;
  const isRejected = resource?.status === CaseStatus.REJECTED;

  // Global rule: REJECTED cases are immutable
  if (isRejected && action === 'activity:edit') {
    return { 
      allowed: false, 
      reason: 'Rejected cases are archived for audit purposes and cannot be modified. Please create a new case based on this record.' 
    };
  }

  if (userRole === Role.GUEST) {
    if (action === 'activity:view' && resource?.status !== CaseStatus.DRAFT) return { allowed: true };
    if (action === 'activity:check-in' && resource?.status === CaseStatus.ONGOING) return { allowed: true };
    return { allowed: false, reason: 'Guests have restricted access.' };
  }

  switch (action) {
    case 'activity:view': return { allowed: true };
    case 'activity:edit':
      if (isOwner && (resource?.status === CaseStatus.DRAFT || resource?.status === CaseStatus.REJECTED)) {
        // This will now be caught by the isRejected check above if status is REJECTED
        return { allowed: true };
      }
      return { allowed: false, reason: 'Only drafts or specific owner-owned resources can be edited.' };
    case 'activity:check-in':
      return { allowed: resource?.status === CaseStatus.ONGOING || resource?.status === CaseStatus.APPROVED };
    default:
      return { allowed: false, reason: 'Policy undefined for this context.' };
  }
};
