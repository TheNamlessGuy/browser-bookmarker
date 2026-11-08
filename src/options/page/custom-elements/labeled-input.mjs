import { onDOMContentLoaded } from "../../../../common/browser/general/onDOMContentLoaded.mjs";

export class LabeledInputElement extends HTMLElement {
  /** @type {HTMLSpanElement} */
  _label = null;
  /** @type {HTMLInputElement} */
  _input = null;

  constructor() {
    super();

    const container = document.createElement('span');
    container.style.marginLeft = '5px';

    this._label = document.createElement('span');
    container.append(this._label);

    this._input = document.createElement('input');
    container.append(this._input);

    this.attachShadow({mode: 'closed'}).append(container);
  }

  /** @param {string} value */
  set label(value) {
    this._label.innerText = `${value}: `;
  }

  get value() {
    return this._input.value;
  }

  set value(value) {
    this._input.value = value;
  }
}

onDOMContentLoaded(() => customElements.define('c-labeled-input', LabeledInputElement));
