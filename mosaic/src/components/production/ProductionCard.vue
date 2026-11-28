<template>
  <button
    type="button"
    :disabled="disabled"
    @click="!disabled && $emit('open')"
    :class="[
      'w-full text-left bg-white rounded-2xl border p-5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
      disabled
        ? 'border-slate-200 bg-slate-50 opacity-75 cursor-not-allowed'
        : 'border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer',
    ]"
  >
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div
          :class="[
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
            disabled ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-900',
          ]"
        >
          <svg
            class="w-6 h-6"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z" />
            <path d="M6 17h12" />
          </svg>
        </div>

        <div class="min-w-0">
          <h2 class="text-lg font-bold text-slate-900 truncate">
            {{ title }}
          </h2>
          <p class="text-xs font-medium text-slate-600">
            Setor de Produção
          </p>
        </div>
      </div>

      <span
        :class="[
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 tabular-nums',
          disabled
            ? 'bg-slate-200 text-slate-800 border-slate-300'
            : activeOrders > 0
            ? 'bg-amber-100 text-amber-950 border-amber-300'
            : 'bg-emerald-50 text-emerald-900 border-emerald-200',
        ]"
      >
        {{
          disabled
            ? "Inativo"
            : activeOrders > 0
            ? `${activeOrders} na fila`
            : "Sem fila"
        }}
      </span>
    </div>

    <!-- Statistics -->
    <div class="grid grid-cols-3 gap-2.5 mt-5">
      <!-- Active -->
      <div class="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
        <div class="text-2xl sm:text-3xl font-bold text-blue-900 tabular-nums">
          {{ activeOrders }}
        </div>
        <div class="text-xs font-medium text-blue-950 mt-1">
          Em Preparo
        </div>
      </div>

      <!-- Served -->
      <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
        <div class="text-2xl sm:text-3xl font-bold text-emerald-900 tabular-nums">
          {{ servedOrders }}
        </div>
        <div class="text-xs font-medium text-emerald-950 mt-1">
          Servidos
        </div>
      </div>

      <!-- Total -->
      <div class="bg-slate-100 border border-slate-200 rounded-xl p-3 text-center">
        <div class="text-2xl sm:text-3xl font-bold text-slate-800 tabular-nums">
          {{ totalOrders }}
        </div>
        <div class="text-xs font-medium text-slate-700 mt-1">
          Total
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-5 border-t border-slate-100 pt-3.5 flex items-center justify-between gap-2">
      <span class="text-xs font-semibold text-slate-700">
        {{
          disabled
            ? "Setor desativado nas configurações de produção"
            : "Abrir painel de comandas deste setor"
        }}
      </span>
      <svg
        v-if="!disabled"
        class="w-4 h-4 text-blue-700 shrink-0"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </div>
  </button>
</template>

<script>
export default {
  name: "ProductionCard",

  emits: ["open"],

  props: {
    title: {
      type: String,
      required: true,
    },

    activeOrders: {
      type: Number,
      default: 0,
    },

    servedOrders: {
      type: Number,
      default: 0,
    },

    totalOrders: {
      type: Number,
      default: 0,
    },

    disabled: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
