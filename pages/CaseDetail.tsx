
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  History,
  Lock,
  Edit3,
  QrCode,
  Download,
  Plus,
  Search,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { PermissionWrapper } from '../components/PermissionWrapper';
import { CaseStatus, ActivityCase } from '../types';
import { CheckInModule } from './CheckInModule';

interface CaseDetailProps {
  activity: ActivityCase;
  onBack: () => void;
  onRemake: (base: ActivityCase) => void;
}

export const CaseDetail: React.FC<CaseDetailProps> = ({ activity, onBack, onRemake }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showScanner, setShowScanner] = useState(false);

  if (showScanner) return <CheckInModule onDismiss={() => setShowScanner(false)} />;

  const isRejected = activity.status === CaseStatus.REJECTED;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center space-x-2 text-slate-500 font-medium">
          <ArrowLeft size={20} />
          <span>Case Directory</span>
        </button>
        
        <div className="flex items-center space-x-3">
          {isRejected ? (
            <button 
              onClick={() => onRemake(activity)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md"
            >
              <RefreshCw size={16} />
              <span>Start New from this Record</span>
            </button>
          ) : (
            <PermissionWrapper action="activity:edit" resource={activity} fallback="disable">
              <button className="flex items-center space-x-2 bg-white border px-4 py-2 rounded-lg text-sm font-bold">
                <Edit3 size={16} />
                <span>Edit Record</span>
              </button>
            </PermissionWrapper>
          )}

          <PermissionWrapper action="activity:check-in" resource={activity} fallback="hide">
             <button onClick={() => setShowScanner(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center space-x-2">
              <QrCode size={16} />
              <span>QR Check-in</span>
            </button>
          </PermissionWrapper>
        </div>
      </div>

      {isRejected && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-start space-x-4">
          <div className="bg-rose-100 text-rose-600 p-2 rounded-lg"><XCircle size={24} /></div>
          <div>
            <h3 className="font-bold text-rose-900">Case Rejected - Read Only</h3>
            <p className="text-rose-700 text-sm mt-1">Reason: {activity.rejectionReason || 'Incomplete risk assessment documentation.'}</p>
            <p className="text-rose-600/60 text-xs mt-3 italic font-medium">Archive Reference ID: {activity.id}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-2">
            <span className="mono text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded tracking-widest">#{activity.id}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              activity.status === CaseStatus.REJECTED ? 'bg-rose-100 text-rose-700' :
              activity.status === CaseStatus.ONGOING ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}>{activity.status}</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{activity.title}</h1>
          <p className="text-slate-500 mt-2 max-w-2xl">{activity.description}</p>
        </div>

        <nav className="bg-slate-50 px-8 border-t border-slate-100 flex space-x-8 overflow-x-auto">
          {['overview', 'members', 'attendance', 'audit'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm font-bold border-b-2 transition-colors uppercase tracking-widest ${
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
              }`}
            >{tab}</button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 space-y-6">
              <h3 className="font-bold text-lg text-slate-900">Objective</h3>
              <p className="text-slate-600 leading-relaxed">This activity record is maintained in the corporate ledger. For ongoing activities, live attendance metrics will be visible in the Attendance tab.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Assessed Risk</div>
                  <div className={`font-bold ${activity.riskLevel === 'HIGH' ? 'text-rose-600' : 'text-slate-700'}`}>{activity.riskLevel}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Registration</div>
                  <div className="font-bold text-slate-700">{activity.members.length} Confirmed</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 uppercase">Documents</h3>
              <button className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                <div className="flex items-center space-x-2"><FileText size={16} className="text-blue-500" /><span className="text-xs font-bold">Activity_Manifest.pdf</span></div>
                <Download size={14} className="text-slate-400" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-3 before:w-0.5 before:bg-slate-100">
             {[
               { action: 'Audit Locked', user: 'System', date: '2024-05-18 15:00', details: 'Status set to REJECTED. Record sealed.' },
               { action: 'Decision: REJECTED', user: 'Alex Admin', date: '2024-05-18 14:32', details: 'Insufficient documentation for external guests.' },
               { action: 'Initial Submission', user: 'Jane User', date: '2024-05-17 16:50', details: 'Record created via Activity Wizard.' },
             ].map((log, i) => (
               <div key={i} className="relative pl-10">
                 <div className="absolute left-0 top-1 w-6 h-6 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                 </div>
                 <div className="text-sm font-bold text-slate-900">{log.action}</div>
                 <div className="text-[10px] text-slate-400 font-bold mb-1">{log.user} • {log.date}</div>
                 <div className="text-xs p-3 bg-slate-50 rounded border text-slate-500 italic">{log.details}</div>
               </div>
             ))}
          </div>
        )}

        {activeTab !== 'overview' && activeTab !== 'audit' && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <Lock size={48} className="opacity-20 mb-4" />
            <p className="font-medium">Information restricted for this case status.</p>
          </div>
        )}
      </div>
    </div>
  );
};
