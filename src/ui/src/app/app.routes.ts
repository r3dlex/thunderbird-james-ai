import { Routes } from "@angular/router"

export const routes: Routes = [
  {
    path: "chat",
    loadComponent: () => import("./views/chat/chat.component").then(m => m.ChatComponent),
  },
  {
    path: "assistant",
    loadComponent: () => import("./views/assistant/assistant.component").then(m => m.AssistantComponent),
  },
  {
    path: "settings",
    loadComponent: () => import("./views/settings/settings.component").then(m => m.SettingsComponent),
  },
  {
    path: "compose",
    loadComponent: () => import("./views/compose/compose.component").then(m => m.ComposeComponent),
  },
  {
    path: "**",
    redirectTo: "chat",
  },
]
