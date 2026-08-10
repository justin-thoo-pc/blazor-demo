export class Settings {

}

declare global {
  interface Window {
    Settings: typeof Settings;
  }
}

window.Settings = Settings;
