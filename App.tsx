
import React, { useState, useEffect } from 'react';
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

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-10">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="bg-blue-600 p-4 rounded-2xl text-white mb-4 shadow-lg shadow-blue-500/30">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Enterprise CaseFlow</h1>
          <p className="text-slate-500 mt-2">Activity Management & Policy Enforcement</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => login(Role.ADMIN)}
            className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-lg"><ShieldCheck size={24} /></div>
              <div className="text-left">
                <div className="font-bold text-slate-900">Administrator Portal</div>
                <div className="text-xs text-slate-500">Alex Admin • IT Governance</div>
              </div>
            </div>
            <ArrowRight size={20} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </button>

          <button 
            onClick={() => login(Role.USER)}
            className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><UserIcon size={24} /></div>
              <div className="text-left">
                <div className="font-bold text-slate-900">Standard User</div>
                <div className="text-xs text-slate-500">Jane User • Marketing</div>
              </div>
            </div>
            <ArrowRight size={20} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </button>

          <button 
            onClick={() => login(Role.GUEST)}
            className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-slate-100 text-slate-600 rounded-lg"><ShieldQuestion size={24} /></div>
              <div className="text-left">
                <div className="font-bold text-slate-900">Visitor / Guest</div>
                <div className="text-xs text-slate-500">Temporary Field Check-in</div>
              </div>
            </div>
            <ArrowRight size={20} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium">SSO PROTECTED SYSTEM • CORPORATE AUDIT ENABLED</p>
        </div>
      </div>
    </div>
  );
};

const MainRouter: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedCase, setSelectedCase] = useState<ActivityCase | null>(null);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedCase(null);
  };

  const renderPage = () => {
    if (selectedCase) {
      return <CaseDetail activity={selectedCase} onBack={() => setSelectedCase(null)} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'activities':
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-900">Enterprise Cases</h1>
              <button 
                onClick={() => setCurrentPage('create')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-all"
              >
                + Initialize Case
              </button>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Activity Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Risk</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[MOCK_ACTIVITY].map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 mono text-sm font-bold text-slate-400">{c.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{c.title}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-amber-600">{c.riskLevel}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedCase(c)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-bold uppercase tracking-wider"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'create':
        return <ActivityWizard onComplete={() => handleNavigate('activities')} />;
      case 'approvals':
        return (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
             <ShieldCheck size={64} className="opacity-20" />
             <h2 className="text-xl font-bold text-slate-600">Admin Approval Queue</h2>
             <p className="max-w-md text-center">There are currently no cases waiting for your decision in the queue. New submissions will appear here automatically.</p>
          </div>
        );
      default:
        return (
          <div className="p-12 text-center text-slate-400">
            Feature in development. Contact architecture team for specs.
          </div>
        );
    }
  };

  return (
    <AppShell activePage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </AppShell>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
};

const AuthConsumer: React.FC = () => {
  const { user } = useAuth();
  return user ? <MainRouter /> : <LoginPage />;
};

export default App;
