/** @import {OptionType_Area_Entry_AndThen} from '../../opts.mjs' */

import { onDOMContentLoaded } from "../../../../common/browser/general/onDOMContentLoaded.mjs";
import { EntryElement } from "./entry.mjs";
import { ErrorElement } from "./error.mjs";
import { LabeledInputElement } from "./labeled-input.mjs";

/** ValidValueElementType
 * @typedef {HTMLInputElement|LabeledInputElement} ValidValueElementType
 */

/** Type
 * @typedef {object} Type
 * @property {string} value
 * @property {string} display
 * @property {TypeValue[]} _values
 */
/** TypeValue
 * @typedef {object} TypeValue
 * @property {() => ValidValueElementType} element
 * @property {boolean} nullable
 */

/** ProcessedType
 * @typedef {Omit<Type, '_values'> & {_values: ProcessedTypeValue[]}} ProcessedType
 */
/** ProcessedTypeValue
 * @typedef {Omit<TypeValue, 'element'> & {element: ValidValueElementType}} ProcessedTypeValue
 */

export class EntryAndThenElement extends HTMLElement {
  /** @type {Type[]} */
  _types = [
    {value: 'set-url',   display: 'set the URL to', _values: [{element: () => document.createElement('input'), nullable: false}]},
    {value: 'set-title', display: 'set the title',  _values: [{element: () => EntryAndThenElement._inputWithLabel('Regex'), nullable: false}, {element: () => EntryAndThenElement._inputWithLabel('Result'), nullable: false}]},
  ];

  /** @type {ProcessedType[]} */
  _processedTypes = [];

  /**
   * @param {string} label
   * @returns {LabeledInputElement}
   */
  static _inputWithLabel(label) {
    const elem = new LabeledInputElement();
    elem.label = label;
    return elem;
  }

  /** @type {EntryElement} */
  _entry = null;

  /** @type {HTMLDivElement} */
  _errorContainer = null;

  /** @type {HTMLSelectElement} */
  _select = null;
  /** @type {HTMLSpanElement} */
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

    if (this._processedTypes.length !== this._types.length) {
      this._processedTypes = [];

      for (const type of this._types) {
        this._processedTypes.push({
          value: type.value,
          display: type.display,
          _values: type._values.map(x => {
            return {
              nullable: x.nullable,
              element: x.element(),
            };
          }),
        });
      }
    }

    this._select = document.createElement('select');
    for (const type of this._processedTypes) {
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

  /**
   * @param {EntryElement} entry
   * @param {OptionType_Area_Entry_AndThen} [data=null]
   */
  init(entry, data = null) {
    this._entry = entry;

    this._select.value = data?.type ?? this._processedTypes[0].value;
    this._onSelectChange();

    const selected = this._getSelectedEntry();
    for (let i = 0; i < selected._values.length; ++i) {
      selected._values[i].element.value = data?.values[i]?.value ?? '';
    }
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

    const selected = this._getSelectedEntry();

    if (selected.value === 'set-title') {
      try {
        new RegExp(selected._values[0].element.value);
      } catch (error) {
        this.addError(`Invalid title regex: ${error}`);
        isValid = false;
      }
    }

    for (let i = 0; i < selected._values.length; ++i) {
      if (!selected._values[i].nullable && selected._values[i].element.value.trim() === '') {
        this.addError(`Value ${i + 1} cannot be empty`);
        isValid = false;
      }
    }

    return isValid;
  }

  /** @returns {OptionType_Area_Entry_AndThen} */
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
    return this._processedTypes.find(x => x.value === this._select.value) ?? null;
  }

  _onSelectChange() {
    while (this._valueContainer.children.length > 0) {
      this._valueContainer.children[0].remove();
    }

    this._valueContainer.append(...this._getSelectedEntry()._values.map(x => x.element));
  }
}

onDOMContentLoaded(() => customElements.define('c-entry-and-then', EntryAndThenElement));
