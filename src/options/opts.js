const Opts = {
  _default: {
    /**
     * {
     *   name: string|null,
     *   prefix: {
     *     root: ''|'prefix'|'toolbar_____'|'menu________',
     *     path: string[],
     *   },
     *   entries: {
     *     regex: string,
     *     parameters: string[],
     *     paths: {
     *       title: string,
     *       root: 'prefix'|'toolbar_____'|'menu________',
     *       path: string[],
     *       default: boolean,
     *     }[],
     *   }[],
     * }[]
     */
    areas: [],
    general: {
      prefix: {
        root: '', // ''|'toolbar_____'|'menu________'
        path: [], // string[]
      }
    },
  },

  init: async function() {
    let {opts, changed} = await BookmarkOpts.init(Opts._default);

    if (!('genral' in opts)) {
      opts.general = JSON.parse(JSON.stringify(Opts._default.general));
      changed = true;
    }

    if (!('areas' in opts)) {
      opts.areas = JSON.parse(JSON.stringify(Opts._default.areas));
      changed = true;
    }

    if ('entries' in opts) { // Old data - convert
      opts.areas.push({
        name: null,
        prefix: {root: '', path: []},
        entries: JSON.parse(JSON.stringify(opts.entries)),
      });

      delete opts.entries;
      changed = true;
    }

    if (changed) {
      Opts.set(opts);
    }
  },

  get: async function() {
    const opts = await BookmarkOpts.get();
    if (opts != null && Object.keys(opts).length > 0) {
      return opts;
    }

    await Opts.init();
    return await Opts.get();
  },

  set: async function(opts, extras = {}) {
    await BookmarkOpts.set(opts, extras);
  },
};