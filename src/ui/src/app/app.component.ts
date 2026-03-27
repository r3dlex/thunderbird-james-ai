import { Component, OnInit } from "@angular/core"
import { Router, RouterOutlet } from "@angular/router"
import { TabBarComponent } from "./shared/components/tab-bar.component"

@Component({
  selector: "corvus-root",
  standalone: true,
  imports: [RouterOutlet, TabBarComponent],
  template: `
    <div class="corvus-app">
      <corvus-tab-bar [activePage]="currentPage" (pageChange)="onPageChange($event)"></corvus-tab-bar>
      <div class="corvus-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .corvus-app {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--corvus-bg);
    }
    .corvus-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  `],
})
export class AppComponent implements OnInit {
  currentPage = "chat"

  constructor(private router: Router) {}

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search)
    this.currentPage = params.get("page") ?? "chat"

    // Route based on page parameter
    switch (this.currentPage) {
      case "compose":
        this.router.navigate(["/compose"])
        break
      case "settings":
        this.router.navigate(["/settings"])
        break
      case "assistant":
        this.router.navigate(["/assistant"])
        break
      case "msgDisplay":
      case "chat":
      default:
        this.router.navigate(["/chat"])
        break
    }
  }

  onPageChange(page: string): void {
    this.currentPage = page
    this.router.navigate([`/${page}`])
  }
}
