
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider, useI18n } from './context/I18nContext';
import { AppShell } from './components/AppShell';
import { PermissionWrapper } from './components/PermissionWrapper';
import { Dashboard } from './pages/Dashboard';
import { ActivityWizard } from './pages/ActivityWizard';
import { CaseDetail } from './pages/CaseDetail';
import { ApprovalCenter } from './pages/ApprovalCenter';
import { AdminSystem } from './pages/AdminSystem';
import { AttendanceReport } from './pages/AttendanceReport';
import { Role, ActivityCase, CaseStatus } from './types';
import { ShieldCheck, QrCode, Download, MapPin, XCircle } from 'lucide-react';

const MOCK_ACTIVITY: ActivityCase = {
  id: 'C-9021',
  title: 'Q3 Product Launch Event',
  description: 'Global launch event for the new enterprise suite involving 200+ partners. This event includes high-level stakeholders and requires strict security check-in protocols for all attendees.',
  status: CaseStatus.IN_PROGRESS,
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
  description: 'Two-day internal development sprint for the R&D team focused on AI innovations.',
  status: CaseStatus.REJECTED,
  rejectionReason: 'The venue "Basement Lounge" does not meet current fire safety standards for 50+ people. Please select an approved auditorium.',
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
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(username, password);
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Login failed. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 transform transition-all hover:scale-[1.01]">
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t.branding.appName}</h1>
          <p className="text-slate-500 text-sm mt-1">{t.branding.appSubtitle}</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Username or Email</label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div className="text-sm text-rose-600 font-semibold">{error}</div>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center p-4 rounded-xl bg-blue-600 text-white font-bold text-sm uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="mt-8 text-center">
           <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{t.branding.securedBy}</p>
        </div>
      </div>
    </div>
  );
};

const QRDisplayModal: React.FC<{ activity: ActivityCase, onClose: () => void }> = ({ activity, onClose }) => {
  const { t } = useI18n();

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
        </div>

        <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-slate-800 transition-colors">
          <Download size={18} />
          <span>{t.activity.saveAsImage}</span>
        </button>
      </div>
    </div>
  );
};

const MainRouter: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { t } = useI18n();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedCase, setSelectedCase] = useState<ActivityCase | null>(null);
  const [remakeBase, setRemakeBase] = useState<ActivityCase | null>(null);
  const [qrActivity, setQrActivity] = useState<ActivityCase | null>(null);

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

  const handleViewCase = (caseItem: ActivityCase) => {
    setSelectedCase(caseItem);
  };

  const renderPage = () => {
    if (selectedCase) return <CaseDetail activity={selectedCase} onBack={() => setSelectedCase(null)} onRemake={handleRemake} />;

    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} onSelectCase={handleViewCase} />;
      case 'create': return <ActivityWizard onComplete={() => handleNavigate('activities')} baseCase={remakeBase} />;
      case 'activities': return (
        <div className="space-y-6">
          {qrActivity && <QRDisplayModal activity={qrActivity} onClose={() => setQrActivity(null)} />}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t.nav.caseDirectory}</h1>
              <p className="text-slate-500 text-sm">{t.activity.centralizedManagement}</p>
            </div>
            <PermissionWrapper action="activity:create" fallback="hide">
              <button onClick={() => setCurrentPage('create')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 transition-colors">{t.activity.createNewCase}</button>
            </PermissionWrapper>
          </div>
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 text-[10px] uppercase tracking-widest">
                <tr><th className="px-6 py-4">{t.activity.status}</th><th className="px-6 py-4">{t.activity.title}</th><th className="px-6 py-4">{t.activity.riskLevel}</th><th className="px-6 py-4"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[MOCK_ACTIVITY, REJECTED_ACTIVITY].map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.status === CaseStatus.REJECTED ? 'bg-rose-100 text-rose-700' :
                        c.status === CaseStatus.IN_PROGRESS ? 'bg-green-100 text-green-700' :
                        c.status === CaseStatus.APPROVED ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                      }`}>{t.status[c.status]}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{c.title}</div>
                      <div className="text-[10px] text-slate-400 mono">ID: {c.id}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{t.risk[c.riskLevel]}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-4">
                        <button onClick={() => setSelectedCase(c)} className="text-blue-600 font-bold text-xs uppercase tracking-widest hover:underline">{t.activity.viewDetails}</button>
                        {c.status === CaseStatus.IN_PROGRESS && (
                          <PermissionWrapper action="activity:qr-display" resource={c} fallback="hide">
                            <button onClick={() => setQrActivity(c)} className="text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-700">{t.activity.displayQR}</button>
                          </PermissionWrapper>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
      case 'approvals': return <ApprovalCenter onViewCase={handleViewCase} />;
      case 'reports': return <AttendanceReport />;
      case 'settings':
      case 'admin_users':
        if (user?.role !== Role.ADMIN) {
          return <div className="p-20 text-center text-slate-400">Access restricted.</div>;
        }
        return <AdminSystem />;
      default: return <div className="p-20 text-center text-slate-400">Section in development...</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return <AppShell activePage={currentPage} onNavigate={handleNavigate}>{renderPage()}</AppShell>;
};

const App: React.FC = () => (
  <I18nProvider>
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  </I18nProvider>
);

const AuthConsumer: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }
  return user ? <MainRouter /> : <LoginPage />;
};

export default App;
