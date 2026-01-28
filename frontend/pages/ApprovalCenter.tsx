
import React, { useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { ActivityCase, CaseStatus } from '../types';
import { CheckCircle, XCircle, Eye, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { activityService } from '../services/activityService';
import { approvalService } from '../services/approvalService';

interface ApprovalCenterProps {
  onViewCase: (activity: ActivityCase) => void;
}

export const ApprovalCenter: React.FC<ApprovalCenterProps> = ({ onViewCase }) => {
  const { t } = useI18n();
  const [submissions, setSubmissions] = useState<ActivityCase[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadSubmissions = async () => {
    setError('');
    setIsLoading(true);
    try {
      const { items } = await activityService.list({ status: CaseStatus.PENDING_APPROVAL, page: 1, per_page: 20 });
      setSubmissions(items);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Unable to load approvals.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const handleApprove = async (activityId: string) => {
    try {
      await approvalService.approve(activityId);
      await loadSubmissions();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Approval failed.');
    }
  };

  const handleReject = async (activityId: string) => {
    const reason = window.prompt(t.activity.rejectReason || 'Rejection reason:');
    if (!reason) {
      return;
    }
    try {
      await approvalService.reject(activityId, reason);
      await loadSubmissions();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Rejection failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.approval.approvalCenter}</h1>
          <p className="text-slate-500 text-sm">{t.approval.governanceQueue}</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 flex items-center space-x-2">
          <Clock size={14} />
          <span>{submissions.length} {t.approval.pendingReview}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500">{t.common.loading}</div>
        )}
        {!isLoading && error && (
          <div className="bg-white border border-rose-200 rounded-xl p-6 text-rose-600">{error}</div>
        )}
        {!isLoading && !error && submissions.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-100 rounded-2xl p-20 text-center text-slate-400">
             <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
             <p className="font-medium">{t.approval.queueEmpty}</p>
          </div>
        ) : (
          submissions.map(caseItem => (
            <div key={caseItem.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="mono text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border">ID: {caseItem.caseNumber || caseItem.id}</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{t.status[caseItem.status]}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{caseItem.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-1">{caseItem.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-slate-400 font-medium pt-2">
                    <span className="flex items-center space-x-1"><Clock size={14} /> <span>{t.approval.submittedAgo.replace('{time}', '2h')}</span></span>
                    <span className="flex items-center space-x-1"><AlertCircle size={14} /> <span>{t.approval.risk}: {t.risk[caseItem.riskLevel]}</span></span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onViewCase(caseItem)}
                    className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                    title={t.approval.detailedReview}
                  >
                    <Eye size={20} />
                  </button>
                  <button
                    onClick={() => handleApprove(caseItem.id)}
                    className="flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle size={18} />
                    <span>{t.activity.approve}</span>
                  </button>
                  <button
                    onClick={() => handleReject(caseItem.id)}
                    className="flex items-center space-x-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-rose-100 transition-colors"
                  >
                    <XCircle size={18} />
                    <span>{t.activity.reject}</span>
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
