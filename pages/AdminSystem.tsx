
import React, { useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { Users, Shield, Settings, Search, Plus, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { Role, User } from '../types';

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alex Admin', email: 'alex@corp.com', role: Role.ADMIN, department: 'Governance', status: 'ACTIVE' },
  { id: 'u2', name: 'Jane User', email: 'jane@corp.com', role: Role.USER, department: 'Marketing', status: 'ACTIVE' },
  { id: 'u3', name: 'Bob Inactive', email: 'bob@corp.com', role: Role.USER, department: 'Sales', status: 'INACTIVE' },
];

export const AdminSystem: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'users' | 'policies' | 'logs'>('users');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t.admin.systemManagement}</h1>
        <div className="flex space-x-2">
          {activeTab === 'users' && (
            <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 hover:bg-slate-800">
              <Plus size={16} />
              <span>{t.admin.addUser}</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          {[
            { id: 'users', label: t.admin.userDirectory, icon: Users },
            { id: 'policies', label: t.admin.globalPolicies, icon: Shield },
            { id: 'logs', label: t.admin.systemLogs, icon: Settings },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-8 py-4 text-sm font-bold transition-all border-b-2 ${
                  activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-0">
          {activeTab === 'users' && (
            <div>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="relative w-72">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder={t.admin.searchByNameOrEmail} className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm" />
                </div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">{t.admin.name}</th>
                    <th className="px-6 py-4">{t.admin.role}</th>
                    <th className="px-6 py-4">{t.admin.department}</th>
                    <th className="px-6 py-4">{t.admin.status}</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MOCK_USERS.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm">{user.name}</div>
                        <div className="text-xs text-slate-400">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{t.roles[user.role]}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{user.department}</td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center space-x-1.5 text-xs font-bold ${user.status === 'ACTIVE' ? 'text-green-600' : 'text-slate-400'}`}>
                          {user.status === 'ACTIVE' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          <span>{t.status[user.status]}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'policies' && (
            <div className="p-12 text-center text-slate-400">
              <Shield size={64} className="mx-auto mb-4 opacity-10" />
              <h3 className="text-lg font-bold text-slate-600">{t.admin.enterprisePolicyEngine}</h3>
              <p className="max-w-md mx-auto mt-2">{t.admin.enterprisePolicyEngineDesc}</p>
              <button className="mt-8 text-blue-600 font-bold hover:underline">{t.admin.downloadGlobalPolicyPDF}</button>
            </div>
          )}

          {activeTab === 'logs' && (
             <div className="p-12 text-center text-slate-400 italic">
               {t.admin.systemLogsInfo}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
