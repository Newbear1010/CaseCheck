
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Users,
  Clock,
  AlertTriangle,
  FileText,
  Edit3,
  QrCode,
  Download,
  Plus,
  Search,
  RefreshCw,
  XCircle,
  Maximize2,
  MapPin
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { PermissionWrapper } from '../components/PermissionWrapper';
import { CaseStatus, ActivityCase } from '../types';
import { CheckInModule } from './CheckInModule';
import { attendanceService, AttendanceRecord, AttendanceStats, QRCodeResponse } from '../services/attendanceService';

interface CaseDetailProps {
  activity: ActivityCase;
  onBack: () => void;
  onRemake: (base: ActivityCase) => void;
}

const QRDisplayModal: React.FC<{ activity: ActivityCase, onClose: () => void }> = ({ activity, onClose }) => {
  const { t } = useI18n();
  const [qrCode, setQrCode] = useState<QRCodeResponse | null>(null);
  const [qrError, setQrError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    const generateQr = async () => {
      try {
        const now = new Date();
        const validFrom = now.toISOString();
        const validUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
        const result = await attendanceService.generateQR(activity.id, 'CHECK_IN', validFrom, validUntil);
        if (isActive) {
          setQrCode(result);
        }
      } catch (error: any) {
        if (isActive) {
          setQrError(error?.response?.data?.message || t.attendance.qrGenerationFailed);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };
    generateQr();
    return () => {
      isActive = false;
    };
  }, [activity.id, t.attendance.qrGenerationFailed]);

  return (
  <div className="fixed inset-0 z-[110] bg-slate-950/90 flex items-center justify-center p-6 backdrop-blur-sm">
    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center border-b pb-4">
        <div className="text-left">
          <h3 className="font-bold text-slate-900">{t.activity.checkInQR}</h3>
          <p className="text-xs text-slate-500">{t.activity.scanForActivityId}: {activity.id}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
      </div>

      <div className="bg-slate-50 aspect-square rounded-2xl flex items-center justify-center border-2 border-slate-100 relative group">
        {/* Mocking a high-fidelity QR Code with CSS and SVG */}
        <div className="w-48 h-48 bg-white p-4 rounded-xl shadow-inner border border-slate-200 grid grid-cols-4 grid-rows-4 gap-1">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className={`${Math.random() > 0.4 ? 'bg-slate-900' : 'bg-transparent'} rounded-sm`}></div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white p-2 rounded-lg shadow-md border border-slate-100">
              <QrCode size={32} className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{activity.title}</h4>
        <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
          <MapPin size={12} />
          <span>{activity.location}</span>
        </div>
        {isLoading && <div className="text-xs text-slate-400">{t.attendance.generatingQr}</div>}
        {qrError && <div className="text-xs text-rose-500">{qrError}</div>}
        {qrCode && (
          <div className="bg-slate-100 text-slate-700 text-[10px] font-mono px-3 py-2 rounded-lg break-all border border-slate-200">
            {qrCode.code}
          </div>
        )}
      </div>

      <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-slate-800 transition-colors">
        <Download size={18} />
        <span>{t.activity.saveAsImage}</span>
      </button>
    </div>
  </div>
  );
};

export const CaseDetail: React.FC<CaseDetailProps> = ({ activity, onBack, onRemake }) => {
  const { t, translate } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');
  const [showScanner, setShowScanner] = useState(false);
  const [showQRDisplay, setShowQRDisplay] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceError, setAttendanceError] = useState('');
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState('');

  useEffect(() => {
    if (activeTab !== 'attendance') return;
    let isActive = true;
    const loadAttendance = async () => {
      setAttendanceLoading(true);
      setAttendanceError('');
      try {
        const [stats, records] = await Promise.all([
          attendanceService.getStats(activity.id),
          attendanceService.getRecords(activity.id),
        ]);
        if (isActive) {
          setAttendanceStats(stats);
          setAttendanceRecords(records);
        }
      } catch (error: any) {
        if (isActive) {
          setAttendanceError(error?.response?.data?.message || t.attendance.loadAttendanceFailed);
        }
      } finally {
        if (isActive) {
          setAttendanceLoading(false);
        }
      }
    };
    loadAttendance();
    return () => {
      isActive = false;
    };
  }, [activeTab, activity.id, t.attendance.loadAttendanceFailed]);

  if (showScanner) return <CheckInModule activityId={activity.id} onDismiss={() => setShowScanner(false)} />;

  const isRejected = activity.status === CaseStatus.REJECTED;
  const isOngoing = activity.status === CaseStatus.IN_PROGRESS;
  const displayId = activity.caseNumber || activity.id;
  const filteredAttendanceRecords = attendanceRecords.filter(record =>
    record.user_id.toLowerCase().includes(attendanceSearch.toLowerCase())
  );

  const attendanceStatusStyles: Record<string, string> = {
    REGISTERED: 'bg-amber-50 text-amber-700',
    CHECKED_IN: 'bg-green-50 text-green-700',
    CHECKED_OUT: 'bg-slate-100 text-slate-600',
    ABSENT: 'bg-rose-50 text-rose-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="space-y-6">
      {showQRDisplay && <QRDisplayModal activity={activity} onClose={() => setShowQRDisplay(false)} />}

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center space-x-2 text-slate-500 font-medium hover:text-slate-700 transition-colors">
          <ArrowLeft size={20} />
          <span>{t.activity.caseDirectory}</span>
        </button>

        <div className="flex items-center space-x-3">
          {isRejected ? (
            <button
              onClick={() => onRemake(activity)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-all"
            >
              <RefreshCw size={16} />
              <span>{t.activity.startNewFromRecord}</span>
            </button>
          ) : (
            <>
              <PermissionWrapper action="activity:edit" resource={activity} fallback="disable">
                <button className="flex items-center space-x-2 bg-white border px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
                  <Edit3 size={16} />
                  <span>{t.activity.editRecord}</span>
                </button>
              </PermissionWrapper>

              {isOngoing && (
                <PermissionWrapper action="activity:qr-display" resource={activity} fallback="hide">
                  <button
                    onClick={() => setShowQRDisplay(true)}
                    className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 shadow-md transition-all"
                  >
                    <QrCode size={16} />
                    <span>{t.activity.displayQR}</span>
                  </button>
                </PermissionWrapper>
              )}
            </>
          )}

          <PermissionWrapper action="activity:check-in" resource={activity} fallback="hide">
             <button onClick={() => setShowScanner(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center space-x-2 hover:bg-blue-700">
              <Maximize2 size={16} />
              <span>{t.activity.openScanner}</span>
            </button>
          </PermissionWrapper>
        </div>
      </div>

      {isRejected && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-start space-x-4">
          <div className="bg-rose-100 text-rose-600 p-2 rounded-lg"><XCircle size={24} /></div>
          <div>
            <h3 className="font-bold text-rose-900">{t.activity.caseRejectedReadOnly}</h3>
            <p className="text-rose-700 text-sm mt-1">{t.activity.reason}: {activity.rejectionReason || 'Incomplete risk assessment documentation.'}</p>
            <p className="text-rose-600/60 text-xs mt-3 italic font-medium">{t.activity.archiveReferenceId}: {displayId}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="mono text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded tracking-widest border">#{displayId}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                activity.status === CaseStatus.REJECTED ? 'bg-rose-100 text-rose-700' :
                activity.status === CaseStatus.IN_PROGRESS ? 'bg-green-100 text-green-700' :
                activity.status === CaseStatus.APPROVED ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
              }`}>{t.status[activity.status]}</span>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1">
              <Clock size={12} />
              <span>{translate('activity.createdOn', { date: activity.createdAt })}</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{activity.title}</h1>
          <p className="text-slate-500 mt-2 max-w-2xl text-sm leading-relaxed">{activity.description}</p>
        </div>

        <nav className="bg-slate-50 px-8 border-t border-slate-100 flex space-x-8 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: t.activity.overview },
            { id: 'members', label: t.activity.members },
            { id: 'attendance', label: t.attendance.record },
            { id: 'audit', label: t.activity.audit }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 text-xs font-bold border-b-2 transition-all uppercase tracking-widest ${
                activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >{tab.label}</button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-2 space-y-8">
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                  <FileText size={16} />
                  <span>{t.activity.activityMission}</span>
                </h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {t.activity.activityMissionDesc}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t.activity.assessedRisk}</div>
                  <div className={`text-sm font-bold flex items-center space-x-2 ${activity.riskLevel === 'HIGH' ? 'text-rose-600' : 'text-slate-700'}`}>
                    <AlertTriangle size={14} />
                    <span>{t.risk[activity.riskLevel]} IMPACT</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t.activity.registration}</div>
                  <div className="text-sm font-bold text-slate-700 flex items-center space-x-2">
                    <Users size={14} />
                    <span>{activity.members.length} {t.activity.expected}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <h4 className="text-xs font-bold text-blue-700 mb-2 uppercase">{t.activity.logisticsInformation}</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                   <div><span className="text-blue-600/60">{t.activity.location}:</span> <span className="text-blue-900 font-bold ml-1">{activity.location}</span></div>
                   <div><span className="text-blue-600/60">{t.activity.duration}:</span> <span className="text-blue-900 font-bold ml-1">8 Hours</span></div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest border-b pb-2">{t.activity.artifactsAndDocuments}</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 border rounded-xl hover:bg-slate-50 transition-all text-left">
                  <div className="flex items-center space-x-3">
                    <div className="bg-red-50 text-red-500 p-2 rounded-lg"><FileText size={16} /></div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-slate-900 truncate">Safety_Protocols.pdf</div>
                      <div className="text-[10px] text-slate-400">1.2 MB • {t.activity.internal}</div>
                    </div>
                  </div>
                  <Download size={14} className="text-slate-300" />
                </button>
                <button className="w-full flex items-center justify-between p-3 border rounded-xl hover:bg-slate-50 transition-all text-left">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-50 text-blue-500 p-2 rounded-lg"><FileText size={16} /></div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-slate-900 truncate">Activity_Manifest.csv</div>
                      <div className="text-[10px] text-slate-400">45 KB • {t.activity.final}</div>
                    </div>
                  </div>
                  <Download size={14} className="text-slate-300" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
           <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-green-50 text-green-600 px-4 py-2 rounded-xl border border-green-100">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">{t.attendance.present}</div>
                    <div className="text-xl font-bold">
                      {attendanceStats?.checked_in ?? 0}{' '}
                      <span className="text-xs opacity-50 font-normal">/ {attendanceStats?.total_registered ?? 0}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 text-slate-600 px-4 py-2 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">{t.attendance.checkedOut}</div>
                    <div className="text-xl font-bold">{attendanceStats?.checked_out ?? 0}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={attendanceSearch}
                      onChange={(event) => setAttendanceSearch(event.target.value)}
                      placeholder={t.attendance.searchAttendee}
                      className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-xs w-48"
                    />
                  </div>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden shadow-sm">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                       <tr>
                          <th className="px-6 py-4">{t.attendance.participant}</th>
                          <th className="px-6 py-4">{t.activity.status}</th>
                          <th className="px-6 py-4">{t.attendance.checkInTime}</th>
                          <th className="px-6 py-4">{t.attendance.verifiedBy}</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                       {attendanceLoading && (
                         <tr>
                           <td colSpan={4} className="px-6 py-6 text-center text-xs text-slate-400">{t.attendance.loadingAttendance}</td>
                         </tr>
                       )}
                       {!attendanceLoading && attendanceError && (
                         <tr>
                           <td colSpan={4} className="px-6 py-6 text-center text-xs text-rose-500">{attendanceError}</td>
                         </tr>
                       )}
                       {!attendanceLoading && !attendanceError && filteredAttendanceRecords.length === 0 && (
                         <tr>
                           <td colSpan={4} className="px-6 py-6 text-center text-xs text-slate-400">{t.attendance.noAttendanceRecords}</td>
                         </tr>
                       )}
                       {!attendanceLoading && !attendanceError && filteredAttendanceRecords.map((record) => {
                         const timeValue = record.checked_in_at || record.registered_at;
                         const timeLabel = timeValue ? new Date(timeValue).toLocaleString() : '-';
                         return (
                           <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-900">{record.user_id}</td>
                              <td className="px-6 py-4">
                                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${attendanceStatusStyles[record.status] || 'bg-slate-100 text-slate-500'}`}>
                                    {record.status}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-slate-500">{timeLabel}</td>
                              <td className="px-6 py-4 text-xs text-slate-400 italic">{record.check_in_method || '-'}</td>
                           </tr>
                         );
                       })}
                    </tbody>
                 </table>
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
               <div key={i} className="relative pl-10 animate-in slide-in-from-left duration-200" style={{ animationDelay: `${i * 100}ms` }}>
                 <div className="absolute left-0 top-1 w-6 h-6 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                    <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                 </div>
                 <div className="text-sm font-bold text-slate-900">{log.action}</div>
                 <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase">{log.user} • {log.date}</div>
                 <div className="text-xs p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-600 italic leading-relaxed">{log.details}</div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'members' && (
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {activity.members.map(memberId => (
                <div key={memberId} className="flex items-center space-x-4 p-4 border rounded-xl bg-white hover:shadow-md transition-shadow">
                   <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">{memberId.charAt(0).toUpperCase()}</div>
                   <div>
                      <div className="text-sm font-bold text-slate-900">{memberId === 'user-1' ? 'Jane User' : 'Team Member'}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{memberId}</div>
                   </div>
                </div>
              ))}
              <button className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all">
                <Plus size={20} />
                <span className="text-xs font-bold uppercase tracking-widest">{t.activity.addParticipant}</span>
              </button>
           </div>
        )}
      </div>
    </div>
  );
};
