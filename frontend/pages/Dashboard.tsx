
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { Role, CaseStatus, ActivityCase } from '../types';
import { PermissionWrapper } from '../components/PermissionWrapper';
import { activityService } from '../services/activityService';
import {
  FileCheck,
  Clock,
  AlertCircle,
  ArrowRight,
  PlusCircle,
  Calendar,
  ShieldCheck,
  UserCheck,
  Users
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: string) => void;
  onSelectCase: (activity: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onSelectCase }) => {
  const { user } = useAuth();
  const { t, translate } = useI18n();

  const role = user?.role ?? Role.USER;

  const statsByRole = {
    [Role.ADMIN]: [
      { label: t.dashboard.activeCases, count: 12, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: t.dashboard.pendingApprovals, count: 4, icon: FileCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: t.dashboard.systemAlerts, count: 0, icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50' },
    ],
    [Role.USER]: [
      { label: t.dashboard.activeCases, count: 3, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: t.dashboard.pendingApprovals, count: 1, icon: FileCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: t.dashboard.systemAlerts, count: 0, icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50' },
    ],
    [Role.GUEST]: [
      { label: t.attendance.totalCheckIns, count: 5, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
      { label: t.attendance.liveAttendance, count: 2, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: t.dashboard.systemAlerts, count: 0, icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50' },
    ]
  };
  const stats = statsByRole[role];

  const [recentActivities, setRecentActivities] = useState<ActivityCase[]>([]);
  const [activityError, setActivityError] = useState('');

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const { items } = await activityService.list({ page: 1, per_page: 5 });
        setRecentActivities(items);
      } catch (error: any) {
        setActivityError(error?.response?.data?.detail || 'Unable to load activities.');
      }
    };

    loadActivities();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{t.nav.workbench}</h1>
        <p className="text-slate-500 mt-1">{translate('dashboard.welcomeBack', { name: user?.name || '' })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <span className="text-2xl font-bold text-slate-900">{stat.count}</span>
            </div>
            <div className="mt-4 text-slate-500 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-lg text-slate-900">
              {role === Role.GUEST ? t.attendance.recentAccessLog : t.dashboard.recentActivities}
            </h2>
            <button
              onClick={() => onNavigate('activities')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              {t.common.viewAll} <ArrowRight size={16} className="ml-1" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {activityError && (
              <div className="p-4 text-sm text-rose-600">{activityError}</div>
            )}
            {!activityError && recentActivities.map(activity => (
              <div
                key={activity.id}
                onClick={() => onSelectCase(activity)}
                className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-slate-100 p-2 rounded text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{activity.title}</div>
                    <div className="text-xs text-slate-500">{t.dashboard.caseId}: {activity.caseNumber || activity.id} • {activity.createdAt.split('T')[0]}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    activity.status === CaseStatus.IN_PROGRESS ? 'bg-green-100 text-green-700' :
                    activity.status === CaseStatus.APPROVED ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {t.status[activity.status]}
                  </span>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {role !== Role.GUEST ? (
            <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">{t.dashboard.needNewActivity}</h3>
                <p className="text-slate-400 text-sm mb-6">{t.dashboard.needNewActivityDesc}</p>
                <PermissionWrapper action="activity:create" fallback="hide">
                  <button
                    onClick={() => onNavigate('create')}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold transition-all transform hover:scale-105"
                  >
                    <PlusCircle size={20} />
                    <span>{t.dashboard.initializeCase}</span>
                  </button>
                </PermissionWrapper>
              </div>
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <ShieldCheck size={120} />
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">{t.attendance.memberCheckIn}</h3>
                <p className="text-slate-400 text-sm mb-6">{t.attendance.scanVerification}</p>
                <button
                  onClick={() => onNavigate('activities')}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold transition-all transform hover:scale-105"
                >
                  <UserCheck size={20} />
                  <span>{t.activity.displayQR}</span>
                </button>
              </div>
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <ShieldCheck size={120} />
              </div>
            </div>
          )}

          {role === Role.ADMIN ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="text-amber-800 font-bold flex items-center space-x-2 mb-2">
                <AlertCircle size={18} />
                <span>{t.dashboard.pendingDecisions}</span>
              </h3>
              <p className="text-amber-700 text-sm">
                {t.dashboard.pendingDecisionsDesc}
              </p>
            </div>
          ) : role === Role.USER ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-blue-800 font-bold flex items-center space-x-2 mb-2">
                <ShieldCheck size={18} />
                <span>{t.dashboard.pendingApprovals}</span>
              </h3>
              <p className="text-blue-700 text-sm">
                {t.approval.governanceQueue}
              </p>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
              <h3 className="text-emerald-800 font-bold flex items-center space-x-2 mb-2">
                <UserCheck size={18} />
                <span>{t.attendance.visitorSignIn}</span>
              </h3>
              <p className="text-emerald-700 text-sm">
                {t.attendance.visitorSignInDesc}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
