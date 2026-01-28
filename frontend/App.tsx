
import React, { useEffect, useState } from 'react';
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
import { CheckInPage } from './pages/CheckInPage';
import { Role, ActivityCase, CaseStatus } from './types';
import { activityService } from './services/activityService';
import authService from './services/authService';
import { ShieldCheck, QrCode, Download, MapPin, XCircle } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        await authService.register({
          username,
          email,
          full_name: fullName,
          password,
          phone: phone || undefined,
          department: department || undefined,
        });
        setSuccess(t.auth.registrationSuccess);
        setIsRegistering(false);
        setPassword('');
      } else {
        await login(username, password);
      }
    } catch (err: any) {
      const message = err?.response?.data?.detail || t.auth.authFailed;
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
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              {isRegistering ? t.auth.username : t.auth.usernameOrEmail}
            </label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={isRegistering ? t.auth.usernamePlaceholder : t.auth.emailPlaceholder}
              required
            />
          </div>
          {isRegistering && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{t.auth.email}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.auth.emailPlaceholder}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{t.auth.fullName}</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.auth.fullNamePlaceholder}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{t.auth.phone}</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.auth.phonePlaceholder}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{t.auth.department}</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.auth.departmentPlaceholder}
                  />
                </div>
              </div>
            </>
          )}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{t.auth.password}</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t.auth.passwordPlaceholder}
              required
            />
            {isRegistering && (
              <p className="text-[11px] text-slate-400">{t.auth.passwordHint}</p>
            )}
          </div>
          {error && <div className="text-sm text-rose-600 font-semibold">{error}</div>}
          {success && <div className="text-sm text-emerald-600 font-semibold">{success}</div>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center p-4 rounded-xl bg-blue-600 text-white font-bold text-sm uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {isSubmitting ? t.auth.submitting : (isRegistering ? t.auth.createAccount : t.auth.signIn)}
          </button>
        </form>
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering((prev) => !prev);
              setError('');
              setSuccess('');
            }}
            className="text-xs font-bold uppercase tracking-widest text-blue-600 hover:text-blue-700"
          >
            {isRegistering ? t.auth.haveAccount : t.auth.needAccount}
          </button>
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
  const [activities, setActivities] = useState<ActivityCase[]>([]);
  const [activityError, setActivityError] = useState('');

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

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const { items } = await activityService.list({ page: 1, per_page: 20 });
        setActivities(items);
      } catch (error: any) {
        setActivityError(error?.response?.data?.detail || 'Unable to load activities.');
      }
    };

    loadActivities();
  }, []);

  const renderPage = () => {
    if (window.location.pathname === '/check-in') {
      return <CheckInPage />;
    }
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
                <tr>
                  <th className="px-6 py-4">{t.activity.status}</th>
                  <th className="px-6 py-4">{t.activity.title}</th>
                  <th className="px-6 py-4">{t.activity.startTime}</th>
                  <th className="px-6 py-4">{t.activity.endTime}</th>
                  <th className="px-6 py-4">{t.activity.riskLevel}</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activityError && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-sm text-rose-600">{activityError}</td>
                  </tr>
                )}
                {!activityError && activities.map(c => (
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
                      <div className="text-[10px] text-slate-400 mono">ID: {c.caseNumber || c.id}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {c.startTime ? new Date(c.startTime).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {c.endTime ? new Date(c.endTime).toLocaleString() : '-'}
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
