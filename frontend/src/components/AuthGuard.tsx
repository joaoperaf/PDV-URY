import { Spinner, StateMessage } from '@ury/ui';
import { useAuth } from '../store/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading, error, isManager } = useAuth();

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" className="min-h-[60vh] flex items-center justify-center">
        <Spinner message="Carregando permissões..." />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <StateMessage
          variant="error"
          title="Acesso não autenticado"
          description={error || 'Faça login para visualizar os relatórios gerenciais.'}
          actionLabel="Fazer login"
          onAction={() => {
            window.location.href = '/login?redirect-to=%2Fury%2Freports';
          }}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm"
        />
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <StateMessage
          variant="error"
          title="Permissão necessária"
          description="Os relatórios gerenciais são restritos a usuários com perfil de Gerente URY."
          actionLabel="Voltar ao PDV"
          onAction={() => {
            window.location.href = '/pos/pos';
          }}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm"
        />
      </div>
    );
  }

  return <>{children}</>;
}
