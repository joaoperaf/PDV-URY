import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useBranchContext } from '../../context/BranchContext';
import { logout, call, getLoggedUser, getUserRoles } from '@ury/core';
import uryLogo from '../../../Public/logo-pericles-burger.png';
import {
  Bell,
  User,
  ChevronDown,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  LogOut,
  Building2,
  Check,
  Monitor,
  RefreshCw,
  Menu,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
}

interface HeaderProps {
  isMobileNavOpen?: boolean;
  onToggleMobileNav?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isMobileNavOpen = false,
  onToggleMobileNav,
}) => {
  const { activeBranchId, setActiveBranchId, branches, activeBranch } = useBranchContext();

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [userInfo, setUserInfo] = useState({ fullName: 'Administrador', email: '' });

  const userMenuRef = useRef<HTMLDivElement>(null);
  const branchMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
      setIsUserMenuOpen(false);
    }
    if (branchMenuRef.current && !branchMenuRef.current.contains(event.target as Node)) {
      setIsBranchDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsBranchDropdownOpen(false);
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClickOutside]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userId = await getLoggedUser();
        if (userId) {
          const roles = await getUserRoles(userId);
          setUserInfo({
            fullName: roles.full_name || userId,
            email: userId,
          });
        }
      } catch (e) {
        console.error('Failed to fetch user', e);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await call<any>('frappe.client.get_list', {
          doctype: 'Notification Log',
          fields: ['name', 'subject', 'email_content', 'creation', 'read'],
          limit_page_length: 5,
        });
        const list = Array.isArray(res) ? res : res?.message;
        if (Array.isArray(list)) {
          const mapped: NotificationItem[] = list.map((n: any) => ({
            id: n.name,
            title: String(n.subject || 'Notificação').replace(/<[^>]+>/g, ''),
            message: String(n.email_content || '').replace(/<[^>]+>/g, ''),
            timestamp: n.creation || '',
            type: 'info',
            read: !!n.read,
          }));
          setNotifications(mapped);
        }
      } catch (e) {
        console.error('Failed to fetch notifications', e);
      }
    };
    fetchNotifications();
  }, []);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore logout errors
    } finally {
      window.location.href = '/login?redirect-to=%2Fury%2Fdashboard';
    }
  };

  const currentBranchLabel =
    activeBranchId === 'all'
      ? 'Todas as Filiais'
      : activeBranch?.name || activeBranchId;

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-xs">
      <div className="flex items-center justify-between h-16 px-3 sm:px-5 lg:px-6 gap-2">
        {/* Left Section: Mobile Menu Toggle + Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onToggleMobileNav && (
            <button
              type="button"
              onClick={onToggleMobileNav}
              aria-label={isMobileNavOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
              aria-expanded={isMobileNavOpen}
              className="lg:hidden inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shrink-0"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
          )}

          <Link
            to="/dashboard"
            className="flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shrink-0"
          >
            <span className="flex h-9 sm:h-10 w-[86px] sm:w-[112px] items-center justify-center overflow-hidden">
              <img
                src={uryLogo}
                alt="Péricles Burger"
                className="h-auto w-full object-contain"
              />
            </span>
          </Link>
        </div>

        {/* Right Section: Branch Selector, Notifications & User Profile */}
        <div className="flex items-center gap-1 sm:gap-3 min-w-0">
          {/* Global Branch Switcher */}
          {branches.length > 0 && (
            <div className="relative min-w-0" ref={branchMenuRef}>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isBranchDropdownOpen}
                onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 sm:gap-1.5 h-9 sm:h-10 px-2 sm:px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Building2 className="hidden sm:block w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden="true" />
                <span className="max-w-[84px] sm:max-w-[160px] truncate">
                  {currentBranchLabel}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden="true" />
              </button>

              {isBranchDropdownOpen && (
                <div
                  role="listbox"
                  aria-label="Selecionar filial ativa"
                  className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-slate-200 z-50 py-1.5"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={activeBranchId === 'all'}
                    onClick={() => {
                      setActiveBranchId('all');
                      setIsBranchDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-left flex items-center justify-between text-slate-800 hover:bg-slate-100"
                  >
                    <span>Todas as Filiais</span>
                    {activeBranchId === 'all' && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                  {branches.map((branch) => {
                    const bId = branch.id || branch.name;
                    const isSelected = activeBranchId === bId;
                    return (
                      <button
                        key={bId}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setActiveBranchId(bId);
                          setIsBranchDropdownOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-left flex items-center justify-between text-slate-800 hover:bg-slate-100"
                      >
                        <span className="truncate">{branch.name || bId}</span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={() => setIsNotificationOpen(true)}
            className="relative inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shrink-0"
            aria-label="Abrir notificações"
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2.5 h-2.5 bg-blue-600 rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* User Menu Dropdown */}
          <div className="relative shrink-0" ref={userMenuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-1.5 sm:px-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-700 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <span className="hidden md:inline text-sm font-medium max-w-[140px] truncate">
                {userInfo.fullName}
              </span>
              <ChevronDown className="hidden sm:block w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
            </button>

            {isUserMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-slate-200 z-50"
              >
                <div className="p-4 border-b border-slate-200">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {userInfo.fullName}
                  </p>
                  {userInfo.email && (
                    <p className="text-xs text-slate-600 truncate mt-0.5">
                      {userInfo.email}
                    </p>
                  )}
                </div>

                <div className="py-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      window.location.href = '/app';
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Monitor className="w-4 h-4 text-slate-600" aria-hidden="true" />
                    <span>Ir para o ERP (Desk)</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleClearCache();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-600" aria-hidden="true" />
                    <span>Limpar Cache</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-red-600" aria-hidden="true" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Slide-over Drawer */}
      {isNotificationOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ury-notifications-title"
          className="fixed inset-0 z-50 overflow-hidden"
        >
          <div
            className="absolute inset-0 bg-slate-900/40 transition-opacity"
            onClick={() => setIsNotificationOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" aria-hidden="true" />
                  <h2 id="ury-notifications-title" className="text-base font-semibold text-slate-900">
                    Notificações
                  </h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Fechar notificações"
                    onClick={() => setIsNotificationOpen(false)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-600">
                    Nenhuma nova notificação no momento.
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 transition-colors ${
                        item.read ? 'bg-white' : 'bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {item.type === 'info' && (
                            <Info className="w-5 h-5 text-blue-600" aria-hidden="true" />
                          )}
                          {item.type === 'warning' && (
                            <AlertTriangle className="w-5 h-5 text-amber-600" aria-hidden="true" />
                          )}
                          {item.type === 'success' && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {item.title}
                            </p>
                            <span className="text-xs text-slate-600 shrink-0 tabular-nums">
                              {item.timestamp.slice(0, 16)}
                            </span>
                          </div>
                          {item.message && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-3">
                              {item.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
