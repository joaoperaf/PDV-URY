import { NavLink } from 'react-router-dom';
import {
  Home,
  LayoutGrid,
  ClipboardList,
  ChefHat,
  Smartphone,
  Settings,
} from 'lucide-react';
import { cn } from '@ury/ui';
import { t } from '../i18n';

const Footer = () => {

  const navItems = [
    { icon: LayoutGrid, label: t('footer.pos'), path: '/pos' },
    { icon: ClipboardList, label: t('footer.orders'), path: '/orders' },
    { icon: ChefHat, label: 'Cozinha (KDS)', path: '/kitchen' },
    { icon: Settings, label: t('footer.settings'), path: '/settings', hidden: true },
  ].filter((item) => !item.hidden);

  return (
    <div className="bg-white border-t border-gray-200 py-2 relative z-30">
      <nav className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-center items-center gap-6">
          {/* 1ª Posição: Ícone de Casinha (Início / Painel Principal /ury) */}
          <a
            href="/ury/dashboard"
            className="flex flex-col items-center p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">Início</span>
          </a>

          {/* Abas internas do PDV */}
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors',
                  isActive && 'text-blue-600 font-semibold'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </NavLink>
          ))}

          {/* Atalho direto para o Cardápio Digital do Cliente */}
          <a
            href="/order"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Smartphone className="w-5 h-5" />
            <span className="text-xs mt-1">Cardápio Digital</span>
          </a>
        </div>
      </nav>
    </div>
  );
};

export default Footer; 