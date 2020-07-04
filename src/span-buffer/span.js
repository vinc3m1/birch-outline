/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const _ = require('underscore-plus');

class Span {

  constructor(string) {
    if (string == null) { string = ''; }
    this.string = string;
    this.indexParent = null;
  }

  clone() {
    return new this.constructor(this.string);
  }

  split(location) {
    if ((location === 0) || (location === this.getLength())) {
      return null;
    }

    const clone = this.clone();
    clone.deleteRange(0, location);
    this.deleteRange(location, this.getLength() - location);
    return clone;
  }

  mergeWithSpan(span) {
    return false;
  }

  /*
  Section: Characters
  */

  getLocation() {
    return this.indexParent.getLocation(this) || 0;
  }

  getLength() {
    return this.string.length;
  }

  getEnd() {
    return this.getLocation() + this.getLength();
  }

  getString() {
    return this.string;
  }

  setString(string) {
    if (string == null) { string = ''; }
    const delta = (string.length - this.string.length);
    this.string = string;
    if (delta) {
      let each = this.indexParent;
      while (each) {
        each.length += delta;
        each = each.indexParent;
      }
    }
    return this;
  }

  replaceRange(location, length, string) {
    const newString = this.string.substr(0, location) + string + this.string.slice(location + length);
    return this.setString(newString);
  }

  deleteRange(location, length) {
    return this.replaceRange(location, length, '');
  }

  insertString(location, string) {
    return this.replaceRange(location, 0, string);
  }

  appendString(string) {
    return this.insertString(this.getLength(), string);
  }

  /*
  Section: Spans
  */

  getRoot() {
    let each = this.indexParent;
    while (each) {
      if (each.isRoot) {
        return each;
      }
      each = each.indexParent;
    }
    return null;
  }

  getSpanIndex() {
    return this.indexParent.getSpanIndex(this);
  }

  getSpanCount() {
    return 1;
  }

  /*
  Section: Debug
  */

  toString(extra) {
    if (extra) {
      return `(${this.getString()}/${extra})`;
    } else {
      return `(${this.getString()})`;
    }
  }
}

module.exports = Span;
