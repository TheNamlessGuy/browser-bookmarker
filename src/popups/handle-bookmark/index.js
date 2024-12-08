const BackgroundPage = {
  _port: null,

  init: function() {
    BackgroundPage._port = browser.runtime.connect();
  },

  send: function(action, extras = {}) {
    return new Promise((resolve) => {
      const listener = (response) => {
        if (response.response === action) {
          BackgroundPage._port.onMessage.removeListener(listener);
          resolve(response);
        }
      };

      BackgroundPage._port.onMessage.addListener(listener);
      BackgroundPage._port.postMessage({action: action, ...JSON.parse(JSON.stringify(extras))});
    });
  },

  /**
   * @param {string} url
   * @returns {Promise<Entry>}
   */
  getEntryMatching: async function(url) {
    return (await BackgroundPage.send('bookmarks--get-entry-matching', {url})).result;
  },

  /**
   * @param {string} url
   * @param {Entry} entry
   * @returns {Promise<result: {bookmark: BrowserBookmark|null, path: EntryPath|null}[]>}
   */
  getBookmarksAndPathsMatching: async function(url, entry) {
    return (await BackgroundPage.send('bookmarks--get-bookmarks-and-paths-matching', {url, entry})).result;
  },

  /**
   * @param {string} url
   * @param {string} title
   * @param {Entry} entry
   * @param {string[]} path
   * @returns {Promise<void>}
   */
  add: async function(url, title, entry, path) {
    await BackgroundPage.send('bookmarks--add', {url, title, entry, path, tabID: QueryParameters.tabID()});
  },

  move: async function(bookmarkID, path) {
    await BackgroundPage.send('bookmarks--move', {bookmarkID, path});
  },

  moveTo: async function(tabID, url) {
    await BackgroundPage.send('tabs--move-to', {tabID, url});
  },

  remove: async function(bookmarkID) {
    await BackgroundPage.send('bookmarks--remove', {bookmarkID});
  },
};

const Bookmarks = {
  /**
   * @param {HandleBookmarkData} data
   * @param {Entry} entry
   * @param {{bookmark: BrowserBookmark|null, path: EntryPath|null}[]} bookmarks
   */
  init: function(data, entry, bookmarks) {
    // "Add new bookmark" stuff
    Bookmarks._setPaths(entry.paths, Bookmarks.elements.addPaths);
    Bookmarks.elements.addBtn.addEventListener('click', () => {
      BackgroundPage.add(data.tab.url, data.tab.title, entry, Bookmarks._getSelectedPath(Bookmarks.elements.addPaths, entry));
      window.close();
    });

    // Already added bookmarks stuff
    for (let i = 0; i < bookmarks.length; ++i) {
      Bookmarks._addBookmarkElement(data, entry, bookmarks[i].bookmark, bookmarks[i].path);
      Bookmarks.elements.container.appendChild(document.createElement('hr'));
    }
  },

  /**
   * @param {EntryPath[]} paths
   * @param {HTMLSelectElement} select
   */
  _setPaths: function(paths, select) {
    while (select.firstChild) {
      select.removeChild(select.lastChild);
    }

    for (const path of paths) {
      const option = document.createElement('option');
      option.value = path.title;
      option.innerText = path.title;
      select.appendChild(option);
    }
  },

  /**
   * @param {HTMLSelectElement} select
   * @param {Entry} entry
   */
  _getSelectedPath: function(select, entry) {
    return entry.paths.find(x => x.title === select.value);
  },

  /**
   * @param {HandleBookmarkData} data
   * @param {Entry} entry
   * @param {BrowserBookmark} bookmark
   * @param {EntryPath} path
   */
  _addBookmarkElement: function(data, entry, bookmark, path) {
    const container = document.createElement('div');

    const select = document.createElement('select');
    Bookmarks._setPaths(entry.paths, select);
    select.value = path.title;
    select.addEventListener('change', () => moveBtn.disabled = select.value === path.title);
    container.appendChild(select);

    const moveBtn = document.createElement('button');
    moveBtn.innerText = 'Move bookmark';
    moveBtn.addEventListener('click', () => {
      BackgroundPage.move(bookmark.id, Bookmarks._getSelectedPath(select, entry));
      window.close();
    });
    container.appendChild(moveBtn);

    select.dispatchEvent(new Event('change'));

    if (data.tab.url !== bookmark.url) {
      const moveToBtn = document.createElement('button');
      moveToBtn.innerText = 'Move to bookmark';
      moveToBtn.addEventListener('click', () => {
        BackgroundPage.moveTo(data.tab.id, bookmark.url);
        window.close();
      });
      container.appendChild(moveToBtn);
    }

    const removeBtn = document.createElement('button');
    removeBtn.innerText = 'Remove bookmark';
    removeBtn.addEventListener('click', () => {
      BackgroundPage.remove(bookmark.id);
      window.close();
    });
    container.appendChild(removeBtn);

    Bookmarks.elements.container.appendChild(container);
  },

  elements: {
    get container() {
      return document.getElementById('bookmark-container');
    },

    get addBtn() {
      return document.getElementById('add-btn');
    },

    get addPaths() {
      return document.getElementById('add-paths');
    },
  },
};

const QueryParameters = {
  /**
   * @returns {HandleBookmarkData}
   */
  data: function() {
    const url = new URL(window.location.href);
    return JSON.parse(url.searchParams.get('data'));
  },

  /**
   * @returns {number}
   */
  tabID: function() {
    const url = new URL(window.location.href);
    return parseInt(url.searchParams.get('tabID'), 10);
  },
};

window.addEventListener('DOMContentLoaded', async () => {
  BackgroundPage.init();

  const data = QueryParameters.data();
  const entry = await BackgroundPage.getEntryMatching(data.tab.url);
  if (entry == null) {
    window.close();
    return;
  }

  const bookmarks = await BackgroundPage.getBookmarksAndPathsMatching(data.tab.url, entry);
  const defaultPath = entry.paths.find(x => x.default) ?? null;
  if (bookmarks.length === 0 && defaultPath != null && !data.ignoreDefault) {
    BackgroundPage.add(data.tab.url, data.tab.title, entry, defaultPath);
    window.close();
  } else {
    Bookmarks.init(data, entry, bookmarks);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('loaded').classList.remove('hidden');
  }
});