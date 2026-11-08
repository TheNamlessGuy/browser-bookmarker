/** @import {OptionType_Area, OptionType_Area_Entry} from '../../opts.mjs' */

import { onDOMContentLoaded } from "../../../../common/browser/general/onDOMContentLoaded.mjs";
import { EntryElement } from "./entry.mjs";
import { ErrorElement } from "./error.mjs";
import { GeneralElement } from "./general.mjs";
import { PathElement } from "./path.mjs";

export class AreaElement extends HTMLElement {
  /** @type {GeneralElement} */
  _general = null;

  /** @type {HTMLDivElement} */
  _errorContainer = null;

  _title = {
    /** @type {string} */
    value: null,
    /** @type {HTMLInputElement} */
    input: null,
    /** @type {HTMLSpanElement} */
    display: null,

    buttons: {
      /** @type {HTMLButtonElement} */
      up: null,
      /** @type {HTMLButtonElement} */
      down: null,
    },
  };

  _content = {
    /** @type {HTMLDivElement} */
    show: null,
    /** @type {HTMLDivElement} */
    hide: null,
  };

  _entries = {
    /** @type {HTMLButtonElement} */
    add: null,
    /** @type {HTMLDivElement} */
    container: null,
  };

  /** @type {PathElement} */
  _prefix = null;
  /** @type {HTMLInputElement} */
  _followRedirects = null;

  constructor() {
    super();

    const style = document.createElement('style');
    style.textContent = `
legend {
  cursor: pointer;
}

legend > span {
  margin-right: 3px;
}

.hidden {
  display: none !important;
}

.italic {
  font-style: italic !important;
}

.center-text {
  text-align: center;
}

.separate {
  display: flex;
  justify-content: space-between;
}

.w100 {
  width: 100%;
}
`;

    const container = document.createElement('fieldset');

    this._errorContainer = document.createElement('div');
    container.appendChild(this._errorContainer);

    const legend = document.createElement('legend');
    container.appendChild(legend);

    this._title.display = document.createElement('span');
    this._title.display.addEventListener('click', () => this.toggleCollapsed());
    legend.appendChild(this._title.display);

    this._title.buttons.up = document.createElement('button');
    this._title.buttons.up.innerText = '↑';
    this._title.buttons.up.addEventListener('click', () => this.dispatchEvent(new Event('move-up')));
    legend.appendChild(this._title.buttons.up);

    this._title.buttons.down = document.createElement('button');
    this._title.buttons.down.innerText = '↓';
    this._title.buttons.down.addEventListener('click', () => this.dispatchEvent(new Event('move-down')));
    legend.appendChild(this._title.buttons.down);

    this._content.hide = document.createElement('div');
    this._content.hide.classList.add('hidden', 'italic', 'center-text');
    this._content.hide.innerText = 'Content is hidden';
    container.appendChild(this._content.hide);

    this._content.show = document.createElement('div');
    container.appendChild(this._content.show);

    const areaNameContainer = document.createElement('div');
    areaNameContainer.classList.add('separate');
    this._content.show.appendChild(areaNameContainer);

    this._title.input = document.createElement('input');
    this._title.input.type = 'text';
    this._title.input.placeholder = 'Area name';
    this._title.input.addEventListener('input', () => this.title = this._title.input.value);
    this.title = null;
    areaNameContainer.appendChild(this._title.input);

    const removeBtn = document.createElement('button');
    removeBtn.innerText = 'Remove area';
    removeBtn.addEventListener('click', () => this.remove());
    areaNameContainer.appendChild(removeBtn);

    this._prefix = new PathElement();
    this._prefix.options([
      {value: '',             display: 'No prefix',          editable: false},
      {value: 'prefix',       display: 'Use general prefix', editable: () => this._general.path.isEditable()},
      {value: 'toolbar_____', display: 'Toolbar',            editable: true},
      {value: 'menu________', display: 'Menu',               editable: true},
    ]);
    this._prefix.addEventListener('change', () => this.entries.forEach(x => x._doCheck()));
    this._content.show.appendChild(this._prefix);

    const followRedirectsLabel = document.createElement('label');
    followRedirectsLabel.innerText = 'Follow redirects ';
    this._content.show.appendChild(followRedirectsLabel);

    const followRedirectsWarning = document.createElement('span');
    followRedirectsWarning.innerText = '⚠';
    followRedirectsWarning.title = 'Note: Due to browser limitations, only works if the bookmark is opened in a new tab';
    followRedirectsLabel.appendChild(followRedirectsWarning);

    this._followRedirects = document.createElement('input');
    this._followRedirects.type = 'checkbox';
    this._content.show.appendChild(this._followRedirects);

    this._content.show.appendChild(document.createElement('hr'));

    this._entries.container = document.createElement('div');
    this._content.show.appendChild(this._entries.container);

    this._entries.add = document.createElement('button');
    this._entries.add.innerText = 'Add entry';
    this._entries.add.classList.add('w100');
    this._entries.add.addEventListener('click', () => this.addEntry());
    this._content.show.appendChild(this._entries.add);

    this.attachShadow({mode: 'closed'}).append(style, container);
  }

