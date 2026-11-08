/** @import {BrowserBookmarks_ToolbarGuid, BrowserBookmarks_MenuGuid} from '../common/browser/plugins/constants.mjs' */
/** @import {OptionType_Area_Options, OptionType_Area_Entry_Path, OptionType_Area_Entry_AndThen} from './options/opts.mjs' */
/** @import {IconState} from './icon.mjs' */

import { AndThen } from "./andthen.mjs";
import { Icon } from "./icon.mjs";
import { Options } from "./options/opts.mjs";
import { Tabs } from "./tabs.mjs";

/** ProcessedEntry
 * @typedef {object} ProcessedEntry
 * @property {RegExp} regex,
 * @property {string} regexStr,
 * @property {ProcessedEntry_Parameter[]} parameters
 * @property {string} area
 * @property {OptionType_Area_Options} opts
 * @property {ProcessedEntry_Path[]} paths
 * @property {OptionType_Area_Entry_AndThen[]} andThen
 */

/** ProcessedEntry_Parameter
 * @typedef {object} ProcessedEntry_Parameter
 * @property {string} key
 * @property {string} [value]
 * @property {boolean} optional
 */

/** ProcessedEntry_Path
 * @typedef {Omit<OptionType_Area_Entry_Path, 'root'> & {root: ''|'prefix'|BrowserBookmarks_ToolbarGuid|BrowserBookmarks_MenuGuid}} ProcessedEntry_Path
 */

/** BookmarksAndPathsResponse
 * @typedef {object} BookmarksAndPathsResponse
 * @property {browser.bookmarks.BookmarkTreeNode|null} bookmark
 * @property {ProcessedEntry_Path|null} path
 */

export class Bookmarks {
  static async init() {
    await Bookmarks.processEntries();

    if (!browser.bookmarks.onCreated.hasListener(Bookmarks._onCreated)) {
      browser.bookmarks.onCreated.addListener(Bookmarks._onCreated);
    }

    if (!browser.bookmarks.onMoved.hasListener(Bookmarks._onMoved)) {
      browser.bookmarks.onMoved.addListener(Bookmarks._onMoved);
    }

    if (!browser.bookmarks.onRemoved.hasListener(Bookmarks._onRemoved)) {
      browser.bookmarks.onRemoved.addListener(Bookmarks._onRemoved);
    }
  }

  /**
   * @param {string} url
   * @param {string} title
   * @param {ProcessedEntry} entry
   * @param {ProcessedEntry_Path} path
   * @param {number} tabID
   */
  static async add(url, title, entry, path, tabID) {
    const folder = await Bookmarks.getOrCreateBookmarksFolderForPath(path);

    const response = await AndThen.do({
      url: Bookmarks.formatURL(url, entry),
      title: title,
      entry: entry,
      tabID: tabID,
    });
    url = Bookmarks._urlToString(response.url, true);

    await browser.bookmarks.create({
      parentId: folder.id,
      title: response.title,
      url: url,
      type: 'bookmark',
    });
  }

  /**
   * @param {string} bookmarkID
   * @param {ProcessedEntry_Path} path
   */
  static async move(bookmarkID, path) {
    const folder = await Bookmarks.getOrCreateBookmarksFolderForPath(path);
    await browser.bookmarks.move(bookmarkID, {parentId: folder.id});
  }

  /**
   * @param {string} bookmarkID
   */
  static async remove(bookmarkID) {
    await browser.bookmarks.remove(bookmarkID);
  }

  /** @type {ProcessedEntry[]} */
  static _entries = []
  static _processingEntries = false

