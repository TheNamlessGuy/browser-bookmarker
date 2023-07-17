const Tabs = {
  init: async function() {
    if (!browser.tabs.onUpdated.hasListener(Tabs._onUpdated)) {
      browser.tabs.onUpdated.addListener(Tabs._onUpdated);
    }

    if (!browser.tabs.onActivated.hasListener(Tabs._onActivated)) {
      browser.tabs.onActivated.addListener(Tabs._onActivated);
    }
  },

  _onActivated: async function(activeInfo) {
    await Tabs.setIconForActiveTab(activeInfo.windowId);
  },

  _onUpdated: async function(tabID, changeInfo, tabInfo) {
    await Tabs.setIconForTab(tabID, tabInfo.url);
  },

  setIconForActiveTabs: async function() {
    const windows = await browser.windows.getAll({windowTypes: ['normal']});
    for (const window of windows) {
      await Tabs.setIconForActiveTab(window.id);
    }
  },

  setIconForActiveTab: async function(windowID) {
    const tab = (await browser.tabs.query({active: true, windowId: windowID}))[0];
    await Tabs.setIconForTab(tab.id, tab.url);
  },

  setIconForTab: async function(tabID, url) {
    if (tabID != null && url != null) {
      const {state, title} = await Bookmarks.getStateAndTitleFor(url);
      await Icon.setState(tabID, state, title);
    }
  },

  moveTo: async function(tabID, url) {
    await browser.tabs.update(tabID, {url: url});
  },
};