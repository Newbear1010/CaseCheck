
import { Role, CaseStatus, ActivityCase, PermissionAction, PolicyDecision } from '../types';

/**
 * Enterprise Policy Engine (Mock)
 * In a real system, this might call an OPA (Open Policy Agent) server or a central IAM service.
 */
export const checkPolicy = (
  userRole: Role,
  userId: string,
  action: PermissionAction,
  resource?: ActivityCase
): PolicyDecision => {
  // 1. Admin bypass for most things
  if (userRole === Role.ADMIN) {
    return { allowed: true };
  }

  // 2. Guest limitations
  if (userRole === Role.GUEST) {
    if (action === 'activity:view' && resource?.status !== CaseStatus.DRAFT) {
      return { allowed: true };
    }
    if (action === 'activity:check-in' && resource?.status === CaseStatus.ONGOING) {
        return { allowed: true };
    }
    return { 
      allowed: false, 
      reason: 'Guests have restricted access. Contact the activity owner for permission.' 
    };
  }

  // 3. User Specific Logic (RBAC + Case Ownership)
  const isOwner = resource?.creatorId === userId;
  const isOngoing = resource?.status === CaseStatus.ONGOING;
  const isApproved = resource?.status === CaseStatus.APPROVED;
  const isClosed = resource?.status === CaseStatus.CLOSED;

  switch (action) {
    case 'activity:view':
      return { allowed: true }; // Everyone can view cases in this system (discovery)
    
    case 'activity:edit':
      if (isOwner && (resource?.status === CaseStatus.DRAFT || resource?.status === CaseStatus.REJECTED)) {
        return { allowed: true };
      }
      return { 
        allowed: false, 
        reason: isOwner 
          ? `Cannot edit while in ${resource?.status} status. Request an unlock if needed.` 
          : 'Only the activity owner can edit this case.' 
      };

    case 'activity:delete':
      if (isOwner && resource?.status === CaseStatus.DRAFT) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Deletion only allowed for own drafts.' };

    case 'activity:approve':
      return { allowed: false, reason: 'Approval requires Administrator privileges.', requiredRole: Role.ADMIN };

    case 'activity:check-in':
      if (isOngoing || isApproved) return { allowed: true };
      return { allowed: false, reason: 'Check-in is only available for ongoing or approved activities.' };

    case 'activity:report':
      if (isClosed || isOngoing) return { allowed: true };
      return { allowed: false, reason: 'Reporting is available once activity starts.' };

    default:
      return { allowed: false, reason: 'Undefined policy for this action.' };
  }
};
