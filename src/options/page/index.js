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

  getOpts: async function() {
    return (await BackgroundPage.send('get-options')).result;
  },

  saveUsingBookmark: async function() {
    return (await BackgroundPage.send('save-using-bookmark')).result;
  },

  getDefaultOpts: async function() {
    return (await BackgroundPage.send('get-default-options')).result;
  },

  save: async function(opts, extras = {}) {
    await BackgroundPage.send('save', {opts: opts, extras: extras});
  },

  reprocessEntries: async function() {
    await BackgroundPage.send('bookmarks--reprocess-entries');
  },
};

const General = {
  get: function() {
    return document.getElementsByTagName('c-general')[0];
  },
};

const Area = {
  container: function() {
    return document.getElementById('area-container');
  },

  add: function(data = null) {
    const area = document.createElement('c-area');
    area.init(General.get(), data);

    area.addEventListener('move-up', () => {
      Area.container().insertBefore(area, area.previousSibling);
      Area._toggleButtonDisabledStates();
    });

    area.addEventListener('move-down', () => {
      Area.container().insertBefore(area, area.nextSibling?.nextSibling);
      Area._toggleButtonDisabledStates();
    });

    Area.container().appendChild(area);
    Area._toggleButtonDisabledStates();
    return area;
  },

  getAll: function() {
    return Array.from(Area.container().getElementsByTagName('c-area'));
  },

  _toggleButtonDisabledStates() {
    const areas = Area.getAll();
    for (let i = 0; i < areas.length; ++i) {
      areas[i].toggleButtonDisabledState(i, areas.length);
    }
  },
};

async function save() {
  const general = General.get();
  const areas = Area.getAll();

  let isValid = true;
  if (!general.isValid()) {
    isValid = false;
  }

  for (const area of areas) {
    if (!area.isValid()) {
      isValid = false;
    }
  }

  if (!isValid) { return; }

  const opts = await BackgroundPage.getDefaultOpts();
  const extras = {
    saveUsingBookmarkOverride: general.saveUsingBookmark,
  };

  opts.general = general.toJSON();

  opts.areas = [];
  for (const area of areas) {
    opts.areas.push(area.toJSON());
  }

  await BackgroundPage.save(opts, extras);
  await BackgroundPage.reprocessEntries();
}

window.addEventListener('DOMContentLoaded', async () => {
  BackgroundPage.init();

  const opts = await BackgroundPage.getOpts();
  General.get().init(opts.general, await BackgroundPage.saveUsingBookmark());

  if (opts.areas.length === 0) {
    Area.add();
  } else {
    for (const area of opts.areas) {
      Area.add(area);
    }
  }

  document.getElementById('add-new-area-btn').addEventListener('click', () => Area.add());
  document.getElementById('toggle-area-collapse').addEventListener('click', () => {
    const areas = Area.getAll();

    const atLeastOneIsOpen = areas.some(x => !x.isCollapsed());
    areas.forEach(x => x.toggleCollapsed(atLeastOneIsOpen));
  });
  document.getElementById('save-btn').addEventListener('click', save);
});