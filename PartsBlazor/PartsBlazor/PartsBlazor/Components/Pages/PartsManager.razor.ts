export class PartsManager {

}

declare global {
  interface Window {
    PartsManager: typeof PartsManager;
  }
}

window.PartsManager = PartsManager;
