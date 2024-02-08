class EntryPathElement extends HTMLElement {
  _entry = null;

  _errorContainer = null;

  _title = null;
  _default = null;
  _prefix = null;

  constructor() {
    super();

    const style = document.createElement('style');
    style.textContent = `
input, button {
  margin-right: 3px;
}
`;

    const container = document.createElement('div');

    this._errorContainer = document.createElement('div');
    container.appendChild(this._errorContainer);

    const removeBtn = document.createElement('button');
    removeBtn.innerText = '🗑';
    removeBtn.addEventListener('click', () => this.remove());
    container.appendChild(removeBtn);

    this._title = document.createElement('input');
    this._title.type = 'text';
    this._title.placeholder = 'Title...';
    container.appendChild(this._title);

    const checkboxLabel = document.createElement('span');
    checkboxLabel.innerText = 'Default';
    container.appendChild(checkboxLabel);

    this._default = document.createElement('input');
    this._default.type = 'checkbox';
    this._default.addEventListener('change', () => this.dispatchEvent(new Event('default-changed')));
    container.appendChild(this._default);

    this._prefix = document.createElement('c-path');
    this._prefix.options([
      {value: 'prefix',       display: 'Use area prefix', editable: () => this._entry && this._entry._area.prefix.isEditable()},
      {value: 'toolbar_____', display: 'Toolbar',         editable: true},
      {value: 'menu________', display: 'Menu',            editable: true},
    ]);
    this._prefix.style.display = 'inline';
    container.appendChild(this._prefix);

    this.attachShadow({mode: 'closed'}).append(style, container);
  }

  get path() {
    return this._prefix;
  }

  get default() {
    return this._default.checked;
  }

  set default(value) {
    this._default.checked = value;
  }

  /**
   * @param {EntryElement} entry
   * @param {{default: boolean, path: string[], root: string, title: string}} data
   */
  init(entry, data) {
    this._entry = entry;

    this._title.value = data?.title ?? null;
    this._default.checked = data?.default ?? false;

    this._prefix.init({
      root: data?.root ?? 'prefix',
      path: data?.path ?? [],
    });
  }

  clearErrors() {
    Array.from(this._errorContainer.children).forEach(x => x.remove());
  }

  addError(msg) {
    const error = document.createElement('c-error');
    error.message = msg;
    this._errorContainer.appendChild(error);
  }

  _doCheck() {
    this._prefix._doCheck();
  }

  isValid() {
    this.clearErrors();

    let isValid = true;

    if (this._title.value.trim() === '') {
      this.addError('Title cannot be empty');
      isValid = false;
    }

    if (!this._prefix.isValid()) {
      isValid = false;
    }

    return isValid;
  }

  toJSON() {
    const prefix = this._prefix.toJSON();

    return {
      title: this._title.value.trim(),
      default: this._default.checked,
      root: prefix.root,
      path: prefix.path,
    };
  }
}

window.addEventListener('DOMContentLoaded', () => customElements.define('c-entry-path', EntryPathElement));