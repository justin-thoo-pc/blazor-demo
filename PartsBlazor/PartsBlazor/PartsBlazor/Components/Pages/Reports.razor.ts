export class Reports {

}

declare global {
  interface Window {
    Reports: typeof Reports;
  }
}

window.Reports = Reports;
