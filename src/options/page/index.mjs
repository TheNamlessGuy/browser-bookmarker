/** @import {ActionTypes} from '../../communication.mjs' */
/** @import {OptionType_Area} from '../opts.mjs' */
/** @import {CommunicationActionSender, CommunicationActionMethods} from '../../../common/browser/plugins/foreground/base-communication.mjs' */

import { onDOMContentLoaded } from "../../../common/browser/general/onDOMContentLoaded.mjs";
import { BaseCommunication } from "../../../common/browser/plugins/foreground/base-communication.mjs";
import { AreaElement } from "./custom-elements/area.mjs";
import { GeneralElement } from "./custom-elements/general.mjs";

export class Communication extends BaseCommunication {
  static _sendTypedAction = /** @type {CommunicationActionSender<ActionTypes>} */ (BaseCommunication._sendAction);

  /** @type {CommunicationActionMethods<ActionTypes>} */
  static actions = {
    'get-opts': async function() { return (await Communication._sendTypedAction('get-opts')).result; },
    'set-opts': async function(data) { await Communication._sendTypedAction('set-opts', data); },
    'get-save-using-bookmark': async function() { return (await Communication._sendTypedAction('get-save-using-bookmark')).result; },
    'get-default-options': async function() { return (await Communication._sendTypedAction('get-default-options')).result; },

    'move-tab-to': async function(data) { await Communication._sendTypedAction('move-tab-to', data); },

    'add-bookmark': async function(data) { await Communication._sendTypedAction('add-bookmark', data) },
    'move-bookmark': async function(data) { await Communication._sendTypedAction('move-bookmark', data); },
    'remove-bookmark': async function(data) { await Communication._sendTypedAction('remove-bookmark', data); },

    'get-bookmark-entry-matching': async function(data) { return (await Communication._sendTypedAction('get-bookmark-entry-matching', data)).result; },
    'get-bookmarks-and-paths-matching': async function(data) { return (await Communication._sendTypedAction('get-bookmarks-and-paths-matching', data)).result; },

    'reprocess-bookmarks': async function() { await Communication._sendTypedAction('reprocess-bookmarks'); },
  }
}

export class General {
  static get() {
    return /** @type {GeneralElement} */ (document.getElementsByTagName('c-general')[0]);
  }
}

export class Area {
  static container() {
    return /** @type {HTMLDivElement} */ (document.getElementById('area-container'));
  }

  static getAll() {
    return /** @type {AreaElement[]} */ (Array.from(Area.container().getElementsByTagName('c-area')));
  }

  /**
   * @param {OptionType_Area} data
   * @returns {AreaElement}
   */
  static add(data = null) {
    const area = new AreaElement();
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
  }

  static _toggleButtonDisabledStates() {
    const areas = Area.getAll();
    for (let i = 0; i < areas.length; ++i) {
      areas[i].toggleButtonDisabledState(i, areas.length);
    }
  }
}

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

  const opts = await Communication.actions['get-default-options']();
  const extras = {
    saveUsingBookmark: general.saveUsingBookmark,
  };

  opts.general = general.toJSON();

  opts.areas = [];
  for (const area of areas) {
    opts.areas.push(area.toJSON());
  }

  await Communication.actions['set-opts']({options: opts, extras: extras});
  await Communication.actions['reprocess-bookmarks']();
}

onDOMContentLoaded(async () => {
  await Communication.init(-1);

  const opts = await Communication.actions['get-opts']();
  General.get().init(opts.general, await Communication.actions['get-save-using-bookmark']());

  for (const area of opts.areas) {
    Area.add(area);
  }

  document.getElementById('save-btn').addEventListener('click', save);
  document.getElementById('add-new-area-btn').addEventListener('click', () => Area.add());
  document.getElementById('toggle-area-collapse').addEventListener('click', () => {
    const areas = Area.getAll();

    const atLeastOneIsOpen = areas.some(x => !x.isCollapsed());
    areas.forEach(x => x.toggleCollapsed(atLeastOneIsOpen));
  });
});
