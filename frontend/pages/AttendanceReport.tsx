
import React, { useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { Users, Search, Download, Clock, MapPin } from 'lucide-react';
import { attendanceService, AttendanceRecord, AttendanceStats } from '../services/attendanceService';
import { activityService } from '../services/activityService';
import { ActivityCase } from '../types';

export const AttendanceReport: React.FC = () => {
  const { t } = useI18n();
  const [activities, setActivities] = useState<ActivityCase[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isActive = true;
    const loadActivities = async () => {
      try {
        const response = await activityService.list({ page: 1, per_page: 10 });
        if (!isActive) return;
        setActivities(response.items);
        if (response.items.length > 0) {
          setSelectedActivityId(response.items[0].id);
        }
      } catch (error: any) {
        if (isActive) {
          setErrorMessage(error?.response?.data?.message || t.attendance.loadAttendanceFailed);
        }
      }
    };
    loadActivities();
    return () => {
      isActive = false;
    };
  }, [t.attendance.loadAttendanceFailed]);

  useEffect(() => {
    if (!selectedActivityId) return;
    let isActive = true;
    const loadAttendance = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const [attendanceStats, attendanceRecords] = await Promise.all([
          attendanceService.getStats(selectedActivityId),
          attendanceService.getRecords(selectedActivityId),
        ]);
        if (isActive) {
          setStats(attendanceStats);
          setRecords(attendanceRecords);
        }
      } catch (error: any) {
        if (isActive) {
          setErrorMessage(error?.response?.data?.message || t.attendance.loadAttendanceFailed);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };
    loadAttendance();
    return () => {
      isActive = false;
    };
  }, [selectedActivityId, t.attendance.loadAttendanceFailed]);

  const filteredRecords = records.filter(record =>
    record.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.attendance.liveAttendance}</h1>
          <p className="text-slate-500 text-sm">{t.attendance.liveAttendanceDesc}</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedActivityId}
            onChange={(event) => setSelectedActivityId(event.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 bg-white"
          >
            {activities.length === 0 && (
              <option value="">{t.attendance.noActivities}</option>
            )}
            {activities.map(activity => (
              <option key={activity.id} value={activity.id}>{activity.title}</option>
            ))}
          </select>
          <button className="flex items-center space-x-2 bg-white border px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50">
            <Download size={16} />
            <span>{t.attendance.exportCSV}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">{stats?.total_registered ?? 0}</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t.attendance.totalRegistered}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-blue-600">{stats?.attendance_rate ?? 0}%</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t.attendance.attendanceRate}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-amber-600">{stats?.checked_in ?? 0}</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t.attendance.checkedIn}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-green-600">{stats?.checked_out ?? 0}</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t.attendance.checkedOut}</div>
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
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t.attendance.filterLog}
              className="pl-9 pr-4 py-1.5 bg-slate-50 border-none rounded-lg text-xs"
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">{t.attendance.identity}</th>
              <th className="px-6 py-4">{t.activity.status}</th>
              <th className="px-6 py-4">{t.attendance.checkInTime}</th>
              <th className="px-6 py-4">{t.attendance.terminal}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-xs text-slate-400">{t.attendance.loadingAttendance}</td>
              </tr>
            )}
            {!isLoading && errorMessage && (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-xs text-rose-500">{errorMessage}</td>
              </tr>
            )}
            {!isLoading && !errorMessage && filteredRecords.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-xs text-slate-400">{t.attendance.noAttendanceRecords}</td>
              </tr>
            )}
            {!isLoading && !errorMessage && filteredRecords.map(record => {
              const timeValue = record.checked_in_at || record.registered_at;
              const timeLabel = timeValue ? new Date(timeValue).toLocaleString() : '-';
              return (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 text-sm">{record.user_id}</div>
                    <div className="text-[10px] text-slate-400 mono">ID: {record.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{record.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 flex items-center space-x-2 h-full">
                    <Clock size={14} />
                    <span>{timeLabel}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400 flex items-center space-x-1">
                    <MapPin size={12} />
                    <span>{record.check_in_method || t.attendance.unknownLocation}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
