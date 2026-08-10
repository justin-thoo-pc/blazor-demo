export class ConfirmDialog {

}

declare global {
  interface Window {
    ConfirmDialog: typeof ConfirmDialog;
  }
}

window.ConfirmDialog = ConfirmDialog;
