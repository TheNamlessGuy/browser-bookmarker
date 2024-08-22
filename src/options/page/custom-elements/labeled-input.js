class LabeledInputElement extends HTMLElement {
  _label = null;
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

window.addEventListener('DOMContentLoaded', () => customElements.define('c-labeled-input', LabeledInputElement));