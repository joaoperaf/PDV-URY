<template>
  <div class="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
    <Header />
    <main class="flex-1">
      <router-view />
    </main>
  </div>
</template>

<script>
import Header from "./components/Header.vue";

export default {
  name: "App",

  components: {
    Header,
  },
};
</script>
