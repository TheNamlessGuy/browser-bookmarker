const Bookmarks = {
  /*
    * [{
    *   regex: /blah.com\/.*\/user/,
    *   parameters: [{key: 'search', value?: string, optional: boolean}, ...],
    *   area: string,
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
          folder: null,
          parameters: [],
          paths: [],
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

  getOrCreateBookmarksFolderForPath: async function(path, create) {
    let folder = JSON.parse(JSON.stringify(await browser.bookmarks.getTree()));
    folder = folder[0].children.find(x => x.id === path.root);

    for (const segment of path.path) {
      const match = folder.children.find(x => x.title === segment);
      if (match != null) {
        folder = match;
      } else if (create) {
        folder = await browser.bookmarks.create({
          parentId: folder.id,
          title: segment,
          type: 'folder',
        });

        if (!('children' in folder)) { folder.children = []; }
      } else {
        return null;
      }
    }

    return folder;
  },

  getBookmarkAndPathMatching: async function(url, entry) {
    const formatted = Bookmarks._urlToString(Bookmarks.format(url, entry), true);
    const results = await browser.bookmarks.search({url: formatted});

    for (let r = 0; r < results.length; ++r) {
      for (const path of entry.paths) {
        const folder = await Bookmarks.getOrCreateBookmarksFolderForPath(path, false);
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
        title: `Bookmarked as a(n) '${entry.area}' ${path.title}`,
      };
    }

    return {
      state: Icon.state.BOOKMARKED_WITH_OTHER_URL,
      title: `Bookmarked as a(n) '${entry.area}' ${path.title} (but with another URL)`,
    };
  },

  add: async function(url, title, entry, path) {
    const folder = await Bookmarks.getOrCreateBookmarksFolderForPath(path, true);

    await browser.bookmarks.create({
      parentId: folder.id,
      title: title,
      url: Bookmarks._urlToString(Bookmarks.format(url, entry), true),
      type: 'bookmark',
    });
  },

  move: async function(bookmarkID, path) {
    const folder = await Bookmarks.getOrCreateBookmarksFolderForPath(path, true);
    await browser.bookmarks.move(bookmarkID, {parentId: folder.id});
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