/** AndThenData
 * @typedef {object} AndThenData
 * @property {BrowserURL} url
 * @property {string} title
 * @property {Entry} entry
 * @property {number} tabID
 */

/** AndThenType
 * @typedef {object} AndThenType
 * @property {boolean} automatic
 * @property {(andThen: EntryAndThen, data: AndThenData) => Promise<AndThenReturnType>} callback
 */

/** AndThenReturnType
 * @typedef {object} AndThenReturnType
 * @property {string} [url]
 * @property {string} [title]
 */

const AndThen = {
  /**
   * @param {AndThenData} data
   * @param {boolean} onlyAutomatic
   * @returns {{url: BrowserURL, title: string}}
   */
  do: async function(data, onlyAutomatic = false) {
    const retval = {
      url: data.url,
      title: data.title,
    };

    for (const andThen of data.entry.andThen) {
      if (onlyAutomatic && !AndThen._types[andThen.type].automatic) { continue; }

      const response = await AndThen._types[andThen.type].callback(andThen, data);

      if ('url' in response) { retval.url = response.url; }
      if ('title' in response) { retval.title = response.title; }
    }

    return retval;
  },

  /**
   * @type {Object.<string, AndThenType>}
   */
  _types: {
    'set-url': {
      automatic: true,
      callback: async function(andThen, data) {
        const regex = new RegExp(data.entry.regexStr);
        const matches = data.url.toString().match(regex);

        let retval = `${data.url.protocol}//${andThen.value}`;
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

        let retval = `${andThen.values[1].value}`;
        for (let i = 1; i < matches.length; ++i) {
          retval = retval.replaceAll(`{{${i}}}`, matches[i]);
        }

        return {title: retval};
      },
    },
  },
}