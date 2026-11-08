/** @import {OptionType_General} from '../../opts.mjs' */

import { onDOMContentLoaded } from "../../../../common/browser/general/onDOMContentLoaded.mjs";
import { PathElement } from "./path.mjs";

export class GeneralElement extends HTMLElement {
  /** @type {HTMLInputElement} */
  _saveUsingBookmark = null;
  /** @type {PathElement} */
  _prefix = null;

  constructor() {
    super();

    const style = document.createElement('style');
    style.textContent = ``;

    const container = document.createElement('fieldset');

    const legend = document.createElement('legend');
    legend.innerText = 'General settings';
    container.appendChild(legend);

    const saveUsingBookmarkLabel = document.createElement('label');
    saveUsingBookmarkLabel.innerText = 'Save using bookmark ';
    container.appendChild(saveUsingBookmarkLabel);

    this._saveUsingBookmark = document.createElement('input');
    this._saveUsingBookmark.type = 'checkbox';
    container.appendChild(this._saveUsingBookmark);

    this._prefix = new PathElement();
    this._prefix.options([
      {value: '',             display: 'No prefix', editable: false},
      {value: 'toolbar_____', display: 'Toolbar',   editable: true},
      {value: 'menu________', display: 'Menu',      editable: true},
    ]);
    this._prefix.addEventListener('change', () => this.dispatchEvent(new Event('prefix-change')));
    container.appendChild(this._prefix);

    this.attachShadow({mode: 'closed'}).append(style, container);
  }

  /**
   * @param {OptionType_General} data
   * @param {boolean} saveUsingBookmark
   */
  init(data, saveUsingBookmark) {
    this._saveUsingBookmark.checked = saveUsingBookmark;
    this._prefix.init(data?.prefix ?? null);
  }

  get path() {
    return this._prefix;
  }

  get saveUsingBookmark() {
    return this._saveUsingBookmark.checked;
  }

  isValid() {
    return this._prefix.isValid();
  }

  /** @returns {OptionType_General} */
  toJSON() {
    return {
      prefix: this._prefix.toJSON(),
    };
  }
}

onDOMContentLoaded(() => customElements.define('c-general', GeneralElement));
