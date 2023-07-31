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

  getEntryMatching: async function(url) {
    return (await BackgroundPage.send('bookmarks--get-entry-matching', {url})).result;
  },

  getBookmarkAndPathMatching: async function(url, entry) {
    return (await BackgroundPage.send('bookmarks--get-bookmark-and-path-matching', {url, entry})).result;
  },

  add: async function(url, title, entry, path) {
    await BackgroundPage.send('bookmarks--add', {url, title, entry, path});
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

const Mode = {
  _setPaths: function(entry) {
    const select = document.getElementById('paths');
    while (select.firstChild) {
      select.removeChild(select.lastChild);
    }

    for (const path of entry.paths) {
      const option = document.createElement('option');
      option.value = path.title;
      option.innerText = path.title;
      select.appendChild(option);
    }
  },

  _getSelectedPath: function(entry) {
    const paths = document.getElementById('paths');
    return entry.paths.find(x => x.title === paths.value);
  },

  _loaded: function() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('loaded').classList.remove('hidden');
  },

  add: function(data, entry) {
    const defaultPath = entry.paths.find(x => x.default) ?? null;

    if (defaultPath != null && !data.ignoreDefault) {
      BackgroundPage.add(data.tab.url, data.tab.title, entry, defaultPath);
      window.close();
      return;
    }

    Mode._setPaths(entry);
    document.getElementById('add-mode').classList.remove('hidden');
    document.getElementById('add-btn').addEventListener('click', () => {
      BackgroundPage.add(data.tab.url, data.tab.title, entry, Mode._getSelectedPath(entry));
      window.close();
    });

    Mode._loaded();
  },

  show: function(data, entry, bookmark, path) {
    Mode._setPaths(entry);
    document.getElementById('show-mode').classList.remove('hidden');

    const moveBtn = document.getElementById('move-btn');
    moveBtn.addEventListener('click', () => {
      BackgroundPage.move(bookmark.id, Mode._getSelectedPath(entry));
      window.close();
    });

    const moveToBtn = document.getElementById('move-to-btn');
    moveToBtn.classList.toggle('hidden', data.tab.url === bookmark.url);
    moveToBtn.addEventListener('click', () => {
      BackgroundPage.moveTo(data.tab.id, bookmark.url);
      window.close();
    });

    const removeBtn = document.getElementById('remove-btn');
    removeBtn.addEventListener('click', () => {
      BackgroundPage.remove(bookmark.id);
      window.close();
    });

    const paths = document.getElementById('paths');
    paths.value = path.title;
    paths.addEventListener('change', () => {console.log('paths changed', paths.value, path.title, moveBtn.disabled); moveBtn.disabled = paths.value === path.title; });

    Mode._loaded();
  },
};

window.addEventListener('DOMContentLoaded', async () => {
  BackgroundPage.init();

  const data = JSON.parse(decodeURIComponent(window.location.href.substring(window.location.href.indexOf('?data=') + 6))); // 6 = '?data='.length
  const entry = await BackgroundPage.getEntryMatching(data.tab.url);
  if (entry == null) {
    window.close();
    return;
  }

  const {bookmark, path} = await BackgroundPage.getBookmarkAndPathMatching(data.tab.url, entry);
  if (bookmark == null) {
    Mode.add(data, entry);
  } else {
    Mode.show(data, entry, bookmark, path);
  }
});