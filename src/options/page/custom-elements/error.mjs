import { onDOMContentLoaded } from "../../../../common/browser/general/onDOMContentLoaded.mjs";

export class ErrorElement extends HTMLElement {
  /** @type {HTMLDivElement} */
  _container = null;

  constructor() {
    super();

    const style = document.createElement('style');
    style.textContent = `
div {
  background-color: red;
  color: white;
  padding: 5px;
  margin: 5px 0;
  border-radius: 5px;
}
`;

    this._container = document.createElement('div');

    this.attachShadow({mode: 'closed'}).append(style, this._container);
  }

  /** @param {string} value */
  set message(value) {
    this._container.innerText = value;
  }
}

onDOMContentLoaded(() => customElements.define('c-error', ErrorElement));
