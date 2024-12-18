/** ProcessedEntry
 * @typedef {object} ProcessedEntry
 * @property {RegExp} regex,
 * @property {string} regexStr,
 * @property {{key: string, value?: string, optional: boolean}[]} parameters
 * @property {string} area
 * @property {AreaOptions} opts
 * @property {EntryPath[]} paths
 * @property {EntryAndThen[]} andThen
 */

const Bookmarks = {
   /**
    * @type {ProcessedEntry[]}
    */
  _entries: [],
  _processingEntries: true,

  /**
   * @returns {Promise<void>}
   */
  init: async function() {
    await Bookmarks.processEntries();

    if (!browser.bookmarks.onCreated.hasListener(Bookmarks._onCreated)) {
      browser.bookmarks.onCreated.addListener(Bookmarks._onCreated);
    }

    if (!browser.bookmarks.onMoved.hasListener(Bookmarks._onMoved)) {
      browser.bookmarks.onMoved.addListener(Bookmarks._onMoved);
    }

    if (!browser.bookmarks.onRemoved.hasListener(Bookmarks._onRemoved)) {
      browser.bookmarks.onRemoved.addListener(Bookmarks._onRemoved);
    }
  },

  /**
   * @returns {Promise<void>}
   */
  processEntries: async function() {
    Bookmarks._processingEntries = true;
    Bookmarks._entries = [];

    const opts = await Opts.get();
    for (const area of opts.areas) {
      let areaRoot = area.prefix.root;
      let areaPath = area.prefix.path;

      if (areaRoot === 'prefix') {
        areaPath = opts.general.prefix.path.concat(areaPath);
        areaRoot = opts.general.prefix.root;
      }

      for (const entry of area.entries) {
        const processed = {
          regex: new RegExp(entry.regex),
          regexStr: entry.regex,
          area: area.name ?? '',
          parameters: [],
          paths: [],
          opts: area.opts,
          andThen: JSON.parse(JSON.stringify(entry.andThen)),
        };

        // Parameters
        for (const parameter of entry.parameters) {
          const p = {
            key: null,
            optional: false,
          };

          if (!parameter.includes('=')) {
            p.key = parameter;
          } else {
            const split = parameter.split('=');
            p.key = split[0];
            p.value = split[1];
          }

          if (p.key.endsWith('?')) {
            p.optional = true;
            p.key = p.key.substring(0, p.key.length - 1);
          }

          processed.parameters.push(p);
        }

        // Paths
        for (const path of entry.paths) {
          const p = {
            title: path.title,
            default: path.default,
            root: path.root,
            path: path.path,
          };

          if (p.root === 'prefix') {
            p.path = areaPath.concat(p.path);
            p.root = areaRoot;
          }

          processed.paths.push(p);
        }

        Bookmarks._entries.push(processed);
      }
    }

    Bookmarks._processingEntries = false;
    Tabs.setIconForActiveTabs();
  },

  /**
   * @param {BrowserURL} url TODO
   * @param {boolean} includeQueryParams
   * @returns {string}
   */
  _urlToString: function(url, includeQueryParams) {
    url = includeQueryParams ? url.toString() : url.origin + url.pathname;
    url = decodeURIComponent(url);
    return url;
  },

  /**
   * @param {string} url
   * @param {Entry} entry
   * @returns {BrowserURL}
   */
  format: function(url, entry) {
    url = new URL(url);
    let retval = new URL(Bookmarks._urlToString(url, false));

    for (const param of entry.parameters) {
      if (!url.searchParams.has(param.key)) {
        if (param.optional) { continue; }

        return null;
      }

      const value = url.searchParams.get(param.key);
      if (!('value' in param) || value === param.value) {
        retval.searchParams.set(param.key, value);
      } else {
        return null;
      }
    }

    return retval;
  },

  /**
   * @param {string} url
   * @returns {Entry|null}
   */
  getEntryMatching: function(url) {
    for (const entry of Bookmarks._entries) {
      const formatted = Bookmarks.format(url, entry);
      if (formatted == null) { continue; }

      const matches = Bookmarks._urlToString(formatted, false).match(entry.regex);
      if (matches) {
        return entry;
      }
    }

    return null;
  },

  /**
   * @param {string} id
   * @param {EntryPath} path TODO
   * @param {number} idx
   * @returns {Promise<boolean>}
   */
  _folderMatchesPath: async function(id, path, idx) {
    const folder = (await browser.bookmarks.get(id))[0];
    if (folder.title !== path.path[idx]) {
      return false;
    } else if (idx === 0) {
      return folder.parentId === path.root;
    }

    return Bookmarks._folderMatchesPath(folder.parentId, path, idx - 1);
  },

  /**
   * @param {EntryPath} path
   * @returns {BrowserBookmark|null}
   */
  getBookmarksFolderForPath: async function(path) {
    const idx = path.path.length - 1;
    const contenders = await browser.bookmarks.search({title: path.path[idx]});
    for (const contender of contenders) {
      if (contender.type !== 'folder') { continue; }

      const match = idx === 0 ? await Bookmarks._folderMatchesPath(contender.id, path, idx) : await Bookmarks._folderMatchesPath(contender.parentId, path, idx - 1);
      if (match) {
        return contender;
      }
    }

    return null;
  },

  /**
   * @param {string[]} path
   * @returns {BrowserBookmark}
   */
  getOrCreateBookmarksFolderForPath: async function(path) {
    let folder = (await browser.bookmarks.getSubTree(path.root))[0];

    for (const segment of path.path) {
      const match = folder.children.find(x => x.title === segment);
      if (match != null) {
        folder = match;
      } else {
        folder = await browser.bookmarks.create({
          parentId: folder.id,
          title: segment,
          type: 'folder',
        });

        folder.children = [];
      }
    }

    return folder;
  },

  /**
   * @param {string} url
   * @param {Entry} entry
   * @returns {{bookmark: BrowserBookmark|null, path: EntryPath|null}[]}
   */
  getBookmarksAndPathsMatching: async function(url, entry) {
    url = Bookmarks.format(url, entry);
    const response = await AndThen.do({
      url: url,
      title: null,
      entry: entry,
      tabID: null, // The automatic AndThen shouldn't need this
    }, true);
    url = Bookmarks._urlToString(response.url, true);
    const results = await browser.bookmarks.search({url: url});

    const retval = [];
    for (let r = 0; r < results.length; ++r) {
      for (const path of entry.paths) {
        const folder = await Bookmarks.getBookmarksFolderForPath(path, false);
        if (folder != null && results[r].parentId === folder.id) {
          retval.push({bookmark: results[r], path: path});
        }
      }
    }

    return retval;
  },

  /**
   * @param {string} url
   * @returns {state: string, title: string}
   */
  getStateAndTitleFor: async function(url) {
    // What entry would this URL fall under?
    const entry = await Bookmarks.getEntryMatching(url);
    if (entry == null) {
      if (Bookmarks._processingEntries) {
        return {
          state: Icon.state.PROCESSING,
          title: 'Processing bookmarker entries...',
        };
      }

      return {state: null, title: null};
    }

    // Do we have any bookmarks under this entry/url combo?
    const data = await Bookmarks.getBookmarksAndPathsMatching(url, entry);
    if (data.length === 0) {
      return {
        state: Icon.state.NOT_BOOKMARKED,
        title: `Add '${entry.area}' bookmark`,
      };
    }

    let title = '';
    let state = Icon.state.BOOKMARKED_WITH_OTHER_URL;
    for (let i = 0; i < data.length; ++i) {
      const entry = data[i];

      if (i === data.length - 1) {
        title += ', and ';
      } else if (i > 0) {
        title += ', ';
      }

      if (entry.bookmark.url === url) {
        title += entry.path.title;
        state = Icon.state.BOOKMARKED;
      } else {
        title += `${entry.path.title} (but with another URL)`;
      }
    }

    return {state, title};
  },

  /**
   * @param {string} url
   * @param {string} title
   * @param {Entry} entry
   * @param {string[]} path
   * @param {number} tabID
   * @returns {Promise<void>}
   */
  add: async function(url, title, entry, path, tabID) {
    const folder = await Bookmarks.getOrCreateBookmarksFolderForPath(path);

    url = Bookmarks.format(url, entry);
    const response = await AndThen.do({
      url: url,
      title: title,
      entry: entry,
      tabID: tabID,
    });
    url = Bookmarks._urlToString(response.url, true);

    await browser.bookmarks.create({
      parentId: folder.id,
      title: response.title,
      url: url,
      type: 'bookmark',
    });
  },

  /**
   * @param {string} bookmarkID
   * @param {string[]} path
   * @returns {Promise<void>}
   */
  move: async function(bookmarkID, path) {
    const folder = await Bookmarks.getOrCreateBookmarksFolderForPath(path);
    await browser.bookmarks.move(bookmarkID, {parentId: folder.id});
  },

  /**
   * @param {string} bookmarkID
   * @returns {Promise<void>}
   */
  remove: async function(bookmarkID) {
    await browser.bookmarks.remove(bookmarkID);
  },

  /**
   * @param {string} fromURL
   * @param {string} toURL
   * @returns {Promise<void>}
   */
  updateRedirectIfApplicable: async function(fromURL, toURL) {
    const entry = await Bookmarks.getEntryMatching(fromURL);
    if (entry == null || !entry.opts.followRedirects) { return; }

    const data = await Bookmarks.getBookmarksAndPathsMatching(fromURL, entry);
    for (const entry of data) {
      await browser.bookmarks.update(entry.bookmark.id, {url: toURL});
    }
  },

  /**
   * @param {string} id
   * @param {BrowserBookmark} bookmark
   * @returns {Promise<void>}
   */
  _onCreated: async function(id, bookmark) {
    if (bookmark.type === 'bookmark') {
      await Tabs.setIconForActiveTabs();
    }
  },

  /**
   * @param {string} id
   * @param {BrowserBookmarkMoveInfo} moveInfo TODO
   * @returns {Promise<void>}
   */
  _onMoved: async function(id, moveInfo) {
    await Tabs.setIconForActiveTabs();
  },

  /**
   * @param {string} parentID
   * @param {BrowserBookmarkRemoveInfo} removeInfo TODO
   * @returns {Promise<void>}
   */
  _onRemoved: async function(parentID, removeInfo) {
    await Tabs.setIconForActiveTabs();
  },
};