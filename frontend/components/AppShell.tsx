
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import {
  LayoutDashboard,
  ClipboardList,
  PlusSquare,
  ShieldCheck,
  Users,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  FileText,
  Globe
} from 'lucide-react';
import { PermissionWrapper } from './PermissionWrapper';

interface AppShellProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, activePage, onNavigate }) => {
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) return <>{children}</>;

  const toggleLocale = () => {
    setLocale(locale === 'zh-TW' ? 'en-US' : 'zh-TW');
  };

  const NavItem = ({ icon: Icon, label, id, action }: any) => {
    const item = (
      <button
        onClick={() => { onNavigate(id); setIsSidebarOpen(false); }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
          activePage === id
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </button>
    );

    if (action) {
      return (
        <PermissionWrapper action={action} fallback="hide">
          {item}
        </PermissionWrapper>
      );
    }
    return item;
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-xl"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:block
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <div className="flex items-center space-x-3 text-blue-400 mb-8">
              <ShieldCheck size={32} />
              <span className="text-xl font-bold tracking-tight">{t.branding.caseFlow}</span>
            </div>

            <nav className="space-y-1">
              <NavItem icon={LayoutDashboard} label={t.nav.dashboard} id="dashboard" />
              <NavItem icon={ClipboardList} label={t.nav.activities} id="activities" />
              <NavItem icon={PlusSquare} label={t.nav.newActivity} id="create" action="activity:create" />
              <NavItem icon={ShieldCheck} label={t.nav.approvalCenter} id="approvals" action="activity:approve" />
              <NavItem icon={FileText} label={t.nav.systemReports} id="reports" action="admin:policy_manage" />
            </nav>
          </div>

          <div className="mt-auto p-6 space-y-1 border-t border-slate-800">
            <button
              onClick={toggleLocale}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Globe size={20} />
              <span className="font-medium">{locale === 'zh-TW' ? 'English' : '中文'}</span>
            </button>
            <NavItem icon={Settings} label={t.nav.settings} id="settings" action="admin:user_manage" />
            <button
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">{t.nav.signOut}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder={t.header.searchPlaceholder}
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-md focus:ring-2 focus:ring-blue-500 w-64 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <button className="text-slate-500 hover:text-blue-600 transition-colors relative">
              <Bell size={22} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">2</span>
            </button>
            <div className="flex items-center space-x-3 border-l pl-6 border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500">{t.roles[user.role]} | {user.department}</div>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold border border-blue-200">
                {user.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};
