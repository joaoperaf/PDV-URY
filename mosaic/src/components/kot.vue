<template>
  <div class="max-w-7xl mx-auto px-3 sm:px-6 py-4 mb-16 relative space-y-4">
    <!-- Auth / Permission Modal -->
    <div
      v-if="showModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mosaic-auth-title"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-red-50 text-red-700 flex items-center justify-center shrink-0">
            <svg
              class="w-5 h-5"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 id="mosaic-auth-title" class="text-lg font-bold text-slate-900">
            Sessão necessária no KDS
          </h2>
        </div>

        <p class="text-sm leading-6 text-slate-600 mt-4">
          Faça login com um usuário autorizado para visualizar e confirmar as comandas do setor
          <strong class="text-slate-900">{{ production }}</strong>.
        </p>

        <div class="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            @click="reconnectAndSync"
            class="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Tentar novamente
          </button>
          <button
            type="button"
            @click="
              showModal = false;
              redirectToLogin();
            "
            class="min-h-10 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Entrar
          </button>
        </div>
      </div>
    </div>

    <!-- KOT Delay Error Alert Banner (SVG + Explicit Text, no emoji dependency) -->
    <div
      v-if="showKotErrorAlert && kotErrorAlert"
      role="alert"
      class="fixed top-0 left-0 right-0 p-3 sm:p-4 bg-red-50 border-b-2 border-red-600 shadow-lg z-40 flex justify-between items-center gap-3"
    >
      <div class="flex items-start sm:items-center gap-3 min-w-0">
        <div class="w-9 h-9 rounded-full bg-red-100 text-red-800 flex items-center justify-center shrink-0">
          <svg
            class="w-5 h-5"
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
        </div>
        <div class="min-w-0">
          <p class="font-bold text-red-900 text-sm sm:text-base">
            Alerta de Atraso na Cozinha
          </p>
          <p class="text-red-950 text-xs sm:text-sm mt-0.5 tabular-nums">
            <span v-if="!daily_order_number && kotErrorAlert.invoice">
              Conta: #{{ kotErrorAlert.invoice.slice(-4) }}
            </span>
            <span v-else>Pedido nº: {{ kotErrorAlert.order_no }}</span>
            • Canal: {{ kotErrorAlert.tableortakeaway }} • Hora: {{ kotErrorAlert.timestamp }}
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-label="Fechar alerta de atraso"
        @click="hideKotErrorAlert"
        class="h-10 w-10 rounded-lg text-red-900 hover:bg-red-100 flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
      >
        <svg
          class="w-5 h-5"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>

    <!-- Station Top Operational Bar -->
    <div class="bg-white rounded-2xl border border-slate-200 px-3.5 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
      <div class="flex items-center gap-3 min-w-0">
        <router-link
          to="/"
          aria-label="Voltar para lista de setores"
          class="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <svg
            class="w-4 h-4"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </router-link>

        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-base sm:text-lg font-bold text-slate-900 truncate">
              Setor: {{ production }}
            </h1>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 tabular-nums">
              {{ visibleKots.length }} em preparo
            </span>
          </div>
          <p class="text-xs text-slate-600 truncate mt-0.5">
            {{ branch ? `Filial: ${branch} • ` : "" }}Clique ou pressione Enter no cabeçalho da comanda para abrir a ação.
          </p>
        </div>
      </div>

      <!-- Realtime & Network Health Pill + Reconnect/Sync Button -->
      <div class="flex items-center gap-2 ms-auto">
        <div
          role="status"
          aria-live="polite"
          :class="[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border tabular-nums',
            !isOnline
              ? 'bg-red-50 text-red-900 border-red-200'
              : isRealtimeCompromised
              ? 'bg-amber-50 text-amber-950 border-amber-200'
              : socketStatus === 'connecting'
              ? 'bg-slate-100 text-slate-800 border-slate-200'
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
            <path d="M5 13a10 10 0 0 1 5.24-2.76" />
            <line x1="12" x2="12.01" y1="20" y2="20" />
          </svg>
          <svg
            v-else-if="isRealtimeCompromised"
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
          <span>{{ connectionLabel }}</span>
          <span v-if="lastSyncedLabel" class="hidden md:inline opacity-80 font-medium">
            • {{ lastSyncedLabel }}
          </span>
        </div>

        <button
          type="button"
          :disabled="loadingKots || reconnecting"
          @click="reconnectAndSync"
          class="min-h-10 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <svg
            :class="['w-3.5 h-3.5', loadingKots || reconnecting ? 'motion-safe:animate-spin' : '']"
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
          <span>{{ isRealtimeCompromised || !isOnline ? "Reconectar" : "Atualizar" }}</span>
        </button>
      </div>
    </div>

    <!-- Audio Alert Activation Prompt -->
    <div
      v-if="showAudioAlertMessage"
      role="status"
      class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-950"
    >
      <div class="flex items-center gap-2.5">
        <svg
          class="w-4 h-4 text-amber-800 shrink-0"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="22" x2="16" y1="9" y2="15" />
          <line x1="16" x2="22" y1="9" y2="15" />
        </svg>
        <span class="font-medium">
          Alertas sonoros desativados pelo navegador. Clique em qualquer área da tela para ativar o som.
        </span>
      </div>
    </div>

    <!-- Recoverable Connection / Action Warning Banner -->
    <div
      v-if="(!loadError || visibleKots.length > 0) && (!isOnline || isRealtimeCompromised)"
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
        <div class="min-w-0">
          <p class="font-bold">
            {{
              !isOnline
                ? "Cozinha offline — atualização em tempo real interrompida"
                : "Atualização em tempo real comprometida"
            }}
          </p>
          <p class="mt-0.5">
            {{
              !isOnline
                ? "Verifique a rede local. Os pedidos na tela permanecem visíveis até reconectar."
                : syncWarning ||
                  "A conexão instantânea (socket) caiu; buscando atualizações em segundo plano."
            }}
          </p>
        </div>
      </div>

      <button
        type="button"
        :disabled="reconnecting"
        @click="reconnectAndSync"
        class="min-h-9 px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-semibold text-xs hover:bg-slate-50 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        {{ reconnecting ? "Reconectando..." : "Reconectar agora" }}
      </button>
    </div>

    <!-- Loading Skeleton State -->
    <div
      v-if="loadingKots && visibleKots.length === 0"
      role="status"
      aria-busy="true"
      aria-live="polite"
      class="space-y-4"
    >
      <p class="text-sm font-medium text-slate-600">
        Carregando comandas ativas de {{ production }}...
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <div
          v-for="idx in [1, 2, 3, 4]"
          :key="idx"
          class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm motion-safe:animate-pulse space-y-3"
        >
          <div class="flex justify-between items-center">
            <div class="h-5 w-28 rounded bg-slate-200"></div>
            <div class="h-6 w-16 rounded bg-slate-200"></div>
          </div>
          <div class="h-4 w-36 rounded bg-slate-200"></div>
          <div class="border-t border-slate-100 pt-3 space-y-2.5">
            <div class="h-4 w-full rounded bg-slate-200"></div>
            <div class="h-4 w-4/5 rounded bg-slate-200"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error / Offline State (when no cached KOTs are available) -->
    <div
      v-else-if="loadError && visibleKots.length === 0"
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
              ? "Sem conexão com o servidor da cozinha"
              : "Não foi possível carregar as comandas"
          }}
        </h2>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          {{ loadError }}
        </p>

        <button
          type="button"
          @click="reconnectAndSync"
          class="mt-5 min-h-10 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          Tentar novamente
        </button>
      </div>
    </div>

    <!-- Explicit Empty State (clearly distinguished from error/offline) -->
    <div
      v-else-if="visibleKots.length === 0"
      role="status"
      class="flex min-h-[18rem] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm"
    >
      <div class="max-w-md text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
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
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="m9 11 3 3L22 4" />
          </svg>
        </div>

        <h2 class="text-base font-bold text-slate-900">
          Nenhum pedido ativo para {{ production }}
        </h2>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          {{
            !isOnline
              ? "Nenhum pedido estava na fila na última sincronização. Reconecte à rede para receber novas comandas."
              : isRealtimeCompromised
              ? "Nenhuma comanda na fila. Consultando atualizações em segundo plano enquanto a conexão instantânea reconecta."
              : "A conexão com o PDV está ativa. Assim que uma nova comanda for enviada para este setor, ela aparecerá automaticamente aqui."
          }}
        </p>

        <button
          type="button"
          @click="reconnectAndSync"
          class="mt-5 min-h-10 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          Verificar novamente
        </button>
      </div>
    </div>

    <!-- KOT Masonry / Responsive Grid -->
    <div
      v-show="visibleKots.length > 0"
      class="grid grid-cols-1 gap-5 sm:block"
    >
      <template v-for="kotItem in kot" :key="kotItem.name">
        <article
          v-if="!kotItem.showDiv && kotItem.production === production"
          :class="[kotItem.color]"
          class="relative shadow-sm p-4 rounded-2xl w-full sm:w-[295px] h-auto masonry-item sm:mb-6 transition-shadow"
        >
          <div class="w-full check">
            <!-- Action Overlay (preserved isRotated UX + accessible button) -->
            <div
              :class="[{ hidden: !kotItem.isRotated }]"
              @click="rotateCard(kotItem)"
              class="absolute inset-0 bg-white/95 z-30 rounded-2xl flex flex-col justify-center items-center gap-3 p-4"
            >
              <button
                type="button"
                :disabled="actionLoadingName === kotItem.name"
                @click.stop="
                  kotItem.type === 'Cancelled' || kotItem.type === 'Partially cancelled'
                    ? confirmOrder(kotItem)
                    : serveOrder(kotItem)
                "
                :class="[
                  { hidden: !kotItem.isRotated },
                  kotItem.type === 'Cancelled' || kotItem.type === 'Partially cancelled'
                    ? 'bg-red-700 hover:bg-red-800'
                    : 'bg-emerald-700 hover:bg-emerald-800',
                ]"
                class="min-h-11 py-2.5 px-6 text-white font-bold rounded-xl shadow-sm disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                {{
                  actionLoadingName === kotItem.name
                    ? "Processando..."
                    : kotItem.type === "Cancelled" || kotItem.type === "Partially cancelled"
                    ? "Confirmar Cancelamento"
                    : "Servir / Pronto"
                }}
              </button>
              <span class="text-xs font-medium text-slate-600">
                Toque fora para voltar aos itens
              </span>
            </div>

            <!-- Card Header: Channel/Table, Order Number, Status Badge and Elapsed Time -->
            <div
              role="button"
              tabindex="0"
              :aria-expanded="kotItem.isRotated ? 'true' : 'false'"
              @click="rotateCard(kotItem)"
              @keydown.enter.prevent="rotateCard(kotItem)"
              @keydown.space.prevent="rotateCard(kotItem)"
              class="flex justify-between items-start gap-2 cursor-pointer rounded-lg p-1 -m-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <div class="text-sm min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-base font-extrabold text-slate-900 tabular-nums">
                    #{{ daily_order_number ? kotItem.order_no : (kotItem.invoice || "").slice(-4) }}
                  </span>

                  <span
                    v-if="kotItem.type === 'Cancelled' || kotItem.type === 'Partially cancelled'"
                    class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-700 text-white"
                  >
                    {{ kotItem.type === "Cancelled" ? "CANCELADO" : "CANCEL. PARCIAL" }}
                  </span>
                  <span
                    v-else-if="kotItem.isDelayed"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-700 text-white"
                  >
                    <svg
                      class="w-3 h-3 shrink-0"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <path d="M12 9v4" />
                      <path d="M12 17h.01" />
                    </svg>
                    ATRASADO
                  </span>
                  <span
                    v-else-if="kotItem.type === 'Order Modified'"
                    class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-800 text-white"
                  >
                    MODIFICADO
                  </span>
                </div>

                <div class="mt-1 text-xs text-slate-800">
                  <span
                    v-if="kotItem.tableortakeaway !== 'Takeaway' && kotItem.tableortakeaway !== 'Para Viagem'"
                    class="font-medium text-slate-700"
                  >
                    Mesa:
                  </span>
                  <span class="font-semibold text-slate-900">
                    {{ kotItem.tableortakeaway === "Takeaway" ? "Para Viagem" : kotItem.tableortakeaway }}
                  </span>
                  <span v-if="kotItem.user" class="text-slate-700">
                    ({{ kotItem.user }})
                  </span>
                </div>

                <div v-if="kotItem.is_aggregator" class="mt-0.5 text-xs text-slate-800">
                  <span class="font-medium text-slate-700">App:</span>
                  <span class="ml-1 font-semibold text-slate-900">{{ kotItem.customer_name }}</span>
                  <span v-if="kotItem.aggregator_id" class="ml-1 text-slate-700 tabular-nums">
                    • ID {{ kotItem.aggregator_id }}
                  </span>
                </div>
              </div>

              <div
                :class="kotItem.timecolor"
                class="font-bold text-lg sm:text-xl leading-7 tabular-nums shrink-0 px-2 py-0.5 rounded-lg bg-white/80 border border-slate-200/80"
              >
                {{ kotItem.timeRemaining }}
              </div>
            </div>

            <div
              v-if="kotItem.type === 'Duplicate'"
              class="mt-2 px-2.5 py-1 rounded-lg bg-red-100 border border-red-300 text-xs text-red-950 font-bold"
            >
              KOT Duplicado — verificar antes de preparar
            </div>

            <div
              v-show="kotItem.comments"
              class="mt-2 px-2.5 py-1.5 rounded-lg bg-white/80 border border-slate-300/80 text-xs text-slate-900 font-medium"
            >
              <strong>Obs:</strong> {{ kotItem.comments }}
            </div>

            <!-- Items List -->
            <div class="mt-3 divide-y divide-slate-200/80 border-t border-slate-200/80 pt-1">
              <div
                class="py-2"
                v-for="kotLine in sortedKotItems(kotItem)"
                :key="kotLine.name"
              >
                <button
                  type="button"
                  role="checkbox"
                  :aria-checked="kotLine.striked ? 'true' : 'false'"
                  @click="toggleItemStrikeThrough(kotLine, kotItem)"
                  :class="{
                    'line-through text-emerald-900 opacity-65': kotLine.striked,
                  }"
                  class="w-full min-h-10 text-left flex font-semibold justify-between items-start gap-2 rounded-md px-1.5 py-1 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <div class="min-w-0 flex-1">
                    <span class="text-sm font-bold text-slate-900">
                      {{ kotLine.item_name }}
                      <span
                        v-show="kotLine.indicate_course"
                        class="text-xs font-medium text-slate-700 ml-1"
                      >
                        ({{ kotLine.course }})
                      </span>
                    </span>
                    <div
                      v-if="
                        kotItem.type === 'Partially cancelled' ||
                        kotItem.type === 'Cancelled'
                      "
                      class="text-xs font-medium text-red-900 mt-0.5 tabular-nums"
                    >
                      Qtd. anterior: {{ kotLine.quantity }}
                    </div>
                  </div>
                  <span class="text-sm font-extrabold text-slate-900 tabular-nums shrink-0">
                    {{ kotLine.qty }}x
                  </span>
                </button>

                <p
                  v-show="kotLine.comments"
                  class="mt-1 ml-1.5 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-xs text-amber-950 font-medium"
                >
                  Obs: {{ kotLine.comments }}
                </p>
              </div>
            </div>
          </div>
        </article>
      </template>
    </div>

    <!-- Transient Toast Notification -->
    <div
      v-if="statusMessage"
      role="status"
      aria-live="polite"
      :class="[
        'fixed bottom-6 right-6 z-40 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white',
        isOnline ? 'bg-emerald-700' : 'bg-red-700',
      ]"
    >
      {{ statusMessage }}
    </div>
  </div>
