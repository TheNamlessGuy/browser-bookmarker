import { Popups } from "./popups.mjs";

/** @typedef {(typeof Icon.state)[keyof typeof Icon.state]} IconState */

export class Icon {
  static state = /** @type {const} */ ({
    PROCESSING: 'res/icons/processing',
    BOOKMARKED: 'res/icons/favorited',
    NOT_BOOKMARKED: 'res/icons/not-favorited',
    BOOKMARKED_WITH_OTHER_URL: 'res/icons/favorited-other-url',
  })

  static async init() {
    if (!browser.pageAction.onClicked.hasListener(Icon._onClicked)) {
      browser.pageAction.onClicked.addListener(Icon._onClicked);
    }
  }

  /**
   * @param {number} tabID
   * @returns {Promise<boolean>}
   */
  static async isShown(tabID) {
    return await browser.pageAction.isShown({tabId: tabID});
  }

  /**
   * @param {number} tabID
   * @param {string} state
   * @param {string} title
   * @returns {Promise<void>}
   */
  static async show(tabID, state, title) {
    const filetype = state === Icon.state.PROCESSING ? 'gif' : 'png';
    const theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    await browser.pageAction.setIcon({
        tabId: tabID,
        path: {
          48: `${state}/48.${theme}.${filetype}`,
        },
    });

    await browser.pageAction.setTitle({tabId: tabID, title: title});
    await browser.pageAction.show(tabID);
  }

  /**
   * @param {number} tabID
   * @returns {Promise<void>}
   */
  static async hide(tabID) {
    await browser.pageAction.hide(tabID);
  }

  /**
   * @param {number} tabID
   * @param {string} state
   * @param {string} title
   * @returns {Promise<void>}
   */
  static async setState(tabID, state, title) {
    if (state == null) {
      await Icon.hide(tabID);
    } else {
      await Icon.show(tabID, state, title);
    }
  }

  /**
   * @param {browser.tabs.Tab} tab
   * @param {browser.pageAction.OnClickData|undefined} info
   * @returns {Promise<void>}
   */
  static async _onClicked(tab, info) {
    Popups.open.handleBookmark(tab.id ?? browser.tabs.TAB_ID_NONE, {
      tab: {
        id: tab.id ?? browser.tabs.TAB_ID_NONE,
        url: tab.url ?? '',
        title: tab.title ?? '',
      },

      ignoreDefault: (info?.modifiers.includes('Shift') || info?.button === 1) ?? false,
    });
  }
}
