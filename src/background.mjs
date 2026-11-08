import { Bookmarks } from "./bookmarks.mjs";
import { Communication } from "./communication.mjs";
import { Icon } from "./icon.mjs";
import { Redirects } from "./redirects.mjs";
import { Tabs } from "./tabs.mjs";

export class Background {
  /**
   * @returns {Promise<void>}
   */
  static async main() {
    await Communication.init();
    await Redirects.init();
    await Icon.init();
    Bookmarks.init(); // No await
    await Tabs.init();
  }
};

Background.main();
