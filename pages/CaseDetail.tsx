
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  FileText,
  History,
  Lock,
  Edit3,
  QrCode,
  Download
} from 'lucide-react';
import { PermissionWrapper } from '../components/PermissionWrapper';
import { CaseStatus, ActivityCase } from '../types';

export const CaseDetail: React.FC<{ activity: ActivityCase, onBack: () => void }> = ({ activity, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: CheckCircle },
    { id: 'reports', label: 'Reports', icon: Edit3 },
    { id: 'approvals', label: 'Approvals', icon: Lock },
    { id: 'audit', label: 'Audit Log', icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 font-medium w-fit"
        >
          <ArrowLeft size={20} />
          <span>Back to List</span>
        </button>
        <div className="flex items-center space-x-3">
          <PermissionWrapper action="activity:edit" resource={activity} fallback="disable">
            <button className="flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50">
              <Edit3 size={16} />
              <span>Edit Case</span>
            </button>
          </PermissionWrapper>

          <PermissionWrapper action="activity:approve" resource={activity} fallback="hide">
            <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 shadow-sm">
              <CheckCircle size={16} />
              <span>Quick Approve</span>
            </button>
          </PermissionWrapper>
          
          <PermissionWrapper action="activity:check-in" resource={activity}>
             <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">
              <QrCode size={16} />
              <span>Launch Check-in</span>
            </button>
          </PermissionWrapper>
        </div>
      </div>

      {/* Case Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <span className="mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">CASE ID: {activity.id}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  activity.status === CaseStatus.ONGOING ? 'bg-green-100 text-green-700' :
                  activity.status === CaseStatus.SUBMITTED ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {activity.status}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900">{activity.title}</h1>
              <p className="text-slate-500 mt-2 max-w-2xl">{activity.description}</p>
            </div>
            <div className="hidden lg:block">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 min-w-[200px]">
                <div className="text-xs text-slate-400 font-bold uppercase mb-3">Lifecycle Progress</div>
                <div className="space-y-4">
                  {[CaseStatus.DRAFT, CaseStatus.SUBMITTED, CaseStatus.APPROVED, CaseStatus.ONGOING].map((status, idx) => (
                    <div key={status} className="flex items-center space-x-3">
                       <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                         activity.status === status ? 'bg-blue-600 ring-4 ring-blue-100' : 
                         idx < [CaseStatus.DRAFT, CaseStatus.SUBMITTED, CaseStatus.APPROVED, CaseStatus.ONGOING].indexOf(activity.status) ? 'bg-green-500' : 'bg-slate-200'
                       }`}>
                         {idx < [CaseStatus.DRAFT, CaseStatus.SUBMITTED, CaseStatus.APPROVED, CaseStatus.ONGOING].indexOf(activity.status) && <CheckCircle size={10} className="text-white" />}
                       </div>
                       <span className={`text-[10px] font-bold uppercase ${activity.status === status ? 'text-slate-900' : 'text-slate-400'}`}>
                         {status}
                       </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-slate-100">
            <div className="flex items-center space-x-3">
              <Clock className="text-slate-400" size={20} />
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Timing</div>
                <div className="text-sm font-semibold text-slate-700">May 20, 09:00 - 17:00</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="text-slate-400" size={20} />
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Venue</div>
                <div className="text-sm font-semibold text-slate-700">Conference Room B</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <AlertTriangle className={activity.riskLevel === 'HIGH' ? 'text-red-500' : 'text-slate-400'} size={20} />
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Risk Rating</div>
                <div className={`text-sm font-bold ${activity.riskLevel === 'HIGH' ? 'text-red-600' : 'text-slate-700'}`}>{activity.riskLevel}</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Users className="text-slate-400" size={20} />
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Attendees</div>
                <div className="text-sm font-semibold text-slate-700">{activity.members.length} Registered</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Tabs Navigation */}
        <div className="bg-slate-50 px-8 border-t border-slate-100 flex items-center space-x-8 overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 border-b-2 transition-all font-bold text-sm shrink-0
                  ${isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}
                `}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 min-h-[300px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h3 className="font-bold text-lg text-slate-900">Case Summary</h3>
              <p className="text-slate-600 leading-relaxed">
                This case represents a high-profile product launch targeting external partners and press. 
                Due to the involvement of non-disclosure materials, the "Data Privacy Policy" has been automatically 
                attached to this workflow. Approval from both Marketing and Legal departments is required.
              </p>
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">Action Items</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 border border-green-100">
                    <CheckCircle size={18} className="text-green-600" />
                    <span className="text-sm text-green-800">Risk Assessment Complete</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-100 opacity-60">
                    <Clock size={18} className="text-slate-400" />
                    <span className="text-sm text-slate-600">Pending Attendance Verification</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="font-bold text-lg text-slate-900">Attachments</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FileText size={20} className="text-blue-500" />
                    <span className="text-xs font-semibold">Event_Plan_V2.pdf</span>
                  </div>
                  <Download size={14} className="text-slate-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FileText size={20} className="text-red-500" />
                    <span className="text-xs font-semibold">Risk_Mitigation.docx</span>
                  </div>
                  <Download size={14} className="text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Full Audit Trail</h3>
            <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-3 before:w-0.5 before:bg-slate-100">
               {[
                 { action: 'Case Approved', user: 'Alex Admin', date: '2024-05-18 14:32', details: 'Manual policy override for high-priority launch.' },
                 { action: 'Risk Assessed', user: 'Policy Engine', date: '2024-05-18 10:15', details: 'Risk score calculated: 72/100 (MEDIUM)' },
                 { action: 'Case Submitted', user: 'Jane User', date: '2024-05-17 16:50', details: 'Workflow initialized.' },
               ].map((log, idx) => (
                 <div key={idx} className="relative pl-10">
                   <div className="absolute left-0 top-1 w-6 h-6 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center">
                     <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                   </div>
                   <div>
                     <div className="text-sm font-bold text-slate-900">{log.action}</div>
                     <div className="text-xs text-slate-500 mb-1">{log.user} • {log.date}</div>
                     <div className="text-xs p-2 bg-slate-50 border border-slate-100 rounded italic text-slate-500">{log.details}</div>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeTab !== 'overview' && activeTab !== 'audit' && (
           <div className="flex flex-col items-center justify-center py-20 text-slate-400">
             <Lock size={48} className="mb-4 opacity-20" />
             <p className="font-medium">Tab content restricted or pending implementation.</p>
           </div>
        )}
      </div>
    </div>
  );
};

const MapPin = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);
