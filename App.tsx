
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/AppShell';
import { Dashboard } from './pages/Dashboard';
import { ActivityWizard } from './pages/ActivityWizard';
import { CaseDetail } from './pages/CaseDetail';
import { Role, ActivityCase, CaseStatus } from './types';
import { ShieldCheck, ArrowRight, User as UserIcon, ShieldQuestion } from 'lucide-react';

const MOCK_ACTIVITY: ActivityCase = {
  id: 'C-9021',
  title: 'Q3 Product Launch Event',
  description: 'Global launch event for the new enterprise suite involving 200+ partners.',
  status: CaseStatus.APPROVED,
  creatorId: 'user-1',
  createdAt: '2024-05-01',
  startTime: '2024-05-20T09:00:00',
  endTime: '2024-05-20T17:00:00',
  location: 'Main Auditorium',
  riskLevel: 'MEDIUM',
  members: ['user-1', 'user-2', 'user-3']
};

const REJECTED_ACTIVITY: ActivityCase = {
  id: 'C-8900',
  title: 'Internal Hackathon 2024',
  description: 'Two-day internal development sprint for the R&D team.',
  status: CaseStatus.REJECTED,
  rejectionReason: 'The venue "Basement Lounge" does not meet current fire safety standards for 50+ people.',
  creatorId: 'user-1',
  createdAt: '2024-05-10',
  startTime: '2024-06-01T09:00:00',
  endTime: '2024-06-02T17:00:00',
  location: 'Basement Lounge',
  riskLevel: 'HIGH',
  members: ['user-1']
};

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-10">
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">CaseFlow Enterprise</h1>
          <p className="text-slate-500 text-sm mt-1">Unified Activity Governance Platform</p>
        </div>
        <div className="space-y-3">
          {[
            { role: Role.ADMIN, label: 'Policy Administrator', icon: ShieldCheck, color: 'text-rose-600' },
            { role: Role.USER, label: 'Employee Portal', icon: UserIcon, color: 'text-blue-600' },
            { role: Role.GUEST, label: 'Guest Terminal', icon: ShieldQuestion, color: 'text-slate-600' }
          ].map(item => (
            <button key={item.role} onClick={() => login(item.role)} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group">
              <div className="flex items-center space-x-4">
                <item.icon className={item.color} size={20} />
                <span className="font-bold text-slate-900">{item.label}</span>
              </div>
              <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const MainRouter: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedCase, setSelectedCase] = useState<ActivityCase | null>(null);
  const [remakeBase, setRemakeBase] = useState<ActivityCase | null>(null);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedCase(null);
    setRemakeBase(null);
  };

  const handleRemake = (base: ActivityCase) => {
    setRemakeBase(base);
    setSelectedCase(null);
    setCurrentPage('create');
  };

  const renderPage = () => {
    if (selectedCase) return <CaseDetail activity={selectedCase} onBack={() => setSelectedCase(null)} onRemake={handleRemake} />;

    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} />;
      case 'create': return <ActivityWizard onComplete={() => handleNavigate('activities')} baseCase={remakeBase} />;
      case 'activities': return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Case Directory</h1>
            <button onClick={() => setCurrentPage('create')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Create New Case</button>
          </div>
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 text-[10px] uppercase tracking-widest">
                <tr><th className="px-6 py-4">Status</th><th className="px-6 py-4">Title</th><th className="px-6 py-4">Risk</th><th className="px-6 py-4"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[MOCK_ACTIVITY, REJECTED_ACTIVITY].map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.status === CaseStatus.REJECTED ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{c.title}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{c.riskLevel}</td>
                    <td className="px-6 py-4 text-right"><button onClick={() => setSelectedCase(c)} className="text-blue-600 font-bold text-xs uppercase tracking-widest">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
      default: return <div className="p-20 text-center text-slate-400">Section in development...</div>;
    }
  };

  return <AppShell activePage={currentPage} onNavigate={handleNavigate}>{renderPage()}</AppShell>;
};

const App: React.FC = () => (
  <AuthProvider>
    <AuthConsumer />
  </AuthProvider>
);

const AuthConsumer: React.FC = () => {
  const { user } = useAuth();
  return user ? <MainRouter /> : <LoginPage />;
};

export default App;
