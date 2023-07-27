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
};

const Template = {
  init: function(template) {
    return template.content.firstElementChild.cloneNode(true);
  },
};

const Error = {
  template: null,

  init: function() {
    Error.template = document.getElementById('template--error');
  },

  add: function(container, msg) {
    const error = Template.init(Error.template);
    error.innerText = msg;
    container.appendChild(error);
    container.classList.remove('hidden');
  },

  clear: function(container) {
    while (container.firstChild != null) {
      container.removeChild(container.lastChild);
    }

    container.classList.add('hidden');
  },

  isEmpty: function(container) {
    return container.getElementsByClassName('error').length === 0;
  }
};

const Area = {
  container: null,
  template: null,

  init: function() {
    Area.container = document.getElementById('area-container');
    Area.template = document.getElementById('template--area');
  },

  create: function(data = {}) {
    const area = Template.init(Area.template);

    const title = area.getElementsByClassName('area-title')[0];
    title.innerText = (data?.name == null || data?.name === '') ? 'No area name' : `Area: ${data.name}`;
    title.addEventListener('click', () => {
      area.getElementsByClassName('content')[0].classList.toggle('hidden');
      area.getElementsByClassName('content-hidden')[0].classList.toggle('hidden');
    });

    const nameInput = area.getElementsByClassName('area-name')[0];
    nameInput.value = data?.name ?? null;
    nameInput.addEventListener('input', () => {
      title.innerText = (nameInput.value == null || nameInput.value === '' ? 'No area name' : `Area: ${nameInput.value}`);
    });

    area.getElementsByClassName('remove-btn')[0].addEventListener('click', () => Area.remove(area));

    const root = area.getElementsByClassName('area-path-root')[0];
    const segments = area.getElementsByClassName('area-path-segments')[0];
    if (data?.prefix?.root != null) {
      root.value = data.prefix.root;
    } else {
      root.value = General.elements.prefix.root.value === '' ? '' : 'prefix';
    }

    if (data?.prefix?.path != null) {
      for (const segment of data.prefix.path) {
        EntryPathSegment.create(segments, segment);
      }
    }

    root.addEventListener('change', () => {
      if (root.value === '' || (root.value === 'prefix' && General.elements.prefix.root.value === '')) { EntryPath.clear(segments); }
      Area._disablePathButtons(area);
    });
    Area._disablePathButtons(area);

    area.getElementsByClassName('add-area-path-segment')[0].addEventListener('click', () => {
      EntryPathSegment.create(segments);
      Area._disablePathButtons(area);
    });
    area.getElementsByClassName('remove-area-path-segment')[0].addEventListener('click', () => {
      EntryPathSegment.remove(segments);
      Area._disablePathButtons(area);
    });

    if (data?.entries == null) {
      Entry.create(area);
    } else {
      for (const entry of data.entries) {
        Entry.create(area, entry);
      }
    }

    area.getElementsByClassName('add-entry-btn')[0].addEventListener('click', () => Entry.create(area));

    Area.container.appendChild(area);
    return area;
  },

  remove: function(area) {
    area.remove();
  },

  elements: {
    root: function(area) {
      return area?.getElementsByClassName('area-path-root')[0];
    },
  },

  validate: function(area) {
    Area._errors.clear(area);

    let entryValid = true;
    for (const entry of area.getElementsByClassName('entry')) {
      if (!Entry.validate(entry)) { entryValid = false; }
    }

    return entryValid && Area._errors.isEmpty(area);
  },

  save: function(area) {
    const opts = {
      name: area.getElementsByClassName('area-name')[0].value,
      prefix: {
        root: area.getElementsByClassName('area-path-root')[0].value,
        path: EntryPath.saveSegments(area.getElementsByClassName('area-path-segments')[0]),
      },
      entries: [],
    };

    for (const entry of area.getElementsByClassName('entry')) {
      opts.entries.push(Entry.save(entry));
    }

    return opts;
  },

  _errors: {
    clear: function(area) {

    },

    add: function(area) {

    },

    isEmpty: function(area) {
      return true;
    },
  },

  _disablePathButtons: function(area) {
    const root = area.getElementsByClassName('area-path-root')[0].value;

    const shouldBeDisabled = root === '' || (root === 'prefix' && General.elements.prefix.root.value === '');

    area.getElementsByClassName('add-area-path-segment')[0].disabled = shouldBeDisabled;
    area.getElementsByClassName('remove-area-path-segment')[0].disabled = shouldBeDisabled || area.getElementsByClassName('area-path-segments')[0].children.length === 0;

    for (const entryPath of area.getElementsByClassName('entry-path')) {
      EntryPath._disablePathSegmentButtons(entryPath);
    }
  },
};

