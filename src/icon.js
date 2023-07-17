const Icon = {
  state: {
    PROCESSING: 'res/icons/processing',
    BOOKMARKED: 'res/icons/favorited',
    NOT_BOOKMARKED: 'res/icons/not-favorited',
    BOOKMARKED_WITH_OTHER_URL: 'res/icons/favorited-other-url',
  },

  isShown: async function(tabID) {
    return await browser.pageAction.isShown({tabId: tabID});
  },

  show: async function(tabID, state, title) {
    const filetype = state === Icon.state.PROCESSING ? 'gif' : 'png';

    await browser.pageAction.setIcon({
        tabId: tabID,
        path: {
          16: `${state}/16.${filetype}`,
          19: `${state}/19.${filetype}`,
          32: `${state}/32.${filetype}`,
          38: `${state}/38.${filetype}`,
          48: `${state}/48.${filetype}`,
        },
    });

    await browser.pageAction.setTitle({tabId: tabID, title: title});
    await browser.pageAction.show(tabID);
  },

  hide: async function(tabID) {
    await browser.pageAction.hide(tabID);
  },

  setState: async function(tabID, state, title) {
    if (state == null) {
      await Icon.hide(tabID);
    } else {
      await Icon.show(tabID, state, title);
    }
  },

  init: async function() {
    if (!browser.pageAction.onClicked.hasListener(Icon._onClicked)) {
      browser.pageAction.onClicked.addListener(Icon._onClicked);
    }
  },

  _onClicked: async function(tab, onClickData) {
    const data = {
      tab: {
        id: tab.id,
        url: encodeURIComponent(tab.url),
        title: tab.title,
      },

      ignoreDefault: onClickData.modifiers.includes('Shift') || onClickData.button === 1,
    };

    browser.pageAction.setPopup({tabId: tab.id, popup: `/src/popup/index.html?data=${JSON.stringify(data)}`});
    browser.pageAction.openPopup();
    browser.pageAction.setPopup({tabId: tab.id, popup: ''});
  },
};