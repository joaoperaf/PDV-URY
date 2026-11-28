import React, { useState, useEffect, useCallback } from 'react';
import { Spinner, StateMessage } from '@ury/ui';
import { getLoggedUser, getUserRoles, parseFrappeError } from '@ury/core';

interface RoleGuardProps {
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children }) => {
  const [hasRole, setHasRole] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);

  const checkUserRole = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const userId = await getLoggedUser();
      if (userId && userId !== 'Guest') {
        setIsGuest(false);
        const roles = await getUserRoles(userId);
        const userRoles = roles.roles || [];
        const hasURYManagerRole =
          userId === 'Administrator' ||
          userRoles.some(
            (role: any) =>
              role === 'URY Manager' ||
              role?.name === 'URY Manager' ||
              role === 'System Manager' ||
              role?.name === 'System Manager',
          );
        setHasRole(hasURYManagerRole);
      } else {
        setIsGuest(true);
        setHasRole(false);
      }
    } catch (err) {
      console.error('Failed to check user role', err);
      setLoadError(
        parseFrappeError(err, 'Não foi possível verificar suas permissões no momento.'),
      );
      setHasRole(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUserRole();
  }, [checkUserRole]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="flex items-center justify-center min-h-screen bg-slate-50 p-4"
      >
        <Spinner message="Verificando permissões de acesso..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <StateMessage
          variant="error"
          title="Falha ao verificar acesso ao painel"
          description={loadError}
          actionLabel="Tentar novamente"
          onAction={checkUserRole}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm"
        />
      </div>
    );
  }

  if (!hasRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <StateMessage
          variant="error"
          title={isGuest ? 'Sessão necessária' : 'Permissão necessária'}
          description={
            isGuest
              ? 'Faça login com uma conta de gestão para acessar o painel administrativo.'
              : 'Sua conta atual não possui o perfil Gerente URY (URY Manager) necessário para acessar o painel gerencial.'
          }
          actionLabel={isGuest ? 'Fazer login' : 'Entrar com outra conta'}
          onAction={() => {
            window.location.href = '/login?redirect-to=%2Fury%2Fdashboard';
          }}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm"
        />
      </div>
    );
  }

  return <>{children}</>;
};