const Entry = {
  template: null,

  init: function() {
    Entry.template = document.getElementById('template--entry');
  },

  create: function(area, data = {}) {
    const entry = Template.init(Entry.template);

    entry.getElementsByClassName('entry-regex')[0].value = data.regex ?? null;
    entry.getElementsByClassName('entry-parameters')[0].value = data.parameters?.join(',') ?? null;

    const paths = entry.getElementsByClassName('entry-paths')[0];
    if (data.paths == null) {
      EntryPath.create(paths);
    } else {
      for (const path of data.paths) {
        EntryPath.create(paths, path);
      }
    }

    entry.getElementsByClassName('add-entry-path-btn')[0].addEventListener('click', () => EntryPath.create(paths));

    entry.getElementsByClassName('remove-entry-btn')[0].addEventListener('click', () => Entry.remove(entry));

    area.getElementsByClassName('entries')[0].appendChild(entry);
    return entry;
  },

  remove: function(entry) {
    entry.remove();
  },

  elements: {
    regex: function(entry) {
      return entry.getElementsByClassName('entry-regex')[0];
    },

    parameters: function(entry) {
      return entry.getElementsByClassName('entry-parameters')[0];
    },

    paths: function(entry) {
      return entry.getElementsByClassName('entry-path');
    },

    errors: function(entry) {
      return entry.getElementsByClassName('errors')[0];
    },
  },

  validate: function(entry) {
    Entry._errors.clear(entry);

    if (Entry.elements.regex(entry).value === '') {
      Entry._errors.add(entry, 'The RegExp value cannot be empty');
    }

    let pathValid = true;
    for (const path of Entry.elements.paths(entry)) {
      if (!EntryPath.validate(path, entry)) { pathValid = false; }
    }

    return pathValid && Entry._errors.isEmpty(entry);
  },

  save: function(entry) {
    const opts = {
      regex: Entry.elements.regex(entry).value,
      parameters: Entry.elements.parameters(entry).value.split(','),
      paths: [],
    };

    if (opts.parameters.length === 1 && opts.parameters[0] === '') {
      opts.parameters = [];
    }

    for (const path of Entry.elements.paths(entry)) {
      opts.paths.push(EntryPath.save(path));
    }

    return opts;
  },

  _errors: {
    clear: function(entry) {
      Error.clear(Entry.elements.errors(entry));
    },

    add: function(entry, msg) {
      Error.add(Entry.elements.errors(entry), msg);
    },

    isEmpty: function(entry) {
      return Error.isEmpty(Entry.elements.errors(entry));
    },
  },
};