  static async processEntries() {
    Bookmarks._processingEntries = true;
    Bookmarks._entries = [];

    const opts = await Options.get();
    for (const area of opts.areas) {
      let areaRoot = area.prefix.root;
      let areaPath = area.prefix.path;

      if (areaRoot === 'prefix') {
        areaPath = opts.general.prefix.path.concat(areaPath);
        areaRoot = opts.general.prefix.root;
      }

      for (const entry of area.entries) {
        /** @type {ProcessedEntry} */
        const processed = {
          regex: new RegExp(entry.regex),
          regexStr: entry.regex,
          area: area.name ?? '',
          parameters: [],
          paths: [],
          opts: area.opts,
          andThen: JSON.parse(JSON.stringify(entry.andThen)),
        };

        for (const parameter of entry.parameters) {
          /** @type {ProcessedEntry_Parameter} */
          const p = {key: null, optional: false};

          if (!parameter.includes('=')) {
            p.key = parameter;
          } else {
            const split = parameter.split('=');
            p.key = split[0];
            p.value = split[1];
          }

          if (p.key.endsWith('?')) {
            p.optional = true;
            p.key = p.key.substring(0, p.key.length - 1);
          }

          processed.parameters.push(p);
        }

        for (const path of entry.paths) {
          /** @type {ProcessedEntry_Path} */
          const p = {
            title: path.title,
            default: path.default,
            root: path.root,
            path: path.path,
          };

          if (p.root === 'prefix') {
            p.path = areaPath.concat(p.path);
            p.root = areaRoot;
          }

          processed.paths.push(p);
        }

        Bookmarks._entries.push(processed);
      }
    }

    Bookmarks._processingEntries = false;
    Tabs.setIconForActiveTabs();
  }

  /**
   * @param {string} url
   * @param {ProcessedEntry} entry
   * @returns {URL|null}
   */
  static formatURL(url, entry) {
    const urlObj = new URL(url);
    let retval = new URL(Bookmarks._urlToString(urlObj, false));

    for (const param of entry.parameters) {
      const paramHasValue = ('value' in param);

      if (!urlObj.searchParams.has(param.key)) {
        if (param.optional) { continue; }

        return null;
      }

      const value = urlObj.searchParams.get(param.key);
      if (!paramHasValue || param.value === value) {
        retval.searchParams.set(param.key, value);
      } else {
        return null;
      }
    }

    return retval;
  }

  /**
   * @param {string} url
   * @returns {Promise<ProcessedEntry|null>}
   */
  static async getEntryMatching(url) {
    for (const entry of Bookmarks._entries) {
      const formatted = Bookmarks.formatURL(url, entry);
      if (formatted == null) { continue; }

      const matches = Bookmarks._urlToString(formatted, false).match(entry.regex);
      if (matches) {
        return entry;
      }
    }

    return null;
  }

  /**
   * @param {ProcessedEntry_Path} path
   * @returns {Promise<browser.bookmarks.BookmarkTreeNode|null>}
   */
  static async getBookmarksFolderForPath(path) {
    if (path.path.length === 0) {
      const [root] = await browser.bookmarks.get(path.root);
      return root?.type === 'folder' ? root : null;
    }

    const idx = path.path.length - 1;
    const contenders = await browser.bookmarks.search({title: path.path[idx]});
    for (const contender of contenders) {
      if (contender.type !== 'folder') { continue; }

      const match = (idx === 0) ? await Bookmarks._folderMatchesPath(contender.id, path, idx) : await Bookmarks._folderMatchesPath(contender.parentId, path, idx - 1);
      if (match) {
        return contender;
      }
    }

    return null;
  }

  /**
   * @param {ProcessedEntry_Path} path
   * @returns {Promise<browser.bookmarks.BookmarkTreeNode>}
   */
  static async getOrCreateBookmarksFolderForPath(path) {
    let folder = (await browser.bookmarks.getSubTree(path.root))[0];

    for (const segment of path.path) {
      const match = folder.children?.find(x => x.title === segment && x.type === 'folder') ?? null;
      if (match != null) {
        folder = match;
      } else {
        folder = await browser.bookmarks.create({
          parentId: folder.id,
          title: segment,
          type: 'folder',
        });
      }
    }

    return folder;
  }

  /**
   * @param {string} url
   * @param {ProcessedEntry} entry
   * @returns {Promise<BookmarksAndPathsResponse[]>}
   */
  static async getBookmarksAndPathsMatching(url, entry) {
    const urlObj = Bookmarks.formatURL(url, entry);
    const response = await AndThen.do({
      url: urlObj,
      title: null,
      entry: entry,
      tabID: null, // The automatic AndThen shouldn't need this
    }, {onlyAutomatic: true});

    url = Bookmarks._urlToString(response.url, true);
    const results = await browser.bookmarks.search({url: url});

    const retval = [];
    for (let r = 0; r < results.length; ++r) {
      for (const path of entry.paths) {
        const folder = await Bookmarks.getBookmarksFolderForPath(path);
        if (folder != null && results[r].parentId === folder.id) {
          retval.push({bookmark: results[r], path: path});
        }
      }
    }

    return retval;
  }

  /**
   * @param {string} url
   * @returns {Promise<{state: IconState, title: string}|{state: null, title: null}>}
   */
  static async getStateAndTitleFor(url) {
    const entry = await Bookmarks.getEntryMatching(url);
    if (entry == null) {
      if (Bookmarks._processingEntries) {
        return {
          state: Icon.state.PROCESSING,
          title: 'Processing bookmarker entries...',
        };
      }

      return {state: null, title: null};
    }

    const data = await Bookmarks.getBookmarksAndPathsMatching(url, entry);
    if (data.length === 0) {
      return {
        state: Icon.state.NOT_BOOKMARKED,
        title: `Add '${entry.area}' bookmark`,
      };
    }

    let title = '';
    /** @type {IconState} */
    let state = Icon.state.BOOKMARKED_WITH_OTHER_URL;
    for (let i = 0; i < data.length; ++i) {
      const entry = data[i];

      if (i > 0) {
        title += ', ';

        if (i === data.length - 1) {
          title += 'and ';
        }
      }

      if (entry.bookmark.url === url) {
        title += entry.path.title;
        state = Icon.state.BOOKMARKED;
      } else {
        title += `${entry.path.title} (but with another URL)`;
      }
    }

    return {state: state, title: title};
  }

  /**
   * @param {string} fromURL
   * @param {string} toURL
   */
  static async updateToRedirectIfApplicable(fromURL, toURL) {
    const entry = await Bookmarks.getEntryMatching(fromURL);
    if (entry == null || !entry.opts.followRedirects) { return; }

    const data = await Bookmarks.getBookmarksAndPathsMatching(fromURL, entry);
    for (const entry of data) {
      await browser.bookmarks.update(entry.bookmark.id, {url: toURL});
    }
  }

  /**
   * @param {string} id
   * @param {ProcessedEntry_Path} path
   * @param {number} idx
   * @returns {Promise<boolean>}
   */
  static async _folderMatchesPath(id, path, idx) {
    const folders = await browser.bookmarks.get(id);
    const folder = folders[0];
    if (folder.title !== path.path[idx]) {
      return false;
    } else if (idx === 0) {
      return folder.parentId === path.root;
    }

    return Bookmarks._folderMatchesPath(folder.parentId, path, idx - 1);
  }

  /**
   * @param {URL} url
   * @param {boolean} includeQueryParams
   * @returns {string}
   */
  static _urlToString(url, includeQueryParams) {
    const result = new URL(url.href);

    if (!includeQueryParams) {
      result.search = '';
      result.hash = '';
    }

    return result.href;
  }

  /**
   * @param {string} id
   * @param {browser.bookmarks.BookmarkTreeNode} bookmark
   */
  static async _onCreated(id, bookmark) {
    if (bookmark.type === 'bookmark') {
      await Tabs.setIconForActiveTabs();
    }
  }

  /**
   * @param {string} id
   * @param {browser.bookmarks._OnMovedMoveInfo} info
   */
  static async _onMoved(id, info) {
    await Tabs.setIconForActiveTabs();
  }

  /**
   * @param {string} id
   * @param {browser.bookmarks._OnRemovedRemoveInfo} info
   */
  static async _onRemoved(id, info) {
    await Tabs.setIconForActiveTabs();
  }
}
