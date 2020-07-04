/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let ItemPathQuery;
const {Emitter, CompositeDisposable} = require('event-kit');
const util = require('./util');
const _ = require('underscore-plus');

// Private: A live query.
module.exports =
(ItemPathQuery = (function() {
  ItemPathQuery = class ItemPathQuery {
    static initClass() {
  
      this.prototype.outline = null;
      this.prototype.outlineSubscription = null;
      this.prototype.outlineDestroyedSubscription = null;
      this.prototype.debouncedRun = null;
  
      /*
      Section: Configuring Queries
      */
  
      // Public: Read-write item path context item.
      this.prototype.contextItem = null;
      Object.defineProperty(this.prototype, 'contextItem', {
        get() {
          return this._contextItem;
        },
        set(_contextItem) {
          this._contextItem = _contextItem;
          return this.scheduleRun();
        }
      }
      );
  
      // Public: Read-write Item path.
      this.prototype.itemPath = null;
      Object.defineProperty(this.prototype, 'itemPath', {
        get() {
          return this._itemPath;
        },
        set(_itemPath) {
          this._itemPath = _itemPath;
          return this.scheduleRun();
        }
      }
      );
  
      // Public: Read-write item path options.
      this.prototype.options = null;
      Object.defineProperty(this.prototype, 'options', {
        get() {
          return this._options;
        },
        set(_options) {
          this._options = _options;
          if ((this._options != null ? this._options.debounce : undefined)) {
            this.debouncedRun = _.debounce(this.run.bind(this), this._options.debounce);
          } else {
            this.debouncedRun = this.run.bind(this);
          }
          return this.scheduleRun();
        }
      }
      );
  
      this.prototype.queryFunction = null;
      Object.defineProperty(this.prototype, 'queryFunction', {
        get() {
          return this._queryFunction;
        },
        set(_queryFunction) {
          this._queryFunction = _queryFunction;
          return this.scheduleRun();
        }
      }
      );
  
      /*
      Section: Running Queries
      */
  
      // Public: Read-only is query started.
      this.prototype.started = false;
  
      /*
      Section: Getting Query Results
      */
  
      // Public: Read-only {Array} of matching {Item}s.
      this.prototype.results = [];
    }

    constructor(outline, itemPath) {
      this.outline = outline;
      this.itemPath = itemPath;
      this.emitter = new Emitter();
      this.debouncedRun = this.run.bind(this);
      this.outlineDestroyedSubscription = this.outline.onDidDestroy(() => this.destroy());
      this.queryFunction = (outline, contextItem, itemPath, options) => outline.evaluateItemPath(itemPath, contextItem, options);
    }

    destroy() {
      if (!this.destroyed) {
        this.stop();
        this.outlineDestroyedSubscription.dispose();
        this.emitter.emit('did-destroy');
        this.outline = null;
        return this.destroyed = true;
      }
    }

    /*
    Section: Events
    */

    // Public: Invoke the given callback when the value of {::results} changes.
    //
    // - `callback` {Function} to be called when the path changes.
    //   - `results` {Array} of matches.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
    onDidChange(callback) {
      return this.emitter.on('did-change', callback);
    }

    // Public: Invoke the given callback when the query is destroyed.
    //
    // - `callback` {Function} to be called when the query is destroyed.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
    onDidDestroy(callback) {
      return this.emitter.on('did-destroy', callback);
    }

    // Public: Start the query.
    start() {
      if (this.started) { return; }
      this.started = true;
      this.outlineSubscription = this.outline.onDidEndChanges(changes => {
        if (changes.length > 0) {
          return this.scheduleRun();
        }
      });
      return this.run();
    }

    // Public: Stop the query.
    stop() {
      if (!this.started) { return; }
      this.started = false;
      return this.outlineSubscription.dispose();
    }

    scheduleRun() {
      if (this.started) {
        return this.debouncedRun();
      }
    }

    run() {
      if (this.started) {
        const nextResults = this.queryFunction(this.outline, this.contextItem, this.itemPath, this.options);
        if (!util.shallowArrayEqual(this.results, nextResults)) {
          this.results = nextResults;
          return this.emitter.emit('did-change', this.results);
        }
      }
    }
  };
  ItemPathQuery.initClass();
  return ItemPathQuery;
})());
