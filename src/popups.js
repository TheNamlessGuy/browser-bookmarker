/** HandleBookmarkData
 * @typedef {object} HandleBookmarkData
 * @property {{id: number, url: string, title: string}} tab
 * @property {boolean} ignoreDefault
 */

const Popups = {
  open: {
    /**
     * @param {number} tabID
     * @param {HandleBookmarkData} data
     * @returns {void}
     */
    handleBookmark: function(tabID, data) {
      Popups.open._do(tabID, 'handle-bookmark', data);
    },

    _do: function(tabID, folderName, data) {
      browser.pageAction.setPopup({tabId: tabID, popup: `/src/popups/${folderName}/index.html?data=${encodeURIComponent(JSON.stringify(data))}&tabID=${tabID}`});
      browser.pageAction.openPopup();
      browser.pageAction.setPopup({tabId: tabID, popup: ''});
    },
  },
};