const Opts = {
  _default: {
    /**
     * {
     *   name: string|null,
     *   prefix: {
     *     root: ''|'prefix'|'toolbar_____'|'menu________',
     *     path: string[],
     *   },
     *   opts: {
     *     followRedirects: boolean,
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
     *     andThen: {
     *       type: 'set-url',
     *       value: string,
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

    if ('entries' in opts) { // Old data - convert
      opts.areas.push({
        name: null,
        prefix: {root: '', path: []},
        entries: JSON.parse(JSON.stringify(opts.entries)),
      });

      delete opts.entries;
      changed = true;
    }

    if (!('general' in opts)) {
      opts.general = JSON.parse(JSON.stringify(Opts._default.general));
      changed = true;
    }

    if (!('areas' in opts)) {
      opts.areas = JSON.parse(JSON.stringify(Opts._default.areas));
      changed = true;
    } else {
      for (let a = 0; a < opts.areas.length; ++a) {
        if (!('opts' in opts.areas[a])) {
          opts.areas[a].opts = {followRedirects: false};
          changed = true;
        }

        for (let e = 0; e < opts.areas[a].entries.length; ++e) {
          if (!('andThen' in opts.areas[a].entries[e])) {
            opts.areas[a].entries[e].andThen = [];
            changed = true;
          }
        }
      }
    }

    if (changed) {
      await Opts.set(opts);
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