/**
 * CJS stub for the ESM-only `rettime` package.
 *
 * rettime only ships an `.mjs` file which Jest's CommonJS module system cannot
 * load without an explicit transformer.  MSW's `define-network.js` only uses
 * `rettime.Emitter` as a lightweight event emitter, so we provide a minimal
 * compatible implementation here.
 *
 * Mapped via jest.config.cjs → client project → moduleNameMapper:
 *   '^rettime$': '<rootDir>/src/client/test-utils/__mocks__/rettime.cjs'
 */
'use strict';

class Emitter {
  constructor() {
    this._listeners = new Map();
  }

  on(type, listener) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(listener);
    return this;
  }

  once(type, listener) {
    const wrapper = (...args) => {
      this.removeListener(type, wrapper);
      return listener(...args);
    };
    return this.on(type, wrapper);
  }

  off(type, listener) {
    return this.removeListener(type, listener);
  }

  removeListener(type, listener) {
    const listeners = this._listeners.get(type);
    if (listeners) {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    }
    return this;
  }

  removeAllListeners(type) {
    if (type == null) {
      this._listeners.clear();
    } else {
      this._listeners.delete(type);
    }
    return this;
  }

  emit(event) {
    const type = event && event.type ? event.type : event;
    const listeners = this._listeners.get(type) || [];
    const wildcard = this._listeners.get('*') || [];
    for (const fn of [...listeners, ...wildcard]) fn(event);
    return listeners.length > 0 || wildcard.length > 0;
  }

  listenerCount(type) {
    return (this._listeners.get(type) || []).length;
  }

  listeners(type) {
    return (this._listeners.get(type) || []).slice();
  }

  // Hooks shim used by rettime.Emitter (newListener, removeListener, beforeEmit)
  get hooks() {
    return {
      on: () => {},
      removeListener: () => {},
    };
  }
}

class TypedEvent extends MessageEvent {}

module.exports = { Emitter, TypedEvent };