const EntryPath = {
  template: null,

  init: function() {
    EntryPath.template = document.getElementById('template--entry-path');
  },

  create: function(container, data = {}) {
    const path = Template.init(EntryPath.template);

    path.getElementsByClassName('remove-path-btn')[0].addEventListener('click', () => EntryPath.remove(path));

    EntryPath.elements.title(path).value = data.title ?? null;

    const defaultCheckbox = EntryPath.elements.default(path);
    defaultCheckbox.checked = data.default ?? false;
    defaultCheckbox.addEventListener('change', () => {
      if (defaultCheckbox.checked) {
        const otherPaths = Entry.elements.paths(EntryPath.elements.entry(path));
        for (const p of otherPaths) {
          if (p === path) { continue; }

          const d = EntryPath.elements.default(p);
          if (d.checked) { d.checked = false; }
        }
      }
    });

    const root = EntryPath.elements.root(path);
    root.value = data.root ?? 'toolbar_____';
    root.addEventListener('change', () => EntryPath._disablePathSegmentButtons(path));

    const segments = EntryPath.elements.segmentsContainer(path);
    for (const segment of data.path ?? []) {
      EntryPathSegment.create(segments, segment);
    }

    EntryPath._disablePathSegmentButtons(path);
    path.getElementsByClassName('add-entry-path-segment')[0].addEventListener('click', () => {
      EntryPathSegment.create(segments);
      EntryPath._disablePathSegmentButtons(path);
    });
    path.getElementsByClassName('remove-entry-path-segment')[0].addEventListener('click', () => {
      EntryPathSegment.remove(segments);
      EntryPath._disablePathSegmentButtons(path);
    });

    container.appendChild(path);
  },

  remove: function(path) {
    path.remove();
  },

  clear: function(segments) {
    while (segments.firstChild != null) {
      segments.removeChild(segments.lastChild);
    }
  },

  elements: {
    entry: function(path) {
      return path?.parentNode?.parentNode;
    },

    area: function(path) {
      return EntryPath.elements.entry(path)?.parentNode.parentNode;
    },

    title: function(path) {
      return path?.getElementsByClassName('entry-path-title')[0];
    },

    root: function(path) {
      return path?.getElementsByClassName('entry-path-root')[0];
    },

    segmentsContainer: function(path) {
      return path?.getElementsByClassName('entry-path-segments')[0];
    },

    default: function(path) {
      return path?.getElementsByClassName('entry-path-default')[0];
    },
  },

  validate: function(path, entry) {
    if (EntryPath.elements.title(path).value === '') {
      Entry._errors.add(entry, 'Path title cannot be empty');
    }

    if (EntryPath._shouldBeDisabled(path)) {
      Entry._errors.add(entry, 'Path root must be calculable');
    }

    if (EntryPath.saveSegments(EntryPath.elements.segmentsContainer(path)).some(x => x.length === 0)) {
      Entry._errors.add(entry, 'Path segments cannot be empty');
    }

    return true;
  },

  saveSegments: function(segments) {
    const retval = [];
    for (const segment of segments.getElementsByClassName('entry-path-segment')) {
      retval.push(segment.getElementsByTagName('input')[0].value);
    }
    return retval;
  },

  save: function(path) {
    return {
      title: EntryPath.elements.title(path).value,
      root: EntryPath.elements.root(path).value,
      path: EntryPath.saveSegments(EntryPath.elements.segmentsContainer(path)),
      default: EntryPath.elements.default(path).checked,
    };
  },

  _disablePathSegmentButtons: function(path) {
    const shouldBeDisabled = EntryPath._shouldBeDisabled(path);

    path.getElementsByClassName('add-entry-path-segment')[0].disabled = shouldBeDisabled;
    path.getElementsByClassName('remove-entry-path-segment')[0].disabled = shouldBeDisabled || path.getElementsByClassName('entry-path-segments')[0].children.length === 0;
  },

  _shouldBeDisabled: function(path) {
    const pathRoot = EntryPath.elements.root(path).value;
    const areaRoot = Area.elements.root(EntryPath.elements.area(path))?.value ?? null;
    const generalRoot = General.elements.prefix.root.value;

    return (pathRoot === 'prefix' && areaRoot === '') || (pathRoot === 'prefix' && areaRoot === 'prefix' && generalRoot === '');
  },
};

