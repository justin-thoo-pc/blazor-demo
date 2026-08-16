export class PartsGrid {

}

// Called from PartsGrid.razor via JS interop
export function log(...args: unknown[]): void {
  console.log(...args);
}

declare global {
  interface Window {
    PartsGrid: typeof PartsGrid;
  }
}

window.PartsGrid = PartsGrid;