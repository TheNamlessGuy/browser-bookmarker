class ErrorElement extends HTMLElement {
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

  set message(value) {
    this._container.innerText = value;
  }
}

window.addEventListener('DOMContentLoaded', () => customElements.define('c-error', ErrorElement));