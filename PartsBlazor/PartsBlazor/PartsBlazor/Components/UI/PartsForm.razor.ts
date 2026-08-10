export class PartsForm {

}

declare global {
  interface Window {
    PartsForm: typeof PartsForm;
  }
}

window.PartsForm = PartsForm;