</template>

<script>
import { FrappeApp } from "frappe-js-sdk";
import Masonry from "masonry-layout";
import io from "socket.io-client";

const host = window.location.hostname;
const port = window.location.port;
const protocol = window.location.protocol;
const url = port ? `${protocol}//${host}:${port}` : `${protocol}//${host}`;
window.globalSiteName = "";
window.globalSocketioPort = null;
let socket = null;

async function fetchAndSetSiteName() {
  if (window.globalSiteName) {
    return {
      siteName: window.globalSiteName,
      socketioPort: window.globalSocketioPort,
    };
  }
  try {
    const response = await fetch("/api/method/ury.ury.api.ury_kot_display.get_site_name", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    window.globalSiteName = data?.message?.site_name || "";
    window.globalSocketioPort = data?.message?.socketio_port || null;
    return {
      siteName: window.globalSiteName,
      socketioPort: window.globalSocketioPort,
    };
  } catch (error) {
    console.error("Failed to fetch site name:", error);
    return { siteName: "", socketioPort: null };
  }
}

async function ensureSharedSocket() {
  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }
  const { siteName: site, socketioPort } = await fetchAndSetSiteName();
  if (!site) {
    throw new Error("Site name is not set. Socket cannot be initialized.");
  }
  const useDirectSocketPort =
    Boolean(port) && port !== "80" && port !== "443" && Boolean(socketioPort);
  const effectivePort = useDirectSocketPort ? String(socketioPort) : port;
  const socketBaseUrl = effectivePort
    ? `${protocol}//${host}:${effectivePort}`
    : `${protocol}//${host}`;
  const siteUrl = `${socketBaseUrl}/${site}`;
  socket = io(siteUrl, { withCredentials: true });
  return socket;
}

