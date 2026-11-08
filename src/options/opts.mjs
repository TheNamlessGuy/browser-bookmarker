/** @import {BrowserBookmarks_ToolbarGuid, BrowserBookmarks_MenuGuid} from '../../common/browser/plugins/constants.mjs' */
/** @import {BaseOptionsSetExtras} from '../../common/browser/plugins/background/base-options.mjs' */

import { BaseOptions } from "../../common/browser/plugins/background/base-options.mjs";

/** OptionType
 * @typedef {object} OptionType
 * @property {OptionType_General} general
 * @property {OptionType_Area[]} areas
 */

/** OptionType_General
 * @typedef {object} OptionType_General
 * @property {OptionType_Prefix<''|BrowserBookmarks_ToolbarGuid|BrowserBookmarks_MenuGuid>} prefix
 */

/** OptionType_Prefix
 * @template {string} ValidRootValues
 *
 * @typedef {object} OptionType_Prefix
 * @property {ValidRootValues} root
 * @property {string[]} path
 */

/** OptionType_Area
 * @typedef {object} OptionType_Area
 * @property {string|null} name
 * @property {OptionType_Prefix<''|'prefix'|BrowserBookmarks_ToolbarGuid|BrowserBookmarks_MenuGuid>} prefix
 * @property {OptionType_Area_Options} opts
 * @property {OptionType_Area_Entry[]} entries
 */

/** OptionType_Area_Options
 * @typedef {object} OptionType_Area_Options
 * @property {boolean} followRedirects
 */

/** OptionType_Area_Entry
 * @typedef {object} OptionType_Area_Entry
 * @property {string} regex
 * @property {string[]} parameters
 * @property {OptionType_Area_Entry_Path[]} paths
 * @property {OptionType_Area_Entry_AndThen[]} andThen
 */

/** OptionType_Area_Entry_Path
 * @typedef {object} OptionType_Area_Entry_Path
 * @property {string} title
 * @property {'prefix'|BrowserBookmarks_ToolbarGuid|BrowserBookmarks_MenuGuid} root
 * @property {string[]} path
 * @property {boolean} default
 */

/** OptionType_Area_Entry_AndThen
 * @typedef {object} OptionType_Area_Entry_AndThen
 * @property {string} type
 * @property {OptionType_Area_Entry_AndThen_Value[]} values
 */

/** OptionType_Area_Entry_AndThen_Value
 * @typedef {object} OptionType_Area_Entry_AndThen_Value
 * @property {string} value
 */

export class Options extends BaseOptions {
  /** @type {OptionType} */
  static DEFAULT = {
    areas: [],
    general: {
      prefix: {
        root: '',
        path: [],
      },
    },
  }

  /** @returns {Promise<OptionType>} */
  static async get() {
    return /** @type {OptionType} */ (await super.get());
  }

  /**
   * @param {OptionType} opts
   * @param {Partial<BaseOptionsSetExtras>} extras
   */
  static async set(opts, extras) {
    await super.set(opts, extras);
  }
}
