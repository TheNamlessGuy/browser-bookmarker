class EntryAndThenElement extends HTMLElement {
  static _types = [
    {value: 'set-url',   display: 'set the URL to', _values: [{element: () => document.createElement('input'), nullable: false}]},
    {value: 'set-title', display: 'set the title',  _values: [{element: () => EntryAndThenElement._inputWithLabel('Regex'), nullable: false}, {element: () => EntryAndThenElement._inputWithLabel('Result'), nullable: false}]},
  ];

  static _inputWithLabel(label) {
    const elem = document.createElement('c-labeled-input');
    elem.label = label;
    return elem;
  }

  _entry = null;

  _errorContainer = null;

  _select = null;
  _valueContainer = null;

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

    for (const type of EntryAndThenElement._types) {
      for (let i = 0; i < type._values.length; ++i) {
        type._values[i].element = type._values[i].element();
      }
    }

    this._select = document.createElement('select');
    for (const type of EntryAndThenElement._types) {
      const option = document.createElement('option');
      option.value = type.value;
      option.innerText = type.display;
      this._select.appendChild(option);
    }
    this._select.addEventListener('change', this._onSelectChange.bind(this));
    container.appendChild(this._select);

    this._valueContainer = document.createElement('span');
    container.append(this._valueContainer);

    this.attachShadow({mode: 'closed'}).append(style, container);
  }

  init(entry, data = null) {
    this._entry = entry;

    this._select.value = data?.type ?? EntryAndThenElement._types[0].value;
    this._onSelectChange();

    const selected = this._getSelectedEntry();
    for (let i = 0; i < selected._values.length; ++i) {
      selected._values[i].element.value = data?.values[i]?.value ?? '';
    }
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

    const selected = this._getSelectedEntry();
    for (let i = 0; i < selected._values.length; ++i) {
      if (!selected._values[i].nullable && selected._values[i].element.value.trim() === '') {
        this.addError(`Value ${i + 1} cannot be empty`);
        isValid = false;
      }
    }

    return isValid;
  }

  toJSON() {
    const selected = this._getSelectedEntry();
    return {
      type: this._select.value,
      values: selected._values.map((x) => {
        const value = x.element.value.trim();
        return {value: (x.nullable && !value) ? null : value};
      }),
    };
  }

  _getSelectedEntry() {
    return EntryAndThenElement._types.find(x => x.value === this._select.value) ?? null;
  }

  _onSelectChange() {
    while (this._valueContainer.children.length > 0) {
      this._valueContainer.children[0].remove();
    }

    this._valueContainer.append(...this._getSelectedEntry()._values.map(x => x.element));
  }
}

window.addEventListener('DOMContentLoaded', () => customElements.define('c-entry-and-then', EntryAndThenElement));