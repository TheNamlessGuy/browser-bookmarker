class Opts extends BaseOptions {
  /**
   * @type {Options}
   */
  static DEFAULT = {
    areas: [],
    general: {
      prefix: {
        root: '',
        path: [],
      }
    },
  }

  /**
   * @returns {Promise<Options>}
   */
  static async get() {
    return await super.get();
  }

  /**
   * @param {Options} opts
   * @param {Partial<{saveUsingBookmark: boolean}>} extras
   * @returns {Promise<void>}
   */
  static async set(opts, extras) {
    await super.set(opts, extras);
  }
}