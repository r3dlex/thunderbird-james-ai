/// <reference types="vite/client" />

import { createApp } from "vue"
import PrimeVue from "primevue/config"
import Aura from "@primeuix/themes/aura"
import App from "./App.vue"
import "./styles/main.css"

const app = createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
})

app.mount("#app")
