import { Injectable, signal, effect } from "@angular/core"

@Injectable({ providedIn: "root" })
export class ThemeService {
  readonly isDark = signal(false)

  constructor() {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    this.isDark.set(mediaQuery.matches)

    mediaQuery.addEventListener("change", (e) => {
      this.isDark.set(e.matches)
    })
  }
}
