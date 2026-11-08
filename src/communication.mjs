/** @import {ProcessedEntry, ProcessedEntry_Path, BookmarksAndPathsResponse} from './bookmarks.mjs' */
/** @import {OptionType} from './options/opts.mjs' */
/** @import {CommunicationActionCallback} from '../common/browser/plugins/background/base-communication.mjs' */
/** @import {BaseOptionsSetExtras} from '../common/browser/plugins/background/base-options.mjs' */

import { BaseCommunication } from "../common/browser/plugins/background/base-communication.mjs";
import { Bookmarks } from "./bookmarks.mjs";
import { Options } from "./options/opts.mjs";
import { Tabs } from "./tabs.mjs";

/** Response_GetOpts_Data
 * @typedef {object} Response_GetOpts_Data
 * @property {OptionType} result
 */
/** Action_SetOpts_Data
 * @typedef {object} Action_SetOpts_Data
 * @property {OptionType} options
 * @property {BaseOptionsSetExtras} extras
 */
/** Response_GetSaveUsingBookmark_Data
 * @typedef {object} Response_GetSaveUsingBookmark_Data
 * @property {boolean} result
 */
/** Response_GetDefaultOptions_Data
 * @typedef {object} Response_GetDefaultOptions_Data
 * @property {OptionType} result
 */

/** Action_MoveTabTo_Data
 * @typedef {object} Action_MoveTabTo_Data
 * @property {number} tabID
 * @property {string} url
 */

/** Action_AddBookmark_Data
 * @typedef {object} Action_AddBookmark_Data
 * @property {number} tabID
 * @property {string} url
 * @property {string} title
 * @property {ProcessedEntry} entry
 * @property {ProcessedEntry_Path} path
 */
/** Action_MoveBookmark_Data
 * @typedef {object} Action_MoveBookmark_Data
 * @property {string} bookmarkID
 * @property {ProcessedEntry_Path} path
 */
/** Action_RemoveBookmark_Data
 * @typedef {object} Action_RemoveBookmark_Data
 * @property {string} bookmarkID
 */

/** Action_GetBookmarkEntryMatching_Data
 * @typedef {object} Action_GetBookmarkEntryMatching_Data
 * @property {string} url
 */
/** Response_GetBookmarkEntryMatching_Data
 * @typedef {object} Response_GetBookmarkEntryMatching_Data
 * @property {ProcessedEntry|null} result
 */
/** Action_GetBookmarksAndPathsMatching_Data
 * @typedef {object} Action_GetBookmarksAndPathsMatching_Data
 * @property {string} url
 * @property {ProcessedEntry} entry
 */
/** Response_GetBookmarksAndPathsMatching_Data
 * @typedef {object} Response_GetBookmarksAndPathsMatching_Data
 * @property {BookmarksAndPathsResponse[]} result
 */

/** ActionTypes
 * @typedef {object} ActionTypes
 *
 * @property {{input: {}, result: Response_GetOpts_Data}} get-opts
 * @property {{input: Action_SetOpts_Data, result: void}} set-opts
 * @property {{input: {}, result: Response_GetSaveUsingBookmark_Data}} get-save-using-bookmark
 * @property {{input: {}, result: Response_GetDefaultOptions_Data}} get-default-options
 *
 * @property {{input: Action_MoveTabTo_Data, result: void}} move-tab-to
 *
 * @property {{input: Action_AddBookmark_Data, result: void}} add-bookmark
 * @property {{input: Action_MoveBookmark_Data, result: void}} move-bookmark
 * @property {{input: Action_RemoveBookmark_Data, result: void}} remove-bookmark
 *
 * @property {{input: Action_GetBookmarkEntryMatching_Data, result: Response_GetBookmarkEntryMatching_Data}} get-bookmark-entry-matching
 * @property {{input: Action_GetBookmarksAndPathsMatching_Data, result: Response_GetBookmarksAndPathsMatching_Data}} get-bookmarks-and-paths-matching
 *
 * @property {{input: {}, result: void}} reprocess-bookmarks
 */

/** ActionMap
 * @typedef {{[K in keyof ActionTypes]: ActionTypes[K]['input'] & {action: K}}} ActionMap
 */
/** @typedef {ActionMap[keyof ActionMap]} Actions */

/** ResponseMap
 * @typedef {{[K in keyof ActionTypes]: {response: K} & ([ActionTypes[K]['result']] extends [void] ? {} :  ActionTypes[K]['result'])}} ResponseMap
 */
/** @typedef {ResponseMap[keyof ResponseMap]} Responses */

/** ActionCallbacks
 * @typedef {{[K in keyof ActionTypes]: CommunicationActionCallback<ActionMap[K], ActionTypes[K]['result']>}} ActionCallbacks
 */

export class Communication extends BaseCommunication {
  /** @satisfies {ActionCallbacks} */
  static ACTIONS = {
    'get-opts': async function(port, msg) { return {result: await Options.get()}; },
    'set-opts': async function(port, msg) { await Options.set(msg.options, msg.extras); },
    'get-save-using-bookmark': async function(port, msg) { return {result: await Options.hasBookmarkSaves()}; },
    'get-default-options': async function(port, msg) { return {result: Options.DEFAULT}; },

    'move-tab-to': async function(port, msg) { await Tabs.moveTo(msg.tabID, msg.url); },

    'add-bookmark': async function(port, msg) { await Bookmarks.add(msg.url, msg.title, msg.entry, msg.path, msg.tabID); },
    'move-bookmark': async function(port, msg) { await Bookmarks.move(msg.bookmarkID, msg.path); },
    'remove-bookmark': async function(port, msg) { await Bookmarks.remove(msg.bookmarkID); },

    'get-bookmark-entry-matching': async function(port, msg) { return {result: await Bookmarks.getEntryMatching(msg.url)}; },
    'get-bookmarks-and-paths-matching': async function(port, msg) { return {result: await Bookmarks.getBookmarksAndPathsMatching(msg.url, msg.entry)}; },

    'reprocess-bookmarks': async function(port, msg) { Bookmarks.processEntries(); await Tabs.setIconForActiveTabs(); },
  }

  /**
   * @param {browser.runtime.Port} port
   * @param {Actions} msg
   * @returns {ActionCallbacks[keyof ActionCallbacks] | null}
   */
  static getAction(port, msg) {
    if (msg.action in Communication.ACTIONS) {
      return Communication.ACTIONS[msg.action];
    }

    return null;
  }
}