const EntryPathSegment = {
  template: null,

  init: function() {
    EntryPathSegment.template = document.getElementById('template--entry-path-segment');
  },

  create: function(container, value = null) {
    const segment = Template.init(EntryPathSegment.template);

    const input = segment.getElementsByTagName('input')[0];
    input.value = value;
    EntryPathSegment._setWidth(input);
    input.addEventListener('input', () => EntryPathSegment._setWidth(input));

    segment.getElementsByTagName('span')[0].classList.toggle('hidden', container.children.length === 0);

    container.appendChild(segment);
  },

  remove: function(container) {
    container.removeChild(container.lastChild);
  },

  _setWidth: function(input) {
    const len = input.value.length + 1;
    input.style.width = `${len < 8 ? 8 : len}ch`;
  },
};

const General = {
  elements: {
    area: null,
    saveUsingBookmark: null,
    prefix: {
      root: null,
      segments: null,
      add: null,
      remove: null,
    },
  },

  init: function() {
    General.elements.area = document.getElementById('general');
    General.elements.saveUsingBookmark = document.getElementById('general--save-using-bookmark');

    General.elements.prefix.root = document.getElementById('general--prefix-root');
    General.elements.prefix.segments = document.getElementById('general--prefix-segments');
    General.elements.prefix.add = document.getElementById('general--prefix-add-segment');
    General.elements.prefix.remove = document.getElementById('general--prefix-remove-segment');
  },

  set: async function(opts) {
    General.elements.saveUsingBookmark.checked = await BackgroundPage.saveUsingBookmark();

    General.elements.prefix.root.value = opts.general.prefix.root;
    General.elements.prefix.root.addEventListener('change', () => {
      if (General.elements.prefix.root.value === '') { EntryPath.clear(General.elements.prefix.segments); }
      General._disabePrefixButtons();
    });
    General._disabePrefixButtons();

    General.elements.prefix.add.addEventListener('click', () => {
      EntryPathSegment.create(General.elements.prefix.segments);
      General._disabePrefixButtons();
    });

    General.elements.prefix.remove.addEventListener('click', () => {
      EntryPathSegment.remove(General.elements.prefix.segments);
      General._disabePrefixButtons();
    });
  },

  save: function() {
    return {
      prefix: {
        root: General.elements.prefix.root.value,
        path: EntryPath.saveSegments(General.elements.prefix.segments),
      },
    };
  },

  validate: function() { // Noop - for now...
    return true;
  },

  _disabePrefixButtons() {
    const shouldBeDisabled = (General.elements.prefix.root.value === '');
    General.elements.prefix.add.disabled = shouldBeDisabled;
    General.elements.prefix.remove.disabled = shouldBeDisabled || General.elements.prefix.segments.children.length === 0;

    for (const area of document.getElementsByClassName('area')) {
      if (area.id === 'general') { continue; }
      Area._disablePathButtons(area);
    }
  },
};

async function save() {
  const opts = await BackgroundPage.getDefaultOpts();
  const extras = {
    saveUsingBookmarkOverride: General.elements.saveUsingBookmark.checked,
  };

  const areas = Array.from(document.getElementsByClassName('area')).filter(x => x.id !== 'general');

  let isValid = General.validate();
  for (const area of areas) {
    if (!Area.validate(area)) { isValid = false; }
  }

  if (!isValid) { return; }

  opts.general = General.save();
  for (const area of areas) {
    opts.areas.push(Area.save(area));
  }

  await BackgroundPage.save(opts, extras);
}

window.addEventListener('DOMContentLoaded', async () => {
  Error.init();
  BackgroundPage.init();
  Area.init();
  Entry.init();
  EntryPath.init();
  EntryPathSegment.init();
  General.init();

  const opts = await BackgroundPage.getOpts();
  General.set(opts);

  if (opts.areas.length === 0) {
    Area.create();
  } else {
    for (const area of opts.areas) {
      Area.create(area);
    }
  }

  document.getElementById('add-new-area-btn').addEventListener('click', () => Area.create(null));
  document.getElementById('save-btn').addEventListener('click', save);
});