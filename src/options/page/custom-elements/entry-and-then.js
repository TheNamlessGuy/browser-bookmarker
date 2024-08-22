class EntryAndThenElement extends HTMLElement {
  static _types = [
    {value: 'set-url',          display: 'set the URL to',   _value: true},
  ];

  _entry = null;

  _errorContainer = null;

  _select = null;
  _value = null;

  constructor() {
    super();

    const style = document.createElement('style');
    style.textContent = ``;

    const container = document.createElement('div');

    this._errorContainer = document.createElement('div');
    container.appendChild(this._errorContainer);

    const removeBtn = document.createElement('button');
    removeBtn.innerText = '🗑';
    removeBtn.addEventListener('click', () => this.remove());
    container.appendChild(removeBtn);

    container.appendChild(document.createTextNode(' And then '));

    this._select = document.createElement('select');
    for (const type of EntryAndThenElement._types) {
      const option = document.createElement('option');
      option.value = type.value;
      option.innerText = type.display;
      this._select.appendChild(option);
    }
    this._select.addEventListener('change', this._setValueVisibility.bind(this));
    container.appendChild(this._select);

    this._value = document.createElement('input');
    this._value.type = 'text';
    container.appendChild(this._value);

    this.attachShadow({mode: 'closed'}).append(style, container);
  }

  init(entry, data = null) {
    this._entry = entry;

    this._select.value = data?.type ?? EntryAndThenElement._types[0].value;
    this._value.value = data?.value ?? '';
    this._setValueVisibility();
  }

  clearErrors() {
    Array.from(this._errorContainer.children).forEach(x => x.remove());
  }

  addError(msg) {
    const error = document.createElement('c-error');
    error.message = msg;
    this._errorContainer.appendChild(error);
  }

  isValid() {
    this.clearErrors();

    let isValid = true;

    if (this._getSelectedEntry()._value && this._value.value.trim() === '') {
      this.addError('Value cannot be empty');
      isValid = false;
    }

    return isValid;
  }

  toJSON() {
    return {
      type: this._select.value,
      value: this._value.value.trim(),
    }
  }

  _getSelectedEntry() {
    return EntryAndThenElement._types.find(x => x.value === this._select.value) ?? null;
  }

  _setValueVisibility() {
    this._value.style.display = this._getSelectedEntry()._value ? null : 'none';
  }
}

window.addEventListener('DOMContentLoaded', () => customElements.define('c-entry-and-then', EntryAndThenElement));