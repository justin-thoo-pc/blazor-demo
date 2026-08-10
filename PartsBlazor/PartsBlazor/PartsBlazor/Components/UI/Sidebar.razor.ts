export class Sidebar {

}

declare global {
  interface Window {
    Sidebar: typeof Sidebar;
  }
}

window.Sidebar = Sidebar;
