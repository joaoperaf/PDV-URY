import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  LayoutGrid,
  ClipboardList,
  ChefHat,
  Smartphone,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-2 relative w-full shrink-0 z-30">
      <nav className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-center items-center gap-6">
          {/* 1ª Posição: Ícone de Casinha (Início / Painel Principal /ury) */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors ${
                isActive ? 'text-blue-600 font-semibold' : ''
              }`
            }
          >
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">Início</span>
          </NavLink>

          {/* 2ª Posição: PDV (Frente de Caixa) */}
          <a
            href="/pos/pos"
            className="flex flex-col items-center p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-xs mt-1">PDV</span>
          </a>

          {/* 3ª Posição: Pedidos */}
          <a
            href="/pos/orders"
            className="flex flex-col items-center p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Smartphone className="w-5 h-5 hidden" />
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs mt-1">Pedidos</span>
          </a>

          {/* 4ª Posição: Cozinha (KDS) */}
          <a
            href="/pos/kitchen"
            className="flex flex-col items-center p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ChefHat className="w-5 h-5" />
            <span className="text-xs mt-1">Cozinha (KDS)</span>
          </a>

          {/* 5ª Posição: Cardápio Digital */}
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
    </footer>
  );
};

export default Footer;
