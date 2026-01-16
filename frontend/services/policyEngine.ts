
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
  const isManager = resource?.members?.includes(userId);
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
    if (action === 'activity:check-in' && resource?.status === CaseStatus.IN_PROGRESS) return { allowed: true };
    return { allowed: false, reason: 'Guests have restricted access.' };
  }

  switch (action) {
    case 'activity:view': return { allowed: true };
    case 'activity:create': return { allowed: true };
    case 'activity:approve':
      return { allowed: false, reason: 'Only administrators can approve activities.', requiredRole: Role.ADMIN };
    case 'activity:qr-display':
      if ((isOwner || isManager) && resource?.status === CaseStatus.IN_PROGRESS) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Only the creator, assigned managers, or administrators can display the QR code.' };
    case 'activity:edit':
      if ((isOwner || isManager) && (resource?.status === CaseStatus.DRAFT || resource?.status === CaseStatus.REJECTED)) {
        // This will now be caught by the isRejected check above if status is REJECTED
        return { allowed: true };
      }
      return { allowed: false, reason: 'Only drafts or specific owner-owned resources can be edited.' };
    case 'activity:check-in':
      return { allowed: resource?.status === CaseStatus.IN_PROGRESS || resource?.status === CaseStatus.APPROVED };
    default:
      return { allowed: false, reason: 'Policy undefined for this context.' };
  }
};
