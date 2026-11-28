import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { call, parseFrappeError } from '@ury/core';
import { StateMessage } from '@ury/ui';
import SetupPage from './pages/Setup/SetupPage';
import ConfigurePage from './pages/Setup/ConfigurePage';
import DashboardLayout from './components/layout/DashboardLayout';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { MenuPage } from './pages/Dashboard/MenuPage';
import { PosProfilePage } from './pages/Dashboard/PosProfilePage';
import { UserPage } from './pages/Dashboard/UserPage';
import { BranchPage } from './pages/Dashboard/BranchPage';
import ProductionUnitPage from './pages/Dashboard/ProductionUnitPage';
import AggregatorPage from './pages/Dashboard/AggregatorPage';
import { RoleGuard } from './components/RoleGuard';
import { AuthGuard } from './components/AuthGuard';
import { ReportsLayout } from './pages/Reports/ReportsLayout';
import { ReportsHome } from './pages/Reports/ReportsHome';
import { TodaysSales } from './pages/Reports/TodaysSales';
import { DaywiseSales } from './pages/Reports/DaywiseSales';
import { DaywiseInvoices } from './pages/Reports/DaywiseInvoices';
import { MonthWiseSales } from './pages/Reports/MonthWiseSales';
import { TimeWiseSales } from './pages/Reports/TimeWiseSales';
import { ServiceWiseSales } from './pages/Reports/ServiceWiseSales';
import { CancelledInvoices } from './pages/Reports/CancelledInvoices';
import { AverageBillValue } from './pages/Reports/AverageBillValue';
import { ItemWiseSales } from './pages/Reports/ItemWiseSales';
import { CustomerData } from './pages/Reports/CustomerData';
import { DaywiseCustomerDetails } from './pages/Reports/DaywiseCustomerDetails';
import { RepeatedCustomers } from './pages/Reports/RepeatedCustomers';

interface WizardStatus {
  step1_complete: boolean;
  step2_complete: boolean;
}

function SetupGuard() {
  const [status, setStatus] = useState<WizardStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadWizardStatus = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await call<any>(
        'ury.ury.api.minimal.setup_organization.get_wizard_status'
      );
      const wizardStatus: WizardStatus = res?.message ?? res;
      setStatus(wizardStatus);
    } catch (err) {
      setLoadError(
        parseFrappeError(
          err,
          'Não foi possível verificar a configuração inicial do sistema.'
        )
      );
    }
  }, []);

  useEffect(() => {
    loadWizardStatus();
  }, [loadWizardStatus]);

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <StateMessage
          variant="error"
          title="Não foi possível carregar o painel gerencial"
          description={loadError}
          actionLabel="Tentar novamente"
          onAction={loadWizardStatus}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm"
        />
      </div>
    );
  }

  if (!status) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="min-h-screen flex items-center justify-center bg-slate-50"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full motion-safe:animate-spin" />
          <p className="text-sm font-medium text-slate-600">Carregando painel...</p>
        </div>
      </div>
    );
  }

  const isSetupRoute = window.location.pathname.startsWith(
    '/ury/setup-wizard/'
  );

  if (!status.step2_complete && !isSetupRoute) {
    return (
      <Navigate
        to={status.step1_complete ? '/setup-wizard/1' : '/setup-wizard/0'}
        replace
      />
    );
  }

  if (status.step2_complete && isSetupRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <Routes>
      <Route element={<SetupGuard />}>
        <Route path="setup-wizard/0" element={<SetupPage />} />
        <Route path="setup-wizard/1" element={<ConfigurePage />} />

        <Route
          path="/"
          element={
            <RoleGuard>
              <DashboardLayout />
            </RoleGuard>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="pos-profile" element={<PosProfilePage />} />
          <Route path="user" element={<UserPage />} />
          <Route path="branch" element={<BranchPage />} />
          <Route path="production-unit" element={<ProductionUnitPage />} />
          <Route path="aggregator" element={<AggregatorPage />} />

          <Route
            path="reports/*"
            element={
              <RoleGuard>
                <AuthGuard>
                  <ReportsLayout />
                </AuthGuard>
              </RoleGuard>
            }
          >
            <Route index element={<ReportsHome />} />
            <Route path="today-sales" element={<TodaysSales />} />
            <Route path="daywise-sales" element={<DaywiseSales />} />
            <Route path="daywise-invoices" element={<DaywiseInvoices />} />
            <Route path="month-wise-sales" element={<MonthWiseSales />} />
            <Route path="time-wise-sales" element={<TimeWiseSales />} />
            <Route path="service-wise-sales" element={<ServiceWiseSales />} />
            <Route path="cancelled-invoices" element={<CancelledInvoices />} />
            <Route path="average-bill-value" element={<AverageBillValue />} />
            <Route path="item-wise-sales" element={<ItemWiseSales />} />
            <Route path="customer-data" element={<CustomerData />} />
            <Route
              path="daywise-customer-details"
              element={<DaywiseCustomerDetails />}
            />
            <Route path="repeated-customers" element={<RepeatedCustomers />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;