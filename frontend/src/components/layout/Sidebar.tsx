import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../store/useAuth';
import { reportsRegistry, groupReports } from '../../pages/Reports/reportsRegistry';
import { SidebarContainer, SidebarActiveIndicator, sidebarItemVariants, cn } from '@ury/ui';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Building2,
  SlidersHorizontal,
  Users,
  ChevronDown,
  Settings,
  Store,
  BarChart3,
  ArrowLeft,
  Grid,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Painel Inicial', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Cardápio', path: '/menu', icon: UtensilsCrossed },
  { label: 'Agregadores / Delivery', path: '/aggregator', icon: Store },
  { label: 'Dados da Loja', path: '/branch', icon: Building2 },
];

const SETTINGS_ITEMS: NavItem[] = [
  { label: 'Perfil de PDV', path: '/pos-profile', icon: SlidersHorizontal },
  { label: 'Usuários', path: '/user', icon: Users },
  { label: 'Unid. de Produção (KDS)', path: '/production-unit', icon: Grid },
];

const reportGroups = groupReports(reportsRegistry);
const reportGroupEntries = Object.entries(reportGroups);

const ReportsPanel: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => (
  <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Relatórios gerenciais">
    <Link
      to="/dashboard"
      onClick={onNavigate}
      className={cn(sidebarItemVariants({ active: false }), 'mb-4')}
    >
      <div className="flex items-center gap-3 ms-1">
        <ArrowLeft className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
        <span>Voltar ao Painel</span>
      </div>
    </Link>

    <div className="space-y-4">
      {reportGroupEntries.map(([group, reports], index) => (
        <div key={group} className={index > 0 ? 'pt-3 border-t border-slate-200' : undefined}>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2 px-2">
            {group}
          </h3>
          <div className="space-y-1">
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <NavLink
                  key={report.id}
                  to={`/reports/${report.path}`}
                  onClick={onNavigate}
                  className={({ isActive }) => sidebarItemVariants({ active: isActive })}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <SidebarActiveIndicator />}
                      <div className="flex items-center gap-3 ms-1">
                        <Icon className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
                        <span>{report.label}</span>
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  </nav>
);

const MainPanel: React.FC<{ isManager: boolean; onNavigate?: () => void }> = ({
  isManager,
  onNavigate,
}) => {
  const location = useLocation();
  const isSettingsPath = SETTINGS_ITEMS.some((item) => location.pathname.startsWith(item.path));
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(isSettingsPath);

  useEffect(() => {
    if (isSettingsPath) {
      setIsSettingsOpen(true);
    }
  }, [isSettingsPath]);

  return (
    <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1" aria-label="Menu do painel">
      {isManager && (
        <NavLink
          to="/reports"
          onClick={onNavigate}
          className={({ isActive }) => sidebarItemVariants({ active: isActive })}
        >
          {({ isActive }) => (
            <>
              {isActive && <SidebarActiveIndicator />}
              <div className="flex items-center gap-3 ms-1">
                <BarChart3 className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
                <span>Relatórios</span>
              </div>
            </>
          )}
        </NavLink>
      )}

      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) => sidebarItemVariants({ active: isActive })}
          >
            {({ isActive }) => (
              <>
                {isActive && <SidebarActiveIndicator />}
                <div className="flex items-center gap-3 ms-1">
                  <Icon className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </div>
              </>
            )}
          </NavLink>
        );
      })}

      <div>
        <button
          type="button"
          aria-expanded={isSettingsOpen}
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={sidebarItemVariants({ active: isSettingsPath })}
        >
          {isSettingsPath && <SidebarActiveIndicator />}
          <div className="flex items-center gap-3 ms-1">
            <Settings className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
            <span>Configurações</span>
          </div>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isSettingsOpen ? 'rotate-180 text-blue-600' : 'text-slate-600',
            )}
          />
        </button>

        {isSettingsOpen && (
          <div className="mt-1 pl-4 space-y-1">
            {SETTINGS_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(sidebarItemVariants({ active: isActive }), 'py-2 text-xs')
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <SidebarActiveIndicator />}
                      <div className="flex items-center gap-2.5 ms-1">
                        <Icon className="w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden="true" />
                        <span>{item.label}</span>
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen = false,
  onCloseMobile,
}) => {
  const location = useLocation();
  const { isManager } = useAuth();
  const inReports = location.pathname.startsWith('/reports');

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {/* Desktop Static Sidebar */}
      <SidebarContainer className="hidden lg:flex">
        {inReports ? <ReportsPanel /> : <MainPanel isManager={isManager} />}
      </SidebarContainer>

      {/* Tablet & Mobile Slide-over Drawer */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navegação do painel"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          <div
            className="fixed inset-0 bg-slate-900/40 transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-72 max-w-[85vw] bg-white h-full shadow-2xl border-e border-slate-200 flex flex-col">
            <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-sm font-bold text-slate-900">Navegação</span>
              <button
                type="button"
                aria-label="Fechar navegação"
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {inReports ? (
              <ReportsPanel onNavigate={onCloseMobile} />
            ) : (
              <MainPanel isManager={isManager} onNavigate={onCloseMobile} />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
