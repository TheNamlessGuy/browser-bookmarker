/** Options
 * @typedef {object} Options
 * @property {Area[]} areas
 * @property {GeneralOptions} general
 */

/** GeneralOptions
 * @typedef {object} GeneralOptions
 * @property {{
 *     root: ''|'toolbar_____'|'menu________',
*     path: string[],
* }} prefix
*/

/** Area
 * @typedef {object} Area
 * @property {string|null} name
 * @property {} prefix TODO
 * @property {AreaOptions} opts
 * @property {Entry[]} entries
 */

/** AreaOptions
 * @typedef {object} AreaOptions
 * @property {boolean} followRedirects
 */

/** Entry
 * @typedef {object} Entry
 * @property {string} regex
 * @property {string[]} parameters
 * @property {EntryPath[]} paths
 * @property {EntryAndThen[]} andThen
 */

/** EntryPath
 * @typedef {object} EntryPath
 * @property {string} title
 * @property {'prefix'|'toolbar_____'|'menu________'} root
 * @property {string[]} path
 * @property {boolean} default
 */

/** EntryAndThen
 * @typedef {object} EntryAndThen
 * @property {string} type
 * @property {{value: string}[]} values
 */

/** OptionsSaveExtras
 * @typedef {object} OptionsSaveExtras
 * @property {boolean} saveUsingBookmarkOverride
 */

const Opts = {
  /**
   * @type {Options}
   */
  _default: {
    areas: [],
    general: {
      prefix: {
        root: '',
        path: [],
      }
    },
  },

  /**
   * @returns {Promise<void>}
   */
  init: async function() {
    let {opts, changed} = await BookmarkOpts.init(Opts._default);

    if ('entries' in opts) { // Old data - convert
      opts.areas.push({
        name: null,
        prefix: {root: '', path: []},
        entries: JSON.parse(JSON.stringify(opts.entries)),
      });

      delete opts.entries;
      changed = true;
    }

    if (!('general' in opts)) {
      opts.general = JSON.parse(JSON.stringify(Opts._default.general));
      changed = true;
    }

    if (!('areas' in opts)) {
      opts.areas = JSON.parse(JSON.stringify(Opts._default.areas));
      changed = true;
    } else {
      for (let a = 0; a < opts.areas.length; ++a) {
        if (!('opts' in opts.areas[a])) {
          opts.areas[a].opts = {followRedirects: false};
          changed = true;
        }

        for (let e = 0; e < opts.areas[a].entries.length; ++e) {
          if (!('andThen' in opts.areas[a].entries[e])) {
            opts.areas[a].entries[e].andThen = [];
            changed = true;
          } else if (opts.areas[a].entries[e].andThen.length > 0 && 'value' in opts.areas[a].entries[e].andThen[0]) {
            changed = true;
            for (let and = 0; and < opts.areas[a].entries[e].andThen.length; ++and) {
              opts.areas[a].entries[e].andThen[and].values = [{value: opts.areas[a].entries[e].andThen[and].value}];
              delete opts.areas[a].entries[e].andThen[and].value;
            }
          }
        }
      }
    }

    if (changed) {
      await Opts.set(opts);
    }
  },

  /**
   * @returns {Promise<Options>}
   */
  get: async function() {
    const opts = await BookmarkOpts.get();
    if (opts != null && Object.keys(opts).length > 0) {
      return opts;
    }

    await Opts.init();
    return await Opts.get();
  },

  /**
   * @param {Options} opts
   * @param {OptionsSaveExtras} extras
   * @returns {Promise<void>}
   */
  set: async function(opts, extras = {}) {
    await BookmarkOpts.set(opts, extras);
  },
};