const frappe = new FrappeApp(url);

function parseKotApiError(error, fallback) {
  if (!navigator.onLine) {
    return "Este dispositivo está sem acesso à rede. Verifique o Wi-Fi ou cabo da cozinha e tente novamente.";
  }
  if (typeof error?._server_messages === "string") {
    try {
      const parsed = JSON.parse(error._server_messages);
      const first = JSON.parse(parsed[0]);
      if (first?.message) {
        return String(first.message).replace(/<[^>]+>/g, "");
      }
    } catch {
      // Fallback below
    }
  }
  return fallback;
}

export default {
  props: ["production"],
  data() {
    return {
      kot: [],
      masonry: null,
      call: frappe.call(),
      branch: "",
      kot_channel: "",
      kot_error_channel: "",
      subscribedKotChannel: "",
      subscribedErrorChannel: "",
      clickedItems: new Set(),
      struckThroughItems: {},
      loggeduser: "",
      showModal: false,
      kot_alert_time: 15,
      showAudioAlertMessage: false,
      audio_alert: 0,
      isOnline: navigator.onLine,
      socketStatus: "connecting",
      statusMessage: "",
      daily_order_number: 0,
      loadingKots: true,
      reconnecting: false,
      loadError: null,
      syncWarning: null,
      lastSyncedAt: null,
      actionLoadingName: null,
      kotErrorAlert: null,
      showKotErrorAlert: false,
      timeIntervalId: null,
      fallbackSyncIntervalId: null,
    };
  },
  computed: {
    visibleKots() {
      return this.kot.filter(
        (k) => !k.showDiv && k.production === this.production
      );
    },
    isRealtimeCompromised() {
      return (
        Boolean(this.syncWarning) ||
        this.socketStatus === "disconnected" ||
        this.socketStatus === "error"
      );
    },
    connectionLabel() {
      if (!this.isOnline) return "Sem conexão";
      if (this.isRealtimeCompromised) return "Tempo real instável";
      if (this.socketStatus === "connecting") return "Conectando…";
      return "Tempo real ativo";
    },
    lastSyncedLabel() {
      if (!this.lastSyncedAt) return "";
      try {
        return this.lastSyncedAt.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return "";
      }
    },
    sortedKotItems() {
      return (kot) => {
        return [...(kot.kot_items || [])].sort(
          (a, b) => (a.serve_priority || 0) - (b.serve_priority || 0)
        );
      };
    },
  },
  watch: {
    production() {
      this.reconnectAndSync();
    },
  },
  methods: {
    playAlertSound(path) {
      if (!path) return;
      const currentDomain = window.location.origin;
      const audioPath = currentDomain + path;
      const audio = new Audio(audioPath);
      audio.play().catch(() => {
        // Ignore browser autoplay block if user has not interacted yet
      });
    },
    auth() {
      return new Promise((resolve, reject) => {
        const auth = frappe.auth();
        auth
          .getLoggedInUser()
          .then((user) => {
            if (!user || user === "Guest") {
              reject(new Error("Guest session"));
              return;
            }
            this.loggeduser = user;
            this.showModal = false;
            resolve(user);
          })
          .catch((error) => {
            console.error(error);
            reject(error);
          });
      });
    },
    fetchKOT(options = {}) {
      const silent = Boolean(options.silent);
      if (!silent) {
        this.loadingKots = true;
        this.loadError = null;
      }

      return new Promise((resolve, reject) => {
        try {
          this.call
            .get("ury.ury.api.ury_kot_display.kot_list", {})
            .then((result) => {
              const message = result?.message || {};
              this.branch = message.Branch || "";
              this.kot_alert_time = Number(message.kot_alert_time) || 15;
              this.audio_alert = message.audio_alert;
              this.daily_order_number = message.daily_order_number;
              this.kot_channel = `kot_update_${this.branch}_${this.production}`;
              this.kot_error_channel = `kot_error_${this.branch}_${this.production}`;
              this.kot = Array.isArray(message.KOT) ? message.KOT : [];
              this.loadingKots = false;
              this.loadError = null;
              this.syncWarning = null;
              this.lastSyncedAt = new Date();
              this.updateQtyColorTable();
              this.updateTimeRemaining();
              this.masonryLoading();
              resolve();
            })
            .catch((error) => {
              console.error("Failed to load KOT list:", error);
              this.loadingKots = false;
              const errMsg = parseKotApiError(
                error,
                "Não foi possível carregar os pedidos deste setor. Verifique a conexão com o servidor e tente novamente."
              );
              if (silent && this.visibleKots.length > 0) {
                this.syncWarning = errMsg;
              } else {
                this.loadError = errMsg;
              }
              reject(error);
            });
        } catch (error) {
          this.loadingKots = false;
          this.loadError =
            "Erro inesperado ao consultar as comandas da cozinha.";
          reject(error);
        }
      });
    },
    handleSocketConnect() {
      this.socketStatus = "connected";
      this.syncWarning = null;
    },
    handleSocketDisconnect() {
      this.socketStatus = "disconnected";
    },
    handleSocketError(err) {
      console.error("Socket connection error:", err);
      this.socketStatus = "error";
    },
    handleKotChannelUpdate(doc) {
      if (!doc || !doc.kot) return;
      if (this.audio_alert === 1) {
        this.playAlertSound(doc.audio_file);
      }
      const kottime = localStorage.getItem("kot_time");
      if (doc.last_kot_time !== null && doc.last_kot_time !== kottime) {
        this.fetchKOT({ silent: true }).catch(() => {});
      }
      this.kot.unshift(doc.kot);
      this.lastSyncedAt = new Date();
      this.updateQtyColorTable();
      this.updateTimeRemaining();
      this.masonryLoading();
      setTimeout(() => {
        if (doc.kot.type === "Cancelled") {
          this.fetchKOT({ silent: true }).catch(() => {});
        }
      }, 1500);
      if (doc.kot.time) {
        localStorage.setItem("kot_time", doc.kot.time);
      }
    },
    handleKotErrorChannel(doc) {
      if (!doc) return;
      const matchingKot = this.kot.find((k) => k.name === doc.kot);
      this.kotErrorAlert = {
        invoice: doc.invoice || "",
        tableortakeaway:
          matchingKot?.tableortakeaway === "Takeaway"
            ? "Para Viagem"
            : matchingKot?.tableortakeaway || "Informação indisponível",
        order_no: matchingKot?.order_no || "N/D",
        timestamp: new Date().toLocaleTimeString("pt-BR"),
      };
      this.showKotErrorAlert = true;
      setTimeout(() => {
        this.hideKotErrorAlert();
      }, 8000);
    },
    detachSocketListeners() {
      if (!socket) return;
      socket.off("connect", this.handleSocketConnect);
      socket.off("disconnect", this.handleSocketDisconnect);
      socket.off("connect_error", this.handleSocketError);
      if (this.subscribedKotChannel) {
        socket.off(this.subscribedKotChannel, this.handleKotChannelUpdate);
        this.subscribedKotChannel = "";
      }
      if (this.subscribedErrorChannel) {
        socket.off(this.subscribedErrorChannel, this.handleKotErrorChannel);
        this.subscribedErrorChannel = "";
      }
    },
    async connectSocketAndSubscribe() {
      try {
        this.socketStatus = socket?.connected ? "connected" : "connecting";
        const activeSocket = await ensureSharedSocket();
        this.detachSocketListeners();

        activeSocket.on("connect", this.handleSocketConnect);
        activeSocket.on("disconnect", this.handleSocketDisconnect);
        activeSocket.on("connect_error", this.handleSocketError);
        this.socketStatus = activeSocket.connected ? "connected" : "connecting";

        if (this.kot_channel) {
          activeSocket.on(this.kot_channel, this.handleKotChannelUpdate);
          this.subscribedKotChannel = this.kot_channel;
        }
        if (this.kot_error_channel) {
          activeSocket.on(this.kot_error_channel, this.handleKotErrorChannel);
          this.subscribedErrorChannel = this.kot_error_channel;
        }
      } catch (error) {
        console.error("Realtime socket setup failed:", error);
        this.socketStatus = "error";
      }
    },
    async initializeBoard(options = {}) {
      const silent = Boolean(options.silent);
      this.isOnline = navigator.onLine;
      try {
        await this.auth();
      } catch (error) {
        console.error("Authentication error:", error);
        this.loadingKots = false;
        this.showModal = true;
        return;
      }

      try {
        await this.fetchKOT({ silent });
        if (this.audio_alert === 1 && !silent) {
          this.showAudioAlertMessage = true;
        }
      } catch {
        // Error state already populated by fetchKOT
      }

      await this.connectSocketAndSubscribe();
    },
    async reconnectAndSync() {
      this.reconnecting = true;
      this.isOnline = navigator.onLine;
      try {
        await this.initializeBoard({ silent: this.visibleKots.length > 0 });
      } finally {
        this.reconnecting = false;
      }
    },
    rotateCard(kot) {
      kot.isRotated = !kot.isRotated;
      this.masonryLoading();
    },
    confirmOrder(kot) {
      this.actionLoadingName = kot.name;
      this.call
        .post("ury.ury.api.ury_kot_display.confirm_cancel_kot", {
          name: kot.name,
        })
        .then(() => {
          kot.showDiv = true;
          this.syncWarning = null;
          this.removeAllItemsFromLocalStorage(kot);
          this.masonryLoading();
        })
        .catch((error) => {
          console.error(error);
          this.syncWarning = parseKotApiError(
            error,
            "Não foi possível confirmar o cancelamento da comanda. Verifique sua permissão ou conexão."
          );
        })
        .finally(() => {
          this.actionLoadingName = null;
        });
    },
    serveOrder(kot) {
      const now = new Date();
      this.currentTime = now.toLocaleTimeString();
      this.actionLoadingName = kot.name;

      this.call
        .post("ury.ury.api.ury_kot_display.serve_kot", {
          name: kot.name,
          time: this.currentTime,
        })
        .then(() => {
          kot.showDiv = true;
          this.syncWarning = null;
          this.removeAllItemsFromLocalStorage(kot);
          this.masonryLoading();
        })
        .catch((error) => {
          console.error(error);
          this.syncWarning = parseKotApiError(
            error,
            "Não foi possível marcar a comanda como servida. Tente novamente."
          );
        })
        .finally(() => {
          this.actionLoadingName = null;
        });
    },
    orderDelayNotify(kot) {
      this.call
        .post("ury.ury.api.ury_kot_notification.order_delay_notification", {
          id: kot.name,
        })
        .catch((error) => console.error(error));
    },
    toggleItemStrikeThrough(kotitem, kot) {
      kotitem.striked = !kotitem.striked;
      localStorage.setItem(
        `${kot.name}_${kotitem.name}_strike`,
        JSON.stringify(kotitem.striked)
      );
    },
    updateColorandTable(
      kot,
      restaurant_table,
      type,
      table_takeaway,
      custom_merged_tables
    ) {
      if (restaurant_table === undefined || restaurant_table === null || restaurant_table === "") {
        kot.tableortakeaway = "Takeaway";
      } else if (table_takeaway == 1) {
        kot.tableortakeaway = "Takeaway";
      } else {
        let label = restaurant_table;
        if (custom_merged_tables) {
          const partners = custom_merged_tables
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean);
          if (partners.length) {
            label = [restaurant_table, ...partners].join(" + ");
          }
        }
        kot.tableortakeaway = label;
      }

      if (type === "Order Modified") {
        kot.color = "bg-[#FFD493] border border-[#E5A900]";
      } else if (type === "Partially cancelled" || type === "Cancelled") {
        kot.color = "bg-[#FFD2D2] border border-[#E07A7A]";
      } else if (!restaurant_table || table_takeaway == 1) {
        kot.color = "bg-blue-100 border border-blue-200";
      } else {
        kot.color = "bg-white border border-slate-200";
      }
    },
    updateQtyColorTable() {
      this.kot.forEach((kot) => {
        this.updateColorandTable(
          kot,
          kot.restaurant_table,
          kot.type,
          kot.table_takeaway,
          kot.custom_merged_tables
        );

        (kot.kot_items || []).forEach((kotitem) => {
          const savedState = localStorage.getItem(
            `${kot.name}_${kotitem.name}_strike`
          );
          if (savedState) {
            kotitem.striked = JSON.parse(savedState);
          }
          this.calculateQty(
            kotitem,
            kotitem.quantity,
            kot.type,
            kotitem.cancelled_qty
          );
        });
      });
    },
    calculateQty(kotitem, qty, type, cancelled_qty) {
      kotitem.qty = qty;
      if (type === "Partially cancelled" || type === "Cancelled") {
        kotitem.qty = qty - (cancelled_qty || 0);
      }
    },
    removeAllItemsFromLocalStorage(kot) {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(`${kot.name}_`)) {
          localStorage.removeItem(key);
        }
      });
    },
    updateTimeRemaining() {
      const alertThreshold = Number(this.kot_alert_time) || 15;
      this.kot.forEach((kot) => {
        kot.timeRemaining = this.calculateTimeRemaining(kot.time);

        const parts = kot.timeRemaining.split(":");
        const minutes =
          (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);

        const isCancelled =
          kot.type === "Cancelled" || kot.type === "Partially cancelled";

        if (minutes === alertThreshold && !isCancelled) {
          this.orderDelayNotify(kot);
        }
        if (minutes >= alertThreshold && !isCancelled) {
          kot.isDelayed = true;
          kot.timecolor = "text-[#B91C1C]";
        } else {
          kot.isDelayed = false;
          kot.timecolor = "text-slate-900";
        }
      });
    },
    calculateTimeRemaining(targetTime) {
      if (!targetTime || typeof targetTime !== "string") {
        return "00:00";
      }
      const currentTime = new Date();
      const [targetHours, targetMinutes, targetSeconds] = targetTime
        .split(":")
        .map((v) => parseInt(v, 10) || 0);
      const targetDate = new Date(
        currentTime.getFullYear(),
        currentTime.getMonth(),
        currentTime.getDate(),
        targetHours,
        targetMinutes,
        targetSeconds
      );

      const timeDifference = Math.max(0, currentTime - targetDate);
      const hoursElapsed = Math.floor(timeDifference / 3600000);
      const minutesElapsed = Math.floor((timeDifference % 3600000) / 60000);

      const hh = String(hoursElapsed).padStart(2, "0");
      const mm = String(minutesElapsed).padStart(2, "0");
      return `${hh}:${mm}`;
    },
    redirectToLogin() {
      const currentDomain = window.location.origin;
      window.location.href =
        currentDomain + "/login?redirect-to=mosaic/" + encodeURIComponent(this.production);
    },
    masonryLoading() {
      this.$nextTick(() => {
        const gridEl = this.$el?.querySelector?.(".grid");
        if (!gridEl) return;

        // On narrow mobile viewports (< 640px), stack cards naturally in 1 column
        // so Masonry never forces fixed pixel left offsets or horizontal overflow.
        if (window.innerWidth < 640) {
          if (this.masonry) {
            this.masonry.destroy();
            this.masonry = null;
          }
          return;
        }

        if (this.visibleKots.length === 0) {
          if (this.masonry) {
            this.masonry.destroy();
            this.masonry = null;
          }
          return;
        }

        this.masonry = new Masonry(gridEl, {
          itemSelector: ".masonry-item",
          gutter: 24,
        });
        this.masonry.layout();
      });
    },
    hideAudioAlertMessage() {
      this.showAudioAlertMessage = false;
    },
    hideKotErrorAlert() {
      this.showKotErrorAlert = false;
      this.kotErrorAlert = null;
    },
    handleKeydown(event) {
      if (event.key === "Escape") {
        let changed = false;
        this.kot.forEach((k) => {
          if (k.isRotated) {
            k.isRotated = false;
            changed = true;
          }
        });
        if (changed) this.masonryLoading();
        if (this.showKotErrorAlert) this.hideKotErrorAlert();
      }
    },
    handleOnline() {
      this.isOnline = true;
      this.setStatusMessage("Conexão restabelecida");
      this.hideStatusMessageAfterDelay();
      this.reconnectAndSync();
    },
    handleOffline() {
      this.isOnline = false;
      this.socketStatus = "disconnected";
      this.setStatusMessage("Sem conexão com a rede");
      this.hideStatusMessageAfterDelay();
    },
    setStatusMessage(message) {
      this.statusMessage = message;
    },
    hideStatusMessageAfterDelay() {
      setTimeout(() => {
        this.statusMessage = "";
      }, 3500);
    },
  },
  mounted() {
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    window.addEventListener("resize", this.masonryLoading);
    window.addEventListener("mosaic:refresh", this.reconnectAndSync);
    document.addEventListener("click", this.hideAudioAlertMessage);
    document.addEventListener("keydown", this.handleKeydown);

    this.initializeBoard();

    this.timeIntervalId = setInterval(() => {
      this.updateTimeRemaining();
    }, 60000);

    // Fallback polling when realtime socket is compromised so kitchen does not stall
    this.fallbackSyncIntervalId = setInterval(() => {
      if (this.isOnline && this.isRealtimeCompromised && !this.showModal) {
        this.fetchKOT({ silent: true }).catch(() => {});
      }
    }, 15000);
  },
  unmounted() {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    window.removeEventListener("resize", this.masonryLoading);
    window.removeEventListener("mosaic:refresh", this.reconnectAndSync);
    document.removeEventListener("click", this.hideAudioAlertMessage);
    document.removeEventListener("keydown", this.handleKeydown);
    if (this.timeIntervalId) clearInterval(this.timeIntervalId);
    if (this.fallbackSyncIntervalId) clearInterval(this.fallbackSyncIntervalId);
    if (this.masonry) {
      this.masonry.destroy();
      this.masonry = null;
    }
    this.detachSocketListeners();
  },
};
</script>
