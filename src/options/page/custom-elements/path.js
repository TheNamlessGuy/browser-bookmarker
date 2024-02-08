class PathElement extends HTMLElement {
  _container = null;

  _select = null;
  _options = [];

  _segmentContainer = null;

  _buttons = {
    add: null,
    remove: null,
  };

  _errorContainer = null;

  constructor() {
    super();

    const style = document.createElement('style');
    style.textContent = `
select, button, input {
  margin-right: 3px;
}

.segment-input {
  width: 8ch;
  font-family: monospace;
}
`;

    this._container = document.createElement('div');

    this._errorContainer = document.createElement('span');
    this._container.appendChild(this._errorContainer);

    this._select = document.createElement('select');
    this._select.addEventListener('change', () => {
      this._toggleButtonDisabledStatus();
      this.dispatchEvent(new Event('change'));
    });
    this._container.appendChild(this._select);

    this._segmentContainer = document.createElement('span');
    this._container.appendChild(this._segmentContainer);

    this._buttons.remove = document.createElement('button');
    this._buttons.remove.disabled = true;
    this._buttons.remove.innerText = '-';
    this._buttons.remove.addEventListener('click', () => this.removeSegment());
    this._container.appendChild(this._buttons.remove);

    this._buttons.add = document.createElement('button');
    this._buttons.add.disabled = true;
    this._buttons.add.innerText = '+';
    this._buttons.add.addEventListener('click', () => this.addSegment());
    this._container.appendChild(this._buttons.add);

    this.attachShadow({mode: 'closed'}).append(style, this._container);
  }

  /**
   * @param {{value: string, display: string, editable: boolean|() => boolean}[]} choices
   */
  options(choices) {
    this._options.forEach(x => x.remove());
    this._options = choices;

    for (const choice of choices) {
      const option = document.createElement('option');
      option.value = choice.value;
      option.innerText = choice.display;
      choice.element = option;
      this._select.appendChild(option);
    }

    this._toggleButtonDisabledStatus();
  }

  /**
   * @param {{root: string, path: string[]}} data
   */
  init(data = null) {
    if (data?.root != null) {
      this._select.value = data.root;
    }

    for (const p of data?.path ?? []) {
      this.addSegment(p);
    }
  }

  addSegment(data = null) {
    const segment = document.createElement('span');
    segment.classList.add('segment');

    if (this._segmentContainer.children.length > 0) {
      const separator = document.createElement('span');
      separator.innerText = '/ ';
      segment.appendChild(separator);
    }

    const input = document.createElement('input');
    input.classList.add('segment-input');
    input.type = 'text';
    input.placeholder = 'Segment';
    input.value = data;
    segment.appendChild(input);

    const setInputWidth = () => {
      input.style.width = input.value.length > 8 ? `${input.value.length}ch` : '8ch';
    };
    input.addEventListener('input', setInputWidth);
    setInputWidth();

    this._segmentContainer.appendChild(segment);

    this._toggleButtonDisabledStatus();
    this.dispatchEvent(new Event('change'));
  }

  get style() {
    return this._container.style;
  }

  get selectValue() {
    return this._select.value;
  }

  set selectValue(value) {
    this._select.value = value;
    this._toggleButtonDisabledStatus();
  }

  get _segments() {
    return Array.from(this._segmentContainer.getElementsByClassName('segment'));
  }

  get _values() {
    return this._segments.map(x => x.getElementsByClassName('segment-input')[0].value);
  }

  removeSegment() {
    const segments = this._segments;
    segments[segments.length - 1].remove();

    this._toggleButtonDisabledStatus();
    this.dispatchEvent(new Event('change'));
  }

  _getOption(value = null) {
    value = value ?? this._select.value;
    return this._options.find(x => x.value === value);
  }

  _getIsEditable(value = null) {
    const option = this._getOption(value);

    let editable = option.editable;
    if (![true, false].includes(editable)) {
      editable = editable();
    }

    return editable;
  }

  _toggleButtonDisabledStatus() {
    const editable = this._getIsEditable();

    this._buttons.add.disabled = !editable;
    this._buttons.remove.disabled = !editable || this._segments.length === 0;
  }

  _doCheck() {
    this._toggleButtonDisabledStatus();
  }

  clearErrors() {
    Array.from(this._errorContainer.children).forEach(x => x.remove());
  }

  addError(msg) {
    const error = document.createElement('c-error');
    error.message = msg;
    this._errorContainer.appendChild(error);
  }

  isEditable() {
    return this._getIsEditable();
  }

  isValid() {
    this.clearErrors();

    const editable = this._getIsEditable();
    const values = this._values;

    if (!editable) {
      if (values.length > 0) {
        this.addError('This dropdown value is no longer editable');
        return false;
      }

      return true;
    }

    const emptyValueExists = values.some(x => x === '');
    if (emptyValueExists) {
      this.addError('An empty path segment exists');
      return false;
    }

    return true;
  }

  toJSON() {
    return {
      root: this.selectValue,
      path: this._values,
    };
  }
}

window.addEventListener('DOMContentLoaded', () => customElements.define('c-path', PathElement));