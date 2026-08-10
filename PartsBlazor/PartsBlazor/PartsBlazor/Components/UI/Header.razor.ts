export class Header {

}

declare global {
  interface Window {
    Header: typeof Header;
  }
}

window.Header = Header;
