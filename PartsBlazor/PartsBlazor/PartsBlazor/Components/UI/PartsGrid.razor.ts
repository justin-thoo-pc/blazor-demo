// Re-exported so PartsGrid.razor can bump the "items added" counter through the
// module reference it already holds. See UserActivity.razor.ts for the storage.
export {recordItemAdded} from "./UserActivity.razor.js";

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