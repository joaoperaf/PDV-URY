import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Settings,
  Store,
  Building2,
  Check,
  Monitor,
  RefreshCw
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
}



export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { activeBranchId, setActiveBranchId, branches, activeBranch, filterContext } = useBranchContext();

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [userInfo, setUserInfo] = useState({ fullName: 'Admin User', email: 'admin@urypos.com' });

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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userId = await getLoggedUser();
        if (userId) {
          const roles = await getUserRoles(userId);
          setUserInfo({
            fullName: roles.full_name || 'Admin User',
            email: userId
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
        const res = await call('frappe.client.get_list', {
          doctype: 'Notification Log',
          fields: ['name', 'subject', 'email_content', 'creation', 'read'],
          limit_page_length: 5
        });
        if (res && res.message) {
          const mapped = res.message.map((n: any) => ({
            id: n.name,
            title: n.subject || 'Notification',
            message: n.email_content || '',
            timestamp: n.creation || '',
            type: 'info',
            read: !!n.read
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
    // Clear all local storage
    localStorage.clear();
    // Clear all session storage
    sessionStorage.clear();
    // Reload the page
    window.location.reload();
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore logout errors
    } finally {
      window.location.href = '/login?redirect-to=%2Fpos';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left Section: Logo & Brand */}
        <div className="flex items-center space-x-3">
          <Link to="/dashboard" className="flex items-center space-x-3 group">
            <span className="flex h-10 w-[112px] items-center justify-center overflow-hidden">
              <img src={uryLogo} alt="Péricles Burger" className="h-auto w-[112px] object-contain" />
            </span>
          </Link>
        </div>

        {/* Right Section: Notifications & User Profile */}
        <div className="flex items-center space-x-3">
          {/* Notifications Bell */}
          <button
            onClick={() => setIsNotificationOpen(true)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Open notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* User Menu Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium">{userInfo.fullName}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{userInfo.fullName}</p>
                  <p className="text-sm text-gray-500 truncate">{userInfo.email}</p>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      window.location.href = '/app';
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Monitor className="w-4 h-4" />
                    <span>Ir para o ERP (Desk)</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleClearCache();
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Limpar Cache</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
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
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-gray-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setIsNotificationOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-gray-200">
              {/* Drawer Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-semibold text-gray-900">Notificações</h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                  <button
                    onClick={() => setIsNotificationOpen(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer List */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Nenhuma nova notificação
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 transition-colors ${
                        item.read ? 'bg-white' : 'bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                          {item.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                          {item.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                          {item.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                            <span className="text-xs text-gray-400">{item.timestamp}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{item.message}</p>
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
