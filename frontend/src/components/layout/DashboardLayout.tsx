import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BranchProvider } from '../../context/BranchContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

export const DashboardLayout: React.FC = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <BranchProvider>
      <div className="h-screen flex flex-col bg-slate-50 text-foreground font-inter text-sm overflow-hidden">
        <Header
          isMobileNavOpen={isMobileNavOpen}
          onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
        />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar
            mobileOpen={isMobileNavOpen}
            onCloseMobile={() => setIsMobileNavOpen(false)}
          />
          <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto min-w-0">
            <Outlet />
          </main>
        </div>
        <Footer />
      </div>
    </BranchProvider>
  );
};

export default DashboardLayout;
