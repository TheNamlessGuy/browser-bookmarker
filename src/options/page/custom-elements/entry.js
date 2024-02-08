class EntryElement extends HTMLElement {
  _area = null;

  _errorContainer = null;

  _regex = null;
  _parameters = null;

  _pathContainer = null;
  _andThenContainer = null;

  _buttons = {
    up: null,
    down: null,
  };

  constructor() {
    super();

    const style = document.createElement('style');
    style.textContent = `
input, button {
  margin-right: 3px;
}

.separate {
  display: flex;
  justify-content: space-between;
}
`;

    const container = document.createElement('div');

    this._errorContainer = document.createElement('div');
    container.appendChild(this._errorContainer);

    const separator = document.createElement('div');
    separator.classList.add('separate');
    container.appendChild(separator);

    const lhs = document.createElement('span');
    separator.appendChild(lhs);

    this._regex = document.createElement('input');
    this._regex.type = 'text';
    this._regex.placeholder = 'RegExp';
    lhs.appendChild(this._regex);

    this._parameters = document.createElement('input');
    this._parameters.type = 'text';
    this._parameters.placeholder = 'Parameters (CSV)';
    lhs.appendChild(this._parameters);

    this._buttons.up = document.createElement('button');
    this._buttons.up.innerText = '↑';
    this._buttons.up.addEventListener('click', () => this.dispatchEvent(new Event('move-up')));
    lhs.appendChild(this._buttons.up);

    this._buttons.down = document.createElement('button');
    this._buttons.down.innerText = '↓';
    this._buttons.down.addEventListener('click', () => this.dispatchEvent(new Event('move-down')));
    lhs.appendChild(this._buttons.down);

    const rhs = document.createElement('span');
    separator.appendChild(rhs);

    const removeBtn = document.createElement('button');
    removeBtn.innerText = 'Remove entry';
    removeBtn.addEventListener('click', () => this.remove());
    rhs.appendChild(removeBtn);

    this._pathContainer = document.createElement('div');
    container.appendChild(this._pathContainer);

    const addPathBtn = document.createElement('button');
    addPathBtn.innerText = 'Add path';
    addPathBtn.addEventListener('click', () => this.addPath());
    container.appendChild(addPathBtn);

    this._andThenContainer = document.createElement('div');
    container.appendChild(this._andThenContainer);

    const addAndThenBtn = document.createElement('button');
    addAndThenBtn.innerText = 'Add "And then"';
    addAndThenBtn.addEventListener('click', () => this.addAndThen());
    container.appendChild(addAndThenBtn);

    container.appendChild(document.createElement('hr'));

    this.attachShadow({mode: 'closed'}).append(style, container);
  }

  /**
   * @param {AreaElement} area
   * @param {{regex: string, paths: EntryPathElement[], parameters: string[], andThen: EntryAndThenElement[]}} data
   */
  init(area, data) {
    this._area = area;

    this._regex.value = data?.regex ?? null;
    this._parameters.value = data?.parameters?.join(',') ?? null;

    const paths = data?.paths ?? [];
    if (paths.length === 0) {
      this.addPath();
    } else {
      for (const path of paths) {
        this.addPath(path);
      }
    }

    const andThens = data?.andThen ?? [];
    for (const andThen of andThens) {
      this.addAndThen(andThen);
    }
  }

  toggleButtonDisabledState() {
    const idx = this._area.getEntryIndex(this);
    const total = this._area.entries.length;

    this._buttons.up.disabled = (idx === 0);
    this._buttons.down.disabled = (idx === total - 1);
  }

  _doCheck() {
    this.paths.forEach(x => x._doCheck());
  }

  get paths() {
    return Array.from(this._pathContainer.getElementsByTagName('c-entry-path'));
  }

  addPath(data = null) {
    const path = document.createElement('c-entry-path');
    path.init(this, data);
    path.addEventListener('default-changed', () => {
      if (!path.default) { return; }

      this.paths.forEach(x => {
        if (x === path) { return; }

        x.default = false;
      });
    });

    if (data == null) {
      path.path.selectValue = this._area.prefix.selectValue !== '' ? 'prefix' : 'toolbar_____';
    }

    this._pathContainer.appendChild(path);
  }

  get andThen() {
    return Array.from(this._andThenContainer.getElementsByTagName('c-entry-and-then'));
  }

  addAndThen(data = null) {
    const andThen = document.createElement('c-entry-and-then');
    andThen.init(this, data);
    this._andThenContainer.appendChild(andThen);
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

    if (this._regex.value.trim() === '') {
      this.addError('RegExp cannot be empty');
      isValid = false;
    } else {
      try {
        new RegExp(this._regex.value.trim());
      } catch (e) {
        this.addError('RegExp is invalid: ' + e.message);
        isValid = false;
      }
    }

    for (const path of this.paths) {
      if (!path.isValid()) {
        isValid = false;
      }
    }

    for (const andThen of this.andThen) {
      if (!andThen.isValid()) {
        isValid = false;
      }
    }

    return isValid;
  }

  toJSON() {
    const parameters = this._parameters.value.trim().split(',').filter(x => x !== '');

    return {
      regex: this._regex.value.trim(),
      parameters: parameters,
      paths: this.paths.map(x => x.toJSON()),
      andThen: this.andThen.map(x => x.toJSON()),
    };
  }
}

window.addEventListener('DOMContentLoaded', () => customElements.define('c-entry', EntryElement));