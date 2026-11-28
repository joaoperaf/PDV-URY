<template>
  <div class="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-5">
    <!-- Top Operational Bar -->
    <div class="bg-white rounded-2xl border border-slate-200 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
      <div class="min-w-0">
        <h1 class="text-lg sm:text-xl font-bold text-slate-900">
          Painel de Produção (KDS)
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 mt-0.5">
          Selecione um setor da cozinha para acompanhar e despachar comandas em tempo real.
        </p>
      </div>

      <div class="flex items-center gap-2.5 ms-auto">
        <div
          role="status"
          aria-live="polite"
          :class="[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border tabular-nums',
            !isOnline
              ? 'bg-red-50 text-red-900 border-red-200'
              : syncError || loadError
              ? 'bg-amber-50 text-amber-950 border-amber-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200',
          ]"
        >
          <svg
            v-if="!isOnline"
            class="w-3.5 h-3.5 text-red-700 shrink-0"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="2" x2="22" y1="2" y2="22" />
            <path d="M8.5 16.5a5 5 0 0 1 7 0" />
            <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
            <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
            <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
            <path d="M5 13a10 10 0 0 1 5.24-2.76" />
            <line x1="12" x2="12.01" y1="20" y2="20" />
          </svg>
          <svg
            v-else-if="syncError || loadError"
            class="w-3.5 h-3.5 text-amber-800 shrink-0"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <svg
            v-else
            class="w-3.5 h-3.5 text-emerald-700 shrink-0"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 20h.01" />
            <path d="M2 8.82a15 15 0 0 1 20 0" />
            <path d="M5 12.859a10 10 0 0 1 14 0" />
            <path d="M8.5 16.429a5 5 0 0 1 7 0" />
          </svg>
          <span>
            {{
              !isOnline
                ? "Sem conexão"
                : syncError || loadError
                ? "Sincronização pendente"
                : "Conectado"
            }}
          </span>
          <span v-if="lastUpdatedLabel" class="hidden sm:inline opacity-80 font-medium">
            • {{ lastUpdatedLabel }}
          </span>
        </div>

        <button
          type="button"
          :disabled="loading || refreshing"
          @click="loadDashboard({ silent: dashboard.length > 0 })"
          class="min-h-10 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <svg
            :class="['w-3.5 h-3.5', loading || refreshing ? 'motion-safe:animate-spin' : '']"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          <span>Atualizar</span>
        </button>
      </div>
    </div>

    <!-- Degraded Sync Banner when cached sectors are already rendered -->
    <div
      v-if="dashboard.length > 0 && (!isOnline || syncError)"
      role="alert"
      :class="[
        'rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm',
        !isOnline
          ? 'bg-red-50 border-red-200 text-red-950'
          : 'bg-amber-50 border-amber-200 text-amber-950',
      ]"
    >
      <div class="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
        <svg
          class="w-4 h-4 shrink-0 mt-0.5 sm:mt-0"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        <p class="font-medium">
          <strong class="font-bold">
            {{ !isOnline ? "Sem conexão com a rede:" : "Falha ao atualizar contadores:" }}
          </strong>
          {{
            !isOnline
              ? " exibindo a última posição conhecida dos setores."
              : ` ${syncError}`
          }}
        </p>
      </div>
      <button
        type="button"
        @click="loadDashboard({ silent: true })"
        class="min-h-9 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-semibold text-xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        Tentar novamente
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div
      v-if="loading && dashboard.length === 0"
      role="status"
      aria-busy="true"
      aria-live="polite"
      class="space-y-4"
    >
      <p class="text-sm font-medium text-slate-600">
        Carregando setores de produção...
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div
          v-for="idx in [1, 2, 3]"
          :key="idx"
          class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm motion-safe:animate-pulse"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl bg-slate-200"></div>
              <div class="space-y-2">
                <div class="h-5 w-32 rounded bg-slate-200"></div>
                <div class="h-3.5 w-24 rounded bg-slate-200"></div>
              </div>
            </div>
            <div class="h-6 w-20 rounded-full bg-slate-200"></div>
          </div>
          <div class="grid grid-cols-3 gap-2.5 mt-5">
            <div class="h-20 rounded-xl bg-slate-100"></div>
            <div class="h-20 rounded-xl bg-slate-100"></div>
            <div class="h-20 rounded-xl bg-slate-100"></div>
          </div>
          <div class="mt-5 pt-3.5 border-t border-slate-100">
            <div class="h-4 w-48 rounded bg-slate-200"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error / Offline / Auth State -->
    <div
      v-else-if="loadError && dashboard.length === 0"
      role="alert"
      class="flex min-h-[18rem] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm"
    >
      <div class="max-w-md text-center">
        <div
          :class="[
            'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full',
            !isOnline ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700',
          ]"
        >
          <svg
            v-if="!isOnline"
            class="h-6 w-6"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="2" x2="22" y1="2" y2="22" />
            <path d="M8.5 16.5a5 5 0 0 1 7 0" />
            <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
            <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
            <path d="M5 13a10 10 0 0 1 5.24-2.76" />
            <line x1="12" x2="12.01" y1="20" y2="20" />
          </svg>
          <svg
            v-else
            class="h-6 w-6"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        </div>

        <h2 class="text-base font-bold text-slate-900">
          {{
            !isOnline
              ? "Sem conexão com a cozinha"
              : isAuthError
              ? "Sessão necessária para acessar o KDS"
              : "Não foi possível carregar os setores de produção"
          }}
        </h2>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          {{ loadError }}
        </p>

        <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            @click="loadDashboard()"
            class="min-h-10 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Tentar novamente
          </button>

          <a
            v-if="isAuthError"
            href="/login?redirect-to=%2Fmosaic"
            class="min-h-10 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold inline-flex items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Fazer login
          </a>
        </div>
      </div>
    </div>

    <!-- Explicit Empty State (distinguished from error/offline) -->
    <div
      v-else-if="dashboard.length === 0"
      role="status"
      class="flex min-h-[18rem] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm"
    >
      <div class="max-w-md text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <svg
            class="h-6 w-6"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        </div>

        <h2 class="text-base font-bold text-slate-900">
          Nenhum setor de produção encontrado
        </h2>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          A conexão com o sistema está ativa, mas ainda não há Unidades de Produção cadastradas para esta filial.
        </p>

        <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            @click="loadDashboard()"
            class="min-h-10 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Verificar novamente
          </button>

          <a
            href="/ury/dashboard"
            class="min-h-10 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Abrir Painel Gerencial
          </a>
        </div>
      </div>
    </div>

    <!-- Production Cards -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
    >
      <ProductionCard
        v-for="unit in dashboard"
        :key="unit.name"
        :title="unit.name"
        :activeOrders="unit.active_orders"
        :servedOrders="unit.served_orders"
        :totalOrders="unit.total_orders"
        :disabled="!!unit.disable"
        @open="!unit.disable && openProduction(unit.name)"
      />
    </div>
  </div>
</template>

<script>
import ProductionCard from "./ProductionCard.vue";
import { FrappeApp } from "frappe-js-sdk";

const frappe = new FrappeApp(window.location.origin);

function extractErrorDetails(error) {
  const status = error?.httpStatus || error?.response?.status || error?.status;
  if (status === 401 || status === 403 || error?.exc_type === "PermissionError") {
    return {
      isAuth: true,
      message:
        "Faça login com um usuário autorizado da cozinha para visualizar os setores de produção.",
    };
  }
  if (!navigator.onLine) {
    return {
      isAuth: false,
      message:
        "Este dispositivo está sem acesso à rede. Verifique o Wi-Fi ou cabo da cozinha e tente novamente.",
    };
  }
  if (typeof error?._server_messages === "string") {
    try {
      const parsed = JSON.parse(error._server_messages);
      const first = JSON.parse(parsed[0]);
      if (first?.message) {
        return { isAuth: false, message: String(first.message).replace(/<[^>]+>/g, "") };
      }
    } catch {
      // Fallback below
    }
  }
  return {
    isAuth: false,
    message:
      "Não foi possível consultar os dados de produção no servidor. Verifique a conexão e tente novamente.",
  };
}

export default {
  name: "ProductionDashboard",

  components: {
    ProductionCard,
  },

  data() {
    return {
      loading: true,
      refreshing: false,
      loadError: null,
      syncError: null,
      isAuthError: false,
      isOnline: navigator.onLine,
      lastUpdatedAt: null,
      dashboard: [],
      db: frappe.db(),
      authClient: frappe.auth(),
    };
  },

  computed: {
    lastUpdatedLabel() {
      if (!this.lastUpdatedAt) return "";
      try {
        return this.lastUpdatedAt.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return "";
      }
    },
  },

  mounted() {
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    window.addEventListener("mosaic:refresh", this.handleExternalRefresh);
    this.loadDashboard();
  },

  unmounted() {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    window.removeEventListener("mosaic:refresh", this.handleExternalRefresh);
  },

  methods: {
    handleOnline() {
      this.isOnline = true;
      this.syncError = null;
      this.loadDashboard({ silent: this.dashboard.length > 0 });
    },

    handleOffline() {
      this.isOnline = false;
    },

    handleExternalRefresh() {
      this.loadDashboard({ silent: this.dashboard.length > 0 });
    },

    async loadDashboard(options = {}) {
      const silent = Boolean(options.silent);
      this.isOnline = navigator.onLine;

      if (!silent) {
        this.loading = true;
        this.loadError = null;
      } else {
        this.refreshing = true;
      }

      try {
        const user = await this.authClient.getLoggedInUser();
        if (!user || user === "Guest") {
          const authErr = new Error("Not authenticated");
          authErr.httpStatus = 403;
          throw authErr;
        }

        const result = await this.db.getDocList("URY Production Unit", {
          fields: ["name", "disable"],
          orderBy: {
            field: "name",
            order: "asc",
          },
        });

        const units = result || [];

        await Promise.all(
          units.map(async (unit) => {
            const [active, served, total] = await Promise.all([
              this.db.getCount("URY KOT", [
                ["production", "=", unit.name],
                ["docstatus", "=", 1],
                ["order_status", "=", "Ready For Prepare"],
              ]),
              this.db.getCount("URY KOT", [
                ["production", "=", unit.name],
                ["docstatus", "=", 1],
                ["order_status", "=", "Served"],
              ]),
              this.db.getCount("URY KOT", [
                ["production", "=", unit.name],
                ["docstatus", "=", 1],
              ]),
            ]);

            unit.active_orders = active;
            unit.served_orders = served;
            unit.total_orders = total;
          })
        );

        this.dashboard = units;
        this.loadError = null;
        this.syncError = null;
        this.isAuthError = false;
        this.lastUpdatedAt = new Date();
      } catch (error) {
        console.error("Failed to load KDS Production Dashboard:", error);
        const details = extractErrorDetails(error);
        this.isAuthError = details.isAuth;
        if (silent && this.dashboard.length > 0) {
          this.syncError = details.message;
        } else {
          this.loadError = details.message;
        }
      } finally {
        this.loading = false;
        this.refreshing = false;
      }
    },

    openProduction(productionName) {
      this.$router.push(`/${encodeURIComponent(productionName)}`);
    },
  },
};
</script>
