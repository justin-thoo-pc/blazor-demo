export class PartsGrid {

}

declare global {
  interface Window {
    PartsGrid: typeof PartsGrid;
  }
}

window.PartsGrid = PartsGrid;