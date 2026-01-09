
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Role, CaseStatus, ActivityCase } from '../types';
import { 
  FileCheck, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  PlusCircle,
  Calendar,
  ShieldCheck
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: string) => void;
  onSelectCase: (activity: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onSelectCase }) => {
  const { user } = useAuth();
  
  const stats = [
    { label: 'Active Cases', count: 12, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Approvals', count: 4, icon: FileCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'System Alerts', count: 0, icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  // Mock data for dashboard
  const recentActivities = [
    { 
      id: 'C-9021', 
      title: 'Q3 Product Launch Event', 
      status: CaseStatus.ONGOING, 
      date: '2024-05-20',
      description: 'Global launch event for the new enterprise suite involving 200+ partners.',
      creatorId: 'user-1',
      riskLevel: 'MEDIUM',
      members: ['user-1', 'user-2', 'user-3'],
      location: 'Main Auditorium'
    },
    { 
      id: 'C-9018', 
      title: 'Internal Audit Seminar', 
      status: CaseStatus.APPROVED, 
      date: '2024-05-18',
      description: 'Annual regulatory compliance check and training.',
      creatorId: 'user-1',
      riskLevel: 'LOW',
      members: ['user-4'],
      location: 'Conference Room A'
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Workbench</h1>
        <p className="text-slate-500 mt-1">Welcome back, {user?.name}. Here's your overview for today.</p>
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
            <h2 className="font-bold text-lg text-slate-900">Recent Activities</h2>
            <button 
              onClick={() => onNavigate('activities')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              View All <ArrowRight size={16} className="ml-1" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentActivities.map(activity => (
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
                    <div className="text-xs text-slate-500">Case ID: {activity.id} • {activity.date}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    activity.status === CaseStatus.ONGOING ? 'bg-green-100 text-green-700' :
                    activity.status === CaseStatus.APPROVED ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {activity.status}
                  </span>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Need a new activity?</h3>
              <p className="text-slate-400 text-sm mb-6">Create a case and follow the step-by-step wizard to get approval and start tracking check-ins.</p>
              <button 
                onClick={() => onNavigate('create')}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold transition-all transform hover:scale-105"
              >
                <PlusCircle size={20} />
                <span>Initialize Case</span>
              </button>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldCheck size={120} />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h3 className="text-amber-800 font-bold flex items-center space-x-2 mb-2">
              <AlertCircle size={18} />
              <span>Pending Decisions</span>
            </h3>
            <p className="text-amber-700 text-sm">
              You have 3 cases that were rejected or need additional risk documentation. 
              Review your "Draft" and "Rejected" cases in the activity list.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
