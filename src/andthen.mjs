/** @import {ProcessedEntry} from './bookmarks.mjs' */
/** @import {OptionType_Area_Entry_AndThen} from './options/opts.mjs' */

/** AndThen_DoData
 * @typedef {object} AndThen_DoData
 * @property {URL} url
 * @property {string} title
 * @property {ProcessedEntry} entry
 * @property {number} tabID
 */

/** AndThen_DoExtras
 * @typedef {object} AndThen_DoExtras
 * @property {boolean} [onlyAutomatic]
 */

/** AndThen_Type
 * @typedef {(typeof AndThen._types)[keyof typeof AndThen._types]} AndThen_Type
 */

/** AndThen_TypeImpl
 * @typedef {object} AndThen_TypeImpl
 * @property {boolean} automatic
 * @property {(andThen: OptionType_Area_Entry_AndThen, data: AndThen_DoData) => Promise<AndThen_Type_ReturnType>} callback
 */

/** AndThen_Type_ReturnType
 * @typedef {object} AndThen_Type_ReturnType
 * @property {URL} [url]
 * @property {string} [title]
 */

export class AndThen {
  /**
   * @param {AndThen_DoData} data
   * @param {AndThen_DoExtras|null} [extras={}]
   * @returns {Promise<{url: URL, title: string}>}
   */
  static async do(data, extras = {}) {
    const onlyAutomatic = extras?.onlyAutomatic ?? false;

    const retval = {
      url: data.url,
      title: data.title,
    };

    for (const andThen of data.entry.andThen) {
      const type = AndThen._types[andThen.type];

      if (onlyAutomatic && !type.automatic) { continue; }

      const response = await type.callback(andThen, {...data, url: retval.url, title: retval.title});

      if ('url' in response) { retval.url = response.url; }
      if ('title' in response) { retval.title = response.title; }
    }

    return retval;
  }

  /** @type {{[name: string]: AndThen_TypeImpl}} */
  static _types = /** @type {const} */ ({
    'set-url': {
      automatic: true,
      callback: async function(andThen, data) {
        const regex = new RegExp(data.entry.regexStr);
        const matches = data.url.toString().match(regex);

        let retval = `${data.url.protocol}//${andThen.values[0].value}`;
        for (let i = 1; i < matches.length; ++i) {
          retval = retval.replaceAll(`{{${i}}}`, matches[i]);
        }

        return {url: new URL(retval)};
      },
    },

    'set-title': {
      automatic: true,
      callback: async function(andThen, data) {
        if (data.title == null) { return {}; }

        const regex = new RegExp(andThen.values[0].value);
        const matches = data.title.match(regex);
        if (matches == null) { return {}; }

        let retval = `${andThen.values[1].value}`;
        for (let i = 1; i < matches.length; ++i) {
          retval = retval.replaceAll(`{{${i}}}`, matches[i]);
        }

        return {title: retval};
      },
    },
  })
}
