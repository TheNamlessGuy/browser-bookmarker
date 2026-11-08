/** @import {ActionTypes} from '../../communication.mjs' */
/** @import {HandleBookmarkData} from '../../popups.mjs' */
/** @import {ProcessedEntry, BookmarksAndPathsResponse, ProcessedEntry_Path} from '../../bookmarks.mjs' */
/** @import {CommunicationActionSender, CommunicationActionMethods} from '../../../common/browser/plugins/foreground/base-communication.mjs' */

import { onDOMContentLoaded } from "../../../common/browser/general/onDOMContentLoaded.mjs";
import { BaseCommunication } from "../../../common/browser/plugins/foreground/base-communication.mjs";

export class Communication extends BaseCommunication {
  static _sendTypedAction = /** @type {CommunicationActionSender<ActionTypes>} */ (BaseCommunication._sendAction);

  /** @type {CommunicationActionMethods<ActionTypes>} */
  static actions = {
    'get-opts': async function() { return (await Communication._sendTypedAction('get-opts')).result; },
    'set-opts': async function(data) { await Communication._sendTypedAction('set-opts', data); },
    'get-save-using-bookmark': async function() { return (await Communication._sendTypedAction('get-save-using-bookmark')).result; },
    'get-default-options': async function() { return (await Communication._sendTypedAction('get-default-options')).result; },

    'move-tab-to': async function(data) { await Communication._sendTypedAction('move-tab-to', data); },

    'add-bookmark': async function(data) { await Communication._sendTypedAction('add-bookmark', data) },
    'move-bookmark': async function(data) { await Communication._sendTypedAction('move-bookmark', data); },
    'remove-bookmark': async function(data) { await Communication._sendTypedAction('remove-bookmark', data); },

    'get-bookmark-entry-matching': async function(data) { return (await Communication._sendTypedAction('get-bookmark-entry-matching', data)).result; },
    'get-bookmarks-and-paths-matching': async function(data) { return (await Communication._sendTypedAction('get-bookmarks-and-paths-matching', data)).result; },

    'reprocess-bookmarks': async function() { await Communication._sendTypedAction('reprocess-bookmarks'); },
  }
}

export class QueryParameters {
  /** @returns {HandleBookmarkData} */
  static data() {
    const url = new URL(window.location.href);
    return JSON.parse(url.searchParams.get('data'));
  }

  /** @returns {number} */
  static tabID() {
    const url = new URL(window.location.href);
    return parseInt(url.searchParams.get('tabID'), 10);
  }
}

export class Bookmarks {
  static elements = /** @type {const} */ ({
    get container() { return /** @type {HTMLDivElement} */ (document.getElementById('bookmark-container')); },
    get addBtn() { return /** @type {HTMLButtonElement} */ (document.getElementById('add-btn')); },
    get addPaths() { return /** @type {HTMLSelectElement} */ (document.getElementById('add-paths')); },
  })

  /**
   * @param {HandleBookmarkData} data
   * @param {ProcessedEntry} entry
   * @param {BookmarksAndPathsResponse[]} bookmarks
   */
  static init(data, entry, bookmarks) {
    // "Add new bookmark"
    Bookmarks._setPaths(entry.paths, Bookmarks.elements.addPaths);
    Bookmarks.elements.addBtn.addEventListener('click', () => {
      void Communication.actions['add-bookmark']({
        url: data.tab.url,
        title: data.tab.title,
        entry: entry,
        path: Bookmarks._getSelectedPath(Bookmarks.elements.addPaths, entry),
        tabID: QueryParameters.tabID(),
      });
      window.close();
    });

    // Already added bookmarks
    for (let i = 0; i < bookmarks.length; ++i) {
      Bookmarks._addBookmarkElement(data, entry, bookmarks[i].bookmark, bookmarks[i].path);
      Bookmarks.elements.container.appendChild(document.createElement('hr'));
    }
  }

  /**
   * @param {ProcessedEntry_Path[]} paths
   * @param {HTMLSelectElement} select
   */
  static _setPaths(paths, select) {
    while (select.firstChild != null) { select.removeChild(select.firstChild); }

    for (const path of paths) {
      const option = document.createElement('option');
      option.value = path.title;
      option.innerText = path.title;
      select.appendChild(option);
    }
  }

  /**
   * @param {HTMLSelectElement} select
   * @param {ProcessedEntry} entry
   * @returns {ProcessedEntry_Path|null}
   */
  static _getSelectedPath(select, entry) {
    return entry.paths.find(x => x.title === select.value) ?? null;
  }

  /**
   * @param {HandleBookmarkData} data
   * @param {ProcessedEntry} entry
   * @param {browser.bookmarks.BookmarkTreeNode} bookmark
   * @param {ProcessedEntry_Path} path
   */
  static _addBookmarkElement(data, entry, bookmark, path) {
    const container = document.createElement('div');

    const select = document.createElement('select');
    Bookmarks._setPaths(entry.paths, select);
    select.value = path.title;
    select.addEventListener('change', () => moveBtn.disabled = select.value === path.title);
    container.appendChild(select);

    const moveBtn = document.createElement('button');
    moveBtn.innerText = 'Move bookmark';
    moveBtn.addEventListener('click', () => {
      void Communication.actions['move-bookmark']({bookmarkID: bookmark.id, path: Bookmarks._getSelectedPath(select, entry)});
      window.close();
    });
    container.appendChild(moveBtn);

    select.dispatchEvent(new Event('change'));

    if (data.tab.url !== bookmark.url) {
      const moveToBtn = document.createElement('button');
      moveToBtn.innerText = 'Move to bookmark';
      moveToBtn.addEventListener('click', () => {
        void Communication.actions['move-tab-to']({tabID: data.tab.id, url: bookmark.url});
        window.close();
      });
      container.appendChild(moveToBtn);
    }

    const removeBtn = document.createElement('button');
    removeBtn.innerText = 'Remove bookmark';
    removeBtn.addEventListener('click', () => {
      void Communication.actions['remove-bookmark']({bookmarkID: bookmark.id});
      window.close();
    });
    container.appendChild(removeBtn);

    Bookmarks.elements.container.appendChild(container);
  }
}

onDOMContentLoaded(async () => {
  const tabID = QueryParameters.tabID();

  await Communication.init(tabID);

  const data = QueryParameters.data();
  const entry = await Communication.actions['get-bookmark-entry-matching']({url: data.tab.url});
  if (entry == null) {
    window.close();
    return;
  }

  const bookmarks = await Communication.actions['get-bookmarks-and-paths-matching']({url: data.tab.url, entry: entry});
  const defaultPath = entry.paths.find(x => x.default) ?? null;
  if (bookmarks.length === 0 && defaultPath != null && !data.ignoreDefault) {
    await Communication.actions['add-bookmark']({
      url: data.tab.url,
      title: data.tab.title,
      entry: entry,
      path: defaultPath,
      tabID: tabID,
    });
    window.close();
  } else {
    Bookmarks.init(data, entry, bookmarks);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('loaded').classList.remove('hidden');
  }
});
