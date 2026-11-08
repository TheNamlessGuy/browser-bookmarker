import { Bookmarks } from "./bookmarks.mjs";
import { Icon } from "./icon.mjs";

export class Tabs {
  static async init() {
    if (!browser.tabs.onUpdated.hasListener(Tabs._onUpdated)) {
      browser.tabs.onUpdated.addListener(Tabs._onUpdated);
    }

    if (!browser.tabs.onActivated.hasListener(Tabs._onActivated)) {
      browser.tabs.onActivated.addListener(Tabs._onActivated);
    }
  }

  static async setIconForActiveTabs() {
    const windows = await browser.windows.getAll({windowTypes: ['normal']});
    for (const window of windows) {
      await Tabs.setIconForActiveTab(window.id);
    }
  }

  /** @param {number} windowID */
  static async setIconForActiveTab(windowID) {
    const tabs = await browser.tabs.query({active: true, windowId: windowID});
    await Tabs.setIconForTab(tabs[0].id, tabs[0].url);
  }

  /**
   * @param {number} tabID
   * @param {string} url
   */
  static async setIconForTab(tabID, url) {
    if (tabID != null && url != null) {
      const {state, title} = await Bookmarks.getStateAndTitleFor(url);
      await Icon.setState(tabID, state, title);
    }
  }

  /**
   * @param {number} tabID
   * @param {string} url
   */
  static async moveTo(tabID, url) {
    await browser.tabs.update(tabID, {url: url});
  }

  /** @param {browser.tabs._OnActivatedActiveInfo} info */
  static async _onActivated(info) {
    await Tabs.setIconForActiveTab(info.windowId);
  }

  /**
   * @param {number} tabID
   * @param {browser.tabs._OnUpdatedChangeInfo} info
   * @param {browser.tabs.Tab} tab
   */
  static async _onUpdated(tabID, info, tab) {
    if (info.status === 'complete') {
      await Tabs.setIconForTab(tabID, tab.url);
    }
  }
}
