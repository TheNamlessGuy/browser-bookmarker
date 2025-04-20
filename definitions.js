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