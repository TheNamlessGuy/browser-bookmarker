const Communication = {
  init: async function() {
    browser.runtime.onConnect.addListener(Communication._onConnect);
  },

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
    'save': async function(msg) { await Opts.set(msg.opts, msg.extras); },
    'get-options': async function() { return {result: await Opts.get()}; },
    'save-using-bookmark': async function() { return {result: BookmarkOpts._saveUsingBookmark}; },
    'get-default-options': async function() { return {result: Opts._default}; },

    'tabs--move-to': async function(msg) { await Tabs.moveTo(msg.tabID, msg.url); },

    'bookmarks--remove': async function(msg) { await Bookmarks.remove(msg.bookmarkID); },
    'bookmarks--add': async function(msg) { await Bookmarks.add(msg.url, msg.title, msg.entry, msg.path); },
    'bookmarks--move': async function(msg) { await Bookmarks.move(msg.bookmarkID, msg.path); },
    'bookmarks--get-entry-matching': async function(msg) { return {result: await Bookmarks.getEntryMatching(msg.url)}; },
    'bookmarks--get-bookmark-and-path-matching': async function(msg) { return {result: await Bookmarks.getBookmarkAndPathMatching(msg.url, msg.entry)}; },
    'bookmarks--reprocess-entries': async function() { Bookmarks.processEntries(); await Tabs.setIconForActiveTabs(); }
  },
};