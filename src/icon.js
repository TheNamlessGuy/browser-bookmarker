const Icon = {
  state: {
    PROCESSING: 'res/icons/processing',
    BOOKMARKED: 'res/icons/favorited',
    NOT_BOOKMARKED: 'res/icons/not-favorited',
    BOOKMARKED_WITH_OTHER_URL: 'res/icons/favorited-other-url',
  },

  /**
   * @param {number} tabID
   * @returns {Promise<boolean>}
   */
  isShown: async function(tabID) {
    return await browser.pageAction.isShown({tabId: tabID});
  },

  /**
   * @param {number} tabID
   * @param {string} state
   * @param {string} title
   * @returns {Promise<void>}
   */
  show: async function(tabID, state, title) {
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
  },

  /**
   * @param {number} tabID
   * @returns {Promise<void>}
   */
  hide: async function(tabID) {
    await browser.pageAction.hide(tabID);
  },

  /**
   * @param {number} tabID
   * @param {string} state
   * @param {string} title
   * @returns {Promise<void>}
   */
  setState: async function(tabID, state, title) {
    if (state == null) {
      await Icon.hide(tabID);
    } else {
      await Icon.show(tabID, state, title);
    }
  },

  /**
   * @returns {Promise<void>}
   */
  init: async function() {
    if (!browser.pageAction.onClicked.hasListener(Icon._onClicked)) {
      browser.pageAction.onClicked.addListener(Icon._onClicked);
    }
  },

  /**
   * @param {BrowserTab} tab TODO
   * @param {BrowserOnPageActionClickedData} onClickData TODO
   */
  _onClicked: async function(tab, onClickData) {
    Popups.open.handleBookmark(tab.id, {
      tab: {
        id: tab.id,
        url: tab.url,
        title: tab.title,
      },

      ignoreDefault: onClickData.modifiers.includes('Shift') || onClickData.button === 1,
    });
  },
};