
import React from 'react';
import { useI18n } from '../context/I18nContext';
import { UserCheck, Users, Search, Download, Clock, MapPin } from 'lucide-react';
import { AttendanceRecord } from '../types';

const MOCK_RECORDS: AttendanceRecord[] = [
  { id: 'att-1', userId: 'user-2', type: 'MEMBER', timestamp: '2024-05-20 09:05:12', location: 'Conference Room B' },
  { id: 'att-2', visitorName: 'Alice Green (External)', type: 'VISITOR', timestamp: '2024-05-20 09:12:44', location: 'Conference Room B' },
  { id: 'att-3', userId: 'user-3', type: 'MEMBER', timestamp: '2024-05-20 09:15:01', location: 'Conference Room B' },
];

export const AttendanceReport: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.attendance.liveAttendance}</h1>
          <p className="text-slate-500 text-sm">{t.attendance.liveAttendanceDesc}</p>
        </div>
        <button className="flex items-center space-x-2 bg-white border px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50">
          <Download size={16} />
          <span>{t.attendance.exportCSV}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">42</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t.attendance.totalCheckIns}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-blue-600">88%</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t.attendance.memberPresence}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-amber-600">5</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t.attendance.guestEntries}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-green-600">0</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t.attendance.securityFlags}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-500 font-bold text-sm">
            <Users size={18} />
            <span>{t.attendance.recentAccessLog}</span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder={t.attendance.filterLog} className="pl-9 pr-4 py-1.5 bg-slate-50 border-none rounded-lg text-xs" />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">{t.attendance.identity}</th>
              <th className="px-6 py-4">{t.attendance.type}</th>
              <th className="px-6 py-4">{t.attendance.checkInTime}</th>
              <th className="px-6 py-4">{t.attendance.terminal}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_RECORDS.map(record => (
              <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900 text-sm">{record.userId || record.visitorName}</div>
                  <div className="text-[10px] text-slate-400 mono">ID: {record.id}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    record.type === 'MEMBER' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                  }`}>{record.type}</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 flex items-center space-x-2 h-full">
                  <Clock size={14} />
                  <span>{record.timestamp}</span>
                </td>
                <td className="px-6 py-4 text-xs text-slate-400 flex items-center space-x-1">
                  <MapPin size={12} />
                  <span>{record.location}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
