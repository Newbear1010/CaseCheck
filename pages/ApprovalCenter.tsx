
import React, { useState } from 'react';
import { ActivityCase, CaseStatus } from '../types';
import { CheckCircle, XCircle, Eye, AlertCircle, Clock, ChevronRight } from 'lucide-react';

interface ApprovalCenterProps {
  onViewCase: (activity: ActivityCase) => void;
}

const MOCK_SUBMISSIONS: ActivityCase[] = [
  {
    id: 'C-9501',
    title: 'Strategic Planning Offsite',
    description: 'Executive retreat for 2025 roadmap planning.',
    status: CaseStatus.SUBMITTED,
    creatorId: 'user-2',
    createdAt: '2024-05-21',
    startTime: '2024-06-10T09:00:00',
    endTime: '2024-06-12T17:00:00',
    location: 'Mountain Resort',
    riskLevel: 'MEDIUM',
    members: ['user-1', 'user-2']
  }
];

export const ApprovalCenter: React.FC<ApprovalCenterProps> = ({ onViewCase }) => {
  const [submissions, setSubmissions] = useState(MOCK_SUBMISSIONS);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Approval Center</h1>
          <p className="text-slate-500 text-sm">Governance queue for pending activity requests.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 flex items-center space-x-2">
          <Clock size={14} />
          <span>{submissions.length} Pending Review</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {submissions.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-100 rounded-2xl p-20 text-center text-slate-400">
             <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
             <p className="font-medium">The queue is empty. All cases have been processed.</p>
          </div>
        ) : (
          submissions.map(caseItem => (
            <div key={caseItem.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="mono text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border">ID: {caseItem.id}</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{caseItem.status}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{caseItem.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-1">{caseItem.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-slate-400 font-medium pt-2">
                    <span className="flex items-center space-x-1"><Clock size={14} /> <span>Submitted 2h ago</span></span>
                    <span className="flex items-center space-x-1"><AlertCircle size={14} /> <span>Risk: {caseItem.riskLevel}</span></span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => onViewCase(caseItem)}
                    className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                    title="Detailed Review"
                  >
                    <Eye size={20} />
                  </button>
                  <button className="flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-100 transition-colors">
                    <CheckCircle size={18} />
                    <span>Approve</span>
                  </button>
                  <button className="flex items-center space-x-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-rose-100 transition-colors">
                    <XCircle size={18} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
