const Bookmarks = {
  /*
    * [{
    *   regex: /blah.com\/.*\/user/,
    *   parameters: [{key: 'search', value?: string, optional: boolean}, ...],
    *   area: string,
    *   opts: {
    *     followRedirects: boolean,
    *   },
    *   paths: [{
    *     root: 'toolbar_____',
    *     path: ['Sites', 'blah.com', 'Users'],
    *     title: 'Users',
    *     default: boolean,
    *   }, ...],
    * }]
    */
  _entries: [],
  _processingEntries: true,

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
          area: area.name ?? '',
          parameters: [],
          paths: [],
          opts: area.opts,
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

  _urlToString: function(url, includeQueryParams) {
    url = includeQueryParams ? url.toString() : url.origin + url.pathname;
    url = decodeURIComponent(url);
    return url;
  },

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

  _folderMatchesPath: async function(id, path, idx) {
    const folder = (await browser.bookmarks.get(id))[0];
    if (folder.title !== path.path[idx]) {
      return false;
    } else if (idx === 0) {
      return folder.parentId === path.root;
    }

    return Bookmarks._folderMatchesPath(folder.parentId, path, idx - 1);
  },

  getBookmarksFolderForPath: async function(path) {
    const idx = path.path.length - 1;
    const contenders = await browser.bookmarks.search({title: path.path[idx]});
    for (const contender of contenders) {
      if (contender.type !== 'folder') { continue; }

      const match = await Bookmarks._folderMatchesPath(contender.parentId, path, idx - 1);
      if (match) {
        return contender;
      }
    }

    return null;
  },

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

  getBookmarkAndPathMatching: async function(url, entry) {
    const formatted = Bookmarks._urlToString(Bookmarks.format(url, entry), true);
    const results = await browser.bookmarks.search({url: formatted});

    for (let r = 0; r < results.length; ++r) {
      for (const path of entry.paths) {
        const folder = await Bookmarks.getBookmarksFolderForPath(path, false);
        if (folder != null && results[r].parentId === folder.id) {
          return {bookmark: results[r], path: path};
        }
      }
    }

    return {bookmark: null, path: null};
  },

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
    const {bookmark, path} = await Bookmarks.getBookmarkAndPathMatching(url, entry);
    if (bookmark == null) {
      return {
        state: Icon.state.NOT_BOOKMARKED,
        title: `Add '${entry.area}' bookmark`,
      };
    } else if (bookmark.url === url) {
      return {
        state: Icon.state.BOOKMARKED,
        title: `Bookmarked as a '${entry.area}' ${path.title}`,
      };
    }

    return {
      state: Icon.state.BOOKMARKED_WITH_OTHER_URL,
      title: `Bookmarked as a '${entry.area}' ${path.title} (but with another URL)`,
    };
  },

  add: async function(url, title, entry, path) {
    const folder = await Bookmarks.getOrCreateBookmarksFolderForPath(path);

    await browser.bookmarks.create({
      parentId: folder.id,
      title: title,
      url: Bookmarks._urlToString(Bookmarks.format(url, entry), true),
      type: 'bookmark',
    });
  },

  move: async function(bookmarkID, path) {
    const folder = await Bookmarks.getOrCreateBookmarksFolderForPath(path);
    await browser.bookmarks.move(bookmarkID, {parentId: folder.id});
  },

  remove: async function(bookmarkID) {
    await browser.bookmarks.remove(bookmarkID);
  },

  updateRedirectIfApplicable: async function(fromURL, toURL) {
    const entry = await Bookmarks.getEntryMatching(fromURL);
    if (entry == null || !entry.opts.followRedirects) { return; }

    const {bookmark, path} = await Bookmarks.getBookmarkAndPathMatching(fromURL, entry);
    if (bookmark == null) { return; }

    await browser.bookmarks.update(bookmark.id, {url: toURL});
  },

  _onCreated: async function(id, bookmark) {
    if (bookmark.type === 'bookmark') {
      await Tabs.setIconForActiveTabs();
    }
  },

  _onMoved: async function(id, moveInfo) {
    await Tabs.setIconForActiveTabs();
  },

  _onRemoved: async function(parentID, removeInfo) {
    await Tabs.setIconForActiveTabs();
  },
};