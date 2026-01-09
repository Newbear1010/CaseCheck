
import React from 'react';
import { UserCheck, Users, Search, Download, Clock, MapPin } from 'lucide-react';
import { AttendanceRecord } from '../types';

const MOCK_RECORDS: AttendanceRecord[] = [
  { id: 'att-1', userId: 'user-2', type: 'MEMBER', timestamp: '2024-05-20 09:05:12', location: 'Conference Room B' },
  { id: 'att-2', visitorName: 'Alice Green (External)', type: 'VISITOR', timestamp: '2024-05-20 09:12:44', location: 'Conference Room B' },
  { id: 'att-3', userId: 'user-3', type: 'MEMBER', timestamp: '2024-05-20 09:15:01', location: 'Conference Room B' },
];

export const AttendanceReport: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Attendance</h1>
          <p className="text-slate-500 text-sm">Real-time occupancy and check-in logs for active cases.</p>
        </div>
        <button className="flex items-center space-x-2 bg-white border px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50">
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">42</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Check-ins</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-blue-600">88%</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Member Presence</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-amber-600">5</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Guest Entries</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-green-600">0</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Security Flags</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-500 font-bold text-sm">
            <Users size={18} />
            <span>Recent Access Log</span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Filter log..." className="pl-9 pr-4 py-1.5 bg-slate-50 border-none rounded-lg text-xs" />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Identity</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Check-in Time</th>
              <th className="px-6 py-4">Terminal</th>
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