  get title() {
    return this._title.value;
  }

  set title(value) {
    this._title.value = value?.trim();
    this._title.input.value = this._title.value ?? null;

    if (this._title.value == null || this._title.value === '') {
      this._title.display.innerText = 'No area name';
      this._title.display.classList.add('italic');
    } else {
      this._title.display.innerText = `Area: ${this._title.value}`;
      this._title.display.classList.remove('italic');
    }
  }

  get path() {
    return this._prefix;
  }

  get entries() {
    return /** @type {EntryElement[]} */ (Array.from(this._entries.container.getElementsByTagName('c-entry')));
  }

  /**
   * @param {GeneralElement} general
   * @param {OptionType_Area|null} data
   */
  init(general, data = null) {
    this._general = general;
    this._general.addEventListener('prefix-change', () => {
      this._prefix._doCheck();
      this.entries.forEach(x => x._doCheck());
    });

    this.title = data?.name ?? null;
    this._followRedirects.checked = data?.opts?.followRedirects ?? false;

    this._prefix.init(data?.prefix ?? null);

    if (data == null) {
      this._prefix.selectValue = this._general.path.selectValue === '' ? '' : 'prefix';
    }

    const entries = data?.entries ?? [];
    if (entries.length === 0) {
      this.addEntry();
    } else {
      for (const entry of entries) {
        this.addEntry(entry);
      }
    }
  }

  /** @param {OptionType_Area_Entry|null} data */
  addEntry(data = null) {
    const entry = new EntryElement();
    entry.init(this, data);

    entry.addEventListener('move-up', () => {
      this._entries.container.insertBefore(entry, entry.previousSibling);
      this.entries.forEach(x => x.toggleButtonDisabledState());
    });

    entry.addEventListener('move-down', () => {
      this._entries.container.insertBefore(entry, entry.nextSibling?.nextSibling);
      this.entries.forEach(x => x.toggleButtonDisabledState());
    });

    this._entries.container.appendChild(entry);
    this.entries.forEach(x => x.toggleButtonDisabledState());
  }

  /**
   * @param {EntryElement} entry
   * @returns {number}
   */
  getEntryIndex(entry) {
    return this.entries.findIndex(x => x === entry);
  }

  isCollapsed() {
    return !this._content.hide.classList.contains('hidden');
  }

  /** @param {boolean} collapse */
  toggleCollapsed(collapse = null) {
    collapse = collapse ?? !this.isCollapsed();

    this._content.show.classList.toggle('hidden', collapse);
    this._content.hide.classList.toggle('hidden', !collapse);
  }

  /**
   * @param {number} idx
   * @param {number} total
   */
  toggleButtonDisabledState(idx, total) {
    this._title.buttons.up.disabled = (idx === 0);
    this._title.buttons.down.disabled = (idx === total - 1);
  }

  clearErrors() {
    Array.from(this._errorContainer.children).forEach(x => x.remove());
  }

  /** @param {string} msg */
  addError(msg) {
    const error = new ErrorElement();
    error.message = msg;
    this._errorContainer.appendChild(error);
  }

  isValid() {
    this.clearErrors();

    let isValid = true;

    if (!this._prefix.isValid()) {
      isValid = false;
    }

    const entries = this.entries;
    if (entries.length === 0) {
      this.addError('Have to have at least one entry');
      isValid = false;
    } else {
      for (const entry of this.entries) {
        if (!entry.isValid()) {
          isValid = false;
        }
      }
    }

    if (!isValid && this.isCollapsed()) {
      this.toggleCollapsed(false);
    }

    return isValid;
  }

  /** @returns {OptionType_Area} */
  toJSON() {
    return {
      name: this.title,
      prefix: this._prefix.toJSON(),
      entries: this.entries.map(x => x.toJSON()),
      opts: {
        followRedirects: this._followRedirects.checked,
      },
    };
  }
}

onDOMContentLoaded(() => customElements.define('c-area', AreaElement));
