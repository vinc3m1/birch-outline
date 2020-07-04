/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Extensions;
module.exports =
(Extensions = (function() {
  Extensions = class Extensions {
    static initClass() {
  
      this.PRIORITY_NORMAL = 0;
      this.PRIORITY_FIRST = (-1);
      this.PRIORITY_LAST = 1;
    }

    constructor() {
      this.extensionPointsToExtensions = new Map;
    }

    add(extensionPoint, extension, priority) {
      if (priority == null) { priority = Extensions.PRIORITY_NORMAL; }
      let extensions = this.extensionPointsToExtensions.get(extensionPoint);
      if (!extensions) {
        extensions = [];
        this.extensionPointsToExtensions.set(extensionPoint, extensions);
      }
      extensions.needsSort = true;
      return extensions.push({
        extension,
        priority
      });
    }

    remove(extensionPoint, extension) {
      let result;
      return result = __guard__(this.extensionPointsToExtensions.get(extensionPoint), x => x.filter);
    }

    processExtensions(extensionPoint, callback, returnFirst) {
      const extensions = this.extensionPointsToExtensions.get(extensionPoint);
      if (extensions) {
        if (extensions.needsSort) {
          extensions.sort((a, b) => a.priority - b.priority);
        }
        for (let each of Array.from(extensions)) {
          const result = callback(each);
          if ((result !== undefined) && returnFirst) {
            return result;
          }
        }
      }
    }
  };
  Extensions.initClass();
  return Extensions;
})());


function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}