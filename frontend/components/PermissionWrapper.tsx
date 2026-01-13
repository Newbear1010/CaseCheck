
import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkPolicy } from '../services/policyEngine';
import { PermissionAction, ActivityCase } from '../types';

interface PermissionWrapperProps {
  action: PermissionAction;
  resource?: ActivityCase;
  children: ReactNode;
  fallback?: 'hide' | 'disable';
  explanationPosition?: 'top' | 'bottom';
}

export const PermissionWrapper: React.FC<PermissionWrapperProps> = ({ 
  action, 
  resource, 
  children, 
  fallback = 'disable',
  explanationPosition = 'top'
}) => {
  const { user } = useAuth();
  
  if (!user) return null;

  const decision = checkPolicy(user.role, user.id, action, resource);

  if (decision.allowed) {
    return <>{children}</>;
  }

  if (fallback === 'hide') {
    return null;
  }

  // Fallback: Disable
  return (
    <div className="relative group inline-block w-full sm:w-auto">
      <div className="opacity-50 pointer-events-none grayscale">
        {children}
      </div>
      <div className={`
        absolute z-50 invisible group-hover:visible w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg
        transition-opacity duration-200
        ${explanationPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
        left-1/2 -translate-x-1/2
      `}>
        <div className="font-bold text-red-400 mb-1">Access Restricted</div>
        {decision.reason || 'You do not have permission to perform this action.'}
        {decision.requiredRole && (
          <div className="mt-1 pt-1 border-t border-slate-700 italic text-[10px]">
            Requires Role: {decision.requiredRole}
          </div>
        )}
      </div>
    </div>
  );
};
