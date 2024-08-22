const Tabs = {
  /**
   * @returns {Promise<void>}
   */
  init: async function() {
    if (!browser.tabs.onUpdated.hasListener(Tabs._onUpdated)) {
      browser.tabs.onUpdated.addListener(Tabs._onUpdated);
    }

    if (!browser.tabs.onActivated.hasListener(Tabs._onActivated)) {
      browser.tabs.onActivated.addListener(Tabs._onActivated);
    }
  },

  /**
   * @param {BrowserTabActivatedInfo} activeInfo TODO
   */
  _onActivated: async function(activeInfo) {
    await Tabs.setIconForActiveTab(activeInfo.windowId);
  },

  /**
   * @param {number} tabID
   * @param {BrowserTabUpdatedInfo} changeInfo
   * @param {BrowserTab} tabInfo
   * @returns {Promise<void>}
   */
  _onUpdated: async function(tabID, changeInfo, tabInfo) {
    if (changeInfo.status === 'complete') {
      await Tabs.setIconForTab(tabID, tabInfo.url);
    } else if (changeInfo.status === 'loading' && 'url' in changeInfo) {
      const from = `${new URL(changeInfo.url).protocol}//${tabInfo.title}`;
      if (from !== changeInfo.url) {
        await Bookmarks.updateRedirectIfApplicable(from, changeInfo.url);
      }
    }
  },

  /**
   * @returns {Promise<void>}
   */
  setIconForActiveTabs: async function() {
    const windows = await browser.windows.getAll({windowTypes: ['normal']});
    for (const window of windows) {
      await Tabs.setIconForActiveTab(window.id);
    }
  },

  /**
   * @param {number} windowID
   * @returns {Promise<void>}
   */
  setIconForActiveTab: async function(windowID) {
    const tab = (await browser.tabs.query({active: true, windowId: windowID}))[0];
    await Tabs.setIconForTab(tab.id, tab.url);
  },

  /**
   * @param {number} tabID
   * @param {string} url
   * @returns {Promise<void>}
   */
  setIconForTab: async function(tabID, url) {
    if (tabID != null && url != null) {
      const {state, title} = await Bookmarks.getStateAndTitleFor(url);
      await Icon.setState(tabID, state, title);
    }
  },

  /**
   * @param {number} tabID
   * @param {string} url
   * @returns {Promise<void>}
   */
  moveTo: async function(tabID, url) {
    await browser.tabs.update(tabID, {url: url});
  },
};