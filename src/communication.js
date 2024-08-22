const Communication = {
  /**
   * @returns {Promise<void>}
   */
  init: async function() {
    browser.runtime.onConnect.addListener(Communication._onConnect);
  },

  /**
   * @param {BrowserPort} port
   * @returns {void}
   */
  _onConnect: function(port) {
    port.onMessage.addListener(async (msg) => {
      if (!(msg.action in Communication._map)) {
        return; // What?
      }

      const response = (await Communication._map[msg.action](msg)) ?? {};
      port.postMessage({response: msg.action, ...JSON.parse(JSON.stringify(response))});
    });
  },

  _map: {
    /**
     * @param {{opts: Options, extras: OptionsSaveExtras}} msg
     * @returns {Promise<void>}
     */
    'save': async function(msg) { await Opts.set(msg.opts, msg.extras); },
    /**
     * @returns {Promise<{result: Options}>}
     */
    'get-options': async function() { return {result: await Opts.get()}; },
    /**
     * @returns {Promise<{result: boolean}>}
     */
    'save-using-bookmark': async function() { return {result: BookmarkOpts._saveUsingBookmark}; },
    /**
     * @returns {Promise<{result: Options}>}
     */
    'get-default-options': async function() { return {result: Opts._default}; },

    /**
     * @param {{tabID: number, url: string}} msg
     * @returns {Promise<void>}
     */
    'tabs--move-to': async function(msg) { await Tabs.moveTo(msg.tabID, msg.url); },

    /**
     * @param {{bookmarkID: string}} msg
     * @returns {Promise<void>}
     */
    'bookmarks--remove': async function(msg) { await Bookmarks.remove(msg.bookmarkID); },
    /**
     * @param {{url: string, title: string, entry: Entry, path: string[], tabID: number}} msg
     * @returns {Promise<void>}
     */
    'bookmarks--add': async function(msg) { await Bookmarks.add(msg.url, msg.title, msg.entry, msg.path, msg.tabID); },
    /**
     * @param {{bookmarkID: string, path: string[]}} msg
     * @returns {Promise<void>}
     */
    'bookmarks--move': async function(msg) { await Bookmarks.move(msg.bookmarkID, msg.path); },
    /**
     * @param {{url: string}} msg
     * @returns {Promise<{result: Entry|null}>}
     */
    'bookmarks--get-entry-matching': async function(msg) { return {result: await Bookmarks.getEntryMatching(msg.url)}; },
    /**
     * @param {{url: string, entry: Entry}} msg
     * @returns {Promise<result: {bookmark: BrowserBookmark|null, path: EntryPath|null}>}
     */
    'bookmarks--get-bookmark-and-path-matching': async function(msg) { return {result: await Bookmarks.getBookmarkAndPathMatching(msg.url, msg.entry)}; },
    /**
     * @returns {Promise<void>}
     */
    'bookmarks--reprocess-entries': async function() { Bookmarks.processEntries(); await Tabs.setIconForActiveTabs(); },
  },
};