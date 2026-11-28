import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  LayoutGrid,
  ClipboardList,
  ChefHat,
  Smartphone,
} from 'lucide-react';
import { cn } from '@ury/ui';

export const Footer: React.FC = () => {
  const linkBase =
    'flex flex-col items-center justify-center min-h-11 min-w-0 flex-1 md:flex-none p-1 md:p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors';

  return (
    <footer className="bg-white border-t border-slate-200 py-2 relative w-full shrink-0 z-30">
      <nav className="max-w-screen-xl mx-auto px-1 md:px-4" aria-label="Atalhos operacionais">
        <div className="flex justify-around md:justify-center items-center gap-0 md:gap-6">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              cn(linkBase, isActive && 'text-blue-600 font-semibold')
            }
          >
            <Home className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] md:text-xs mt-1 max-w-full truncate">Início</span>
          </NavLink>

          <a href="/pos/pos" className={linkBase}>
            <LayoutGrid className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] md:text-xs mt-1 max-w-full truncate">PDV</span>
          </a>

          <a href="/pos/orders" className={linkBase}>
            <ClipboardList className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] md:text-xs mt-1 max-w-full truncate">Pedidos</span>
          </a>

          <a href="/pos/kitchen" className={linkBase}>
            <ChefHat className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] md:text-xs mt-1 max-w-full truncate">Cozinha (KDS)</span>
          </a>

          <a
            href="/menu"
            target="_blank"
            rel="noopener noreferrer"
            className={linkBase}
          >
            <Smartphone className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] md:text-xs mt-1 max-w-full truncate">
              Cardápio Digital
            </span>
          </a>
        </div>
      </nav>
    </footer>
  );
};

export default Footer;
