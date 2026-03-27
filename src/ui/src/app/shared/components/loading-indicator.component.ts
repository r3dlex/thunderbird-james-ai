import { Component } from "@angular/core"

@Component({
  selector: "corvus-loading",
  standalone: true,
  template: `
    <div class="loading">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  `,
  styles: [`
    .loading {
      display: flex;
      gap: 4px;
      padding: 8px 0;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--corvus-text-secondary);
      animation: pulse 1.2s infinite ease-in-out;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1); }
    }
  `],
})
export class LoadingIndicatorComponent {}
