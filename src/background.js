const Background = {
  /**
   * @returns {Promise<void>}
   */
  main: async function() {
    await Opts.init();
    await Communication.init();

    await Icon.init();
    Bookmarks.init(); // No await
    await Tabs.init();
  },
};

Background.main();