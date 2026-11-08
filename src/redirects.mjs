import { Bookmarks } from "./bookmarks.mjs";
import { Tabs } from "./tabs.mjs";

export class Redirects {
  static async init() {
    /** @type {browser.webRequest.RequestFilter} */
    const filters = {
      urls: ['http://*/*', 'https://*/*'],
      types: ['main_frame'],
    };

    if (!browser.webRequest.onBeforeRedirect.hasListener(Redirects._onBeforeRedirect)) {
      browser.webRequest.onBeforeRedirect.addListener(Redirects._onBeforeRedirect, filters);
    }

    if (!browser.webRequest.onCompleted.hasListener(Redirects._onCompleted)) {
      browser.webRequest.onCompleted.addListener(Redirects._onCompleted, filters);
    }

    if (!browser.webRequest.onErrorOccurred.hasListener(Redirects._onErrorOccurred)) {
      browser.webRequest.onErrorOccurred.addListener(Redirects._onErrorOccurred, filters);
    }
  }

  /** @type {{[requestID: string]: string}} */
  static _origins = {};

  /** @param {browser.webRequest._OnBeforeRedirectDetails} details */
  static _onBeforeRedirect(details) {
    if (details.tabId < 0) { return; }

    if (!details.redirectUrl.startsWith('http://') && !details.redirectUrl.startsWith('https://')) {
      delete Redirects._origins[details.requestId];
      return;
    }

    if (!(details.requestId in Redirects._origins)) {
      Redirects._origins[details.requestId] = details.url;
    }
  }

  /** @param {browser.webRequest._OnCompletedDetails} details */
  static async _onCompleted(details) {
    const from = Redirects._origins[details.requestId];
    delete Redirects._origins[details.requestId];

    if (from == null || from === details.url) { return; }

    /** Status has to be [200-300), or 304 */
    if (!(details.statusCode >= 200 && details.statusCode < 300) && details.statusCode !== 304) {
      return;
    }

    await Bookmarks.updateToRedirectIfApplicable(from, details.url);
    await Tabs.setIconForActiveTabs();
  }

  /** @param {browser.webRequest._OnErrorOccurredDetails} details */
  static _onErrorOccurred(details) {
    delete Redirects._origins[details.requestId];
  }
}
