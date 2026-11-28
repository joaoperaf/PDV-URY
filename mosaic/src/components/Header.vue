<template>
  <header class="bg-white px-3 sm:px-6 py-3 flex justify-between items-center gap-3 border-b border-slate-200">
    <router-link
      to="/"
      class="flex items-center cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
    >
      <img
        :src="imagePath"
        alt="Péricles Burger"
        class="w-32 sm:w-40 h-auto max-h-10"
      />
    </router-link>

    <div class="flex items-center gap-2 sm:gap-3">
      <button
        type="button"
        aria-label="Sincronizar comandas"
        title="Sincronizar comandas"
        class="flex justify-center items-center h-11 w-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 transition-colors text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        @click="reloadKOT"
      >
        <svg
          :class="['w-5 h-5', isRefreshing ? 'motion-safe:animate-spin' : '']"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8m0 0V3m0 5h5m-5 4a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16m0 0v5m0-5h-5"
          />
        </svg>
      </button>

      <!-- User Dropdown -->
      <div class="relative" ref="userMenuRef">
        <button
          type="button"
          :aria-expanded="showUserMenu ? 'true' : 'false'"
          aria-haspopup="menu"
          @click="toggleUserMenu"
          class="flex items-center gap-2 px-2.5 sm:px-3.5 h-11 rounded-xl border border-transparent hover:bg-slate-100 transition-colors text-slate-800 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
            <svg
              class="w-4 h-4 text-white"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <span class="text-xs sm:text-sm font-semibold max-w-[100px] sm:max-w-[180px] truncate">
            {{ userName }}
          </span>
          <svg
            class="w-4 h-4 text-slate-600 shrink-0"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-if="showUserMenu"
          role="menu"
          class="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-slate-200 z-50"
        >
          <div class="p-4 border-b border-slate-200">
            <p class="text-sm font-semibold text-slate-900 truncate">{{ userName }}</p>
            <p class="text-xs font-medium text-slate-600 truncate mt-0.5">{{ userId }}</p>
          </div>
          <div class="py-1.5">
            <button
              type="button"
              role="menuitem"
              @click="switchToDashboard"
              class="flex justify-start items-center w-full px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <svg
                class="w-4 h-4 mr-3 text-slate-600"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <line x1="8" x2="16" y1="21" y2="21" />
                <line x1="12" x2="12" y1="17" y2="21" />
              </svg>
              Ir para o Painel
            </button>

            <button
              type="button"
              role="menuitem"
              @click="logout"
              class="flex justify-start items-center w-full px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
            >
              <svg
                class="w-4 h-4 mr-3 text-red-600"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
import urimosaicImage from "@/assets/logos/logo-pericles-burger.png";

export default {
  name: "Header",
  data() {
    return {
      imagePath: urimosaicImage,
      showUserMenu: false,
      isRefreshing: false,
      userName: "Operador",
      userId: "",
    };
  },
  methods: {
    reloadKOT() {
      this.isRefreshing = true;
      window.dispatchEvent(new CustomEvent("mosaic:refresh"));
      setTimeout(() => {
        this.isRefreshing = false;
      }, 650);
    },
    toggleUserMenu() {
      this.showUserMenu = !this.showUserMenu;
    },
    switchToDashboard() {
      this.showUserMenu = false;
      window.location.href = "/ury/dashboard";
    },
    async logout() {
      this.showUserMenu = false;
      try {
        await fetch("/api/method/logout", { method: "POST" });
      } catch (e) {
        console.error(e);
      }
      window.location.href = "/login?redirect-to=%2Fmosaic";
    },
    handleClickOutside(event) {
      if (this.$refs.userMenuRef && !this.$refs.userMenuRef.contains(event.target)) {
        this.showUserMenu = false;
      }
    },
    handleKeydown(event) {
      if (event.key === "Escape") {
        this.showUserMenu = false;
      }
    },
    async fetchUser() {
      try {
        const res = await fetch("/api/method/frappe.auth.get_logged_user");
        const data = await res.json();
        if (data.message && data.message !== "Guest") {
          this.userId = data.message;
          const userRes = await fetch(
            `/api/method/frappe.client.get_value?doctype=User&filters=${encodeURIComponent(
              JSON.stringify({ name: data.message })
            )}&fieldname=full_name`
          );
          const userData = await userRes.json();
          if (userData.message && userData.message.full_name) {
            this.userName = userData.message.full_name;
          } else {
            this.userName = data.message;
          }
        } else {
          this.userName = "Visitante";
          this.userId = "Sessão não iniciada";
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    },
  },
  mounted() {
    document.addEventListener("mousedown", this.handleClickOutside);
    document.addEventListener("keydown", this.handleKeydown);
    this.fetchUser();
  },
  unmounted() {
    document.removeEventListener("mousedown", this.handleClickOutside);
    document.removeEventListener("keydown", this.handleKeydown);
  },
};
</script>
