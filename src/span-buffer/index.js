/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const SpanBranch = require('./span-branch');
const SpanLeaf = require('./span-leaf');
const {Emitter} = require('event-kit');
const { assert } = require('../util');
const Span = require('./span');

class SpanBuffer extends SpanBranch {
  static initClass() {
  
    /*
    Section: Changing
    */
  
    this.prototype.isChanging = null;
    Object.defineProperty(this.prototype, 'isChanging',
      {get() { return this.changing !== 0; }});
  }

  constructor(children) {
    if (children == null) { children = [new SpanLeaf([])]; }
    super(children);
    this.isRoot = true;
    this.emitter = null;
    this.changing = 0;
    this.scheduledChangeEvent = null;
    this.scheduledChangeEventFire = null;
  }

  clone() {
    return super.clone();
  }

  destroy() {
    if (!this.destroyed) {
      this.destroyed = true;
      return (this.emitter != null ? this.emitter.emit('did-destroy') : undefined);
    }
  }

  /*
  Section: Events
  */

  _getEmitter() {
    let emitter;
    if (!(emitter = this.emitter)) {
      this.emitter = (emitter = new Emitter);
    }
    return emitter;
  }

  onDidBeginChanges(callback) {
    return this._getEmitter().on('did-begin-changes', callback);
  }

  onWillChange(callback) {
    return this._getEmitter().on('will-change', callback);
  }

  onDidChange(callback) {
    return this._getEmitter().on('did-change', callback);
  }

  onDidEndChanges(callback) {
    return this._getEmitter().on('did-end-changes', callback);
  }

  onDidDestroy(callback) {
    return this._getEmitter().on('did-destroy', callback);
  }

  groupChanges(changeEvent, callback) {
    this.beginChanges(changeEvent);
    callback();
    return this.endChanges();
  }

  beginChanges(changeEvent) {
    this.changing++;
    if (this.changing === 1) {
      if (this.emitter != null) {
        this.emitter.emit('did-begin-changes');
      }
    }
    if (changeEvent) {
      assert(!this.scheduledChangeEvent, 'Can not have two scheduled change events');
      this.emitter.emit('will-change', changeEvent);
      this.scheduledChangeEvent = changeEvent;
      return this.scheduledChangeEventFire = this.changing;
    }
  }

  endChanges() {
    if (this.scheduledChangeEvent && (this.scheduledChangeEventFire === this.changing)) {
      this.emitter.emit('did-change', this.scheduledChangeEvent);
      this.scheduledChangeEvent = null;
      this.scheduledChangeEventFire = null;
    }
    this.changing--;
    if (this.changing === 0) {
      return (this.emitter != null ? this.emitter.emit('did-end-changes') : undefined);
    }
  }

  /*
  Section: Characters
  */

  substr(location, length) {
    return this.getString().substr(location, length);
  }

  deleteRange(location, length) {
    if (!length) {
      return;
    }
    return this.replaceRange(location, length, '');
  }

  insertString(location, string) {
    if (!string) {
      return;
    }
    return this.replaceRange(location, 0, string);
  }

  replaceRange(location, length, string) {
    let changeEvent;
    if ((location < 0) || ((location + length) > this.getLength())) {
      throw new Error(`Invalide text range: ${location}-${location + length}`);
    }

    if (this.emitter && !this.scheduledChangeEvent) {
      changeEvent = {
        location,
        replacedLength: length,
        insertedString: string
      };
    }

    this.beginChanges(changeEvent);
    if (this.getSpanCount() === 0) {
      this.insertSpans(0, [this.createSpan(string)]);
    } else {
      let start = this.getSpanInfoAtLocation(location);
      const spanLength = start.span.getLength();

      if (((start.location + length) <= spanLength) && (length !== spanLength)) {
        start.span.replaceRange(start.location, length, string);
      } else {
        const slice = this.sliceSpansToRange(location, length);
        if ((start.location === 0) && string.length) {
          start.span.replaceRange(0, start.span.getLength(), string);
          this.removeSpans(slice.spanIndex + 1, slice.count - 1);
        } else {
          this.removeSpans(slice.spanIndex, slice.count);
          if (string) {
            start = this.getSpanInfoAtLocation(location);
            start.span.appendString(string);
          }
        }
      }
    }
    return this.endChanges();
  }

  /*
  Section: Spans
  */

  createSpan(text) {
    return new Span(text);
  }

  insertSpans(spanIndex, spans, adjustChangeEvent) {
    let changeEvent;
    if ((spanIndex < 0) || (spanIndex > this.getSpanCount())) {
      throw new Error(`Invalide span index: ${spanIndex}`);
    }

    if (!spans.length) {
      return;
    }

    if (this.emitter && !this.scheduledChangeEvent) {
      let left;
      const insertedString = (Array.from(spans).map((each) => each.getString())).join('');
      changeEvent = {
        location: (left = __guard__(this.getSpan(spanIndex), x => x.getLocation())) != null ? left : this.getLength(),
        replacedLength: 0,
        insertedString
      };
      if (typeof adjustChangeEvent === 'function') {
        adjustChangeEvent(changeEvent);
      }
    }

    this.beginChanges(changeEvent);
    super.insertSpans(spanIndex, spans);
    return this.endChanges();
  }

  removeSpans(spanIndex, removeCount, adjustChangeEvent) {
    let changeEvent;
    if ((spanIndex < 0) || ((spanIndex + removeCount) > this.getSpanCount())) {
      throw new Error(`Invalide span range: ${spanIndex}-${spanIndex + removeCount}`);
    }

    if (!removeCount) {
      return;
    }

    if (this.emitter && !this.scheduledChangeEvent) {
      let replacedLength = 0;
      this.iterateSpans(spanIndex, removeCount, span => replacedLength += span.getLength());
      changeEvent = {
        location: this.getSpan(spanIndex).getLocation(),
        replacedLength,
        insertedString: ''
      };
      if (typeof adjustChangeEvent === 'function') {
        adjustChangeEvent(changeEvent);
      }
    }

    this.beginChanges(changeEvent);
    super.removeSpans(spanIndex, removeCount);
    return this.endChanges();
  }

  getSpansInRange(location, length, chooseRight) {
    if (chooseRight == null) { chooseRight = false; }
    const range = this.getSpanRangeForCharacterRange(location, length, chooseRight);
    return this.getSpans(range.location, range.length);
  }

  getSpanRangeForCharacterRange(location, length, chooseRight) {
    if (chooseRight == null) { chooseRight = false; }
    if (this.getSpanCount() === 0) {
      return {
        location: 0,
        length: 0
      };
    }
    const start = this.getSpanInfoAtLocation(location, chooseRight);
    const end = this.getSpanInfoAtLocation(location + length, chooseRight);
    if ((end.location === 0) && (end.spanIndex !== start.spanIndex)) {
      end.spanIndex--;
    }
    return {
      location: start.spanIndex,
      length: (end.spanIndex - start.spanIndex) + 1
    };
  }

  getSpanInfoAtCharacterIndex(characterIndex) {
    if (characterIndex < this.getLength()) {
      return this.getSpanInfoAtLocation(characterIndex, true);
    } else {
      throw new Error(`Invalide character index: ${characterIndex}`);
    }
  }

  getSpanInfoAtLocation(location, chooseRight) {
    let spanInfo;
    if (chooseRight == null) { chooseRight = false; }
    if (location > this.getLength()) {
      throw new Error(`Invalide cursor location: ${location}`);
    }
    if (chooseRight) {
      if (location === this.getLength()) {
        const lastSpanIndex = this.getSpanCount() - 1;
        const lastSpan = this.getSpan(lastSpanIndex);
        if (lastSpan) {
          spanInfo = {
            span: lastSpan,
            spanIndex: lastSpanIndex,
            location: lastSpan.getLength(),
            spanLocation: location - lastSpan.getLength()
          };
        } else {
          null;
        }
      } else {
        spanInfo = super.getSpanInfoAtLocation(location + 1);
        spanInfo.location--;
      }
    } else {
      spanInfo = super.getSpanInfoAtLocation(location);
    }
    return spanInfo;
  }

  sliceSpanAtLocation(location) {
    let startSplit;
    const start = this.getSpanInfoAtLocation(location);
    if (startSplit = start.span.split(start.location)) {
      this.insertSpans(start.spanIndex + 1, [startSplit]);
    }
    return start;
  }

  sliceSpansToRange(location, length) {
    assert(length > 0);
    const start = this.sliceSpanAtLocation(location);
    if (start.location === start.span.getLength()) {
      start.spanIndex++;
    }
    const end = this.sliceSpanAtLocation(location + length);
    return {
      spanIndex: start.spanIndex,
      count: (end.spanIndex - start.spanIndex) + 1
    };
  }

  replaceSpansFromLocation(location, spans) {
    let totalLength = 0;
    for (let each of Array.from(spans)) {
      totalLength += each.getLength();
    }
    const slice = this.sliceSpansToRange(location, totalLength);
    this.removeSpans(slice.spanIndex, slice.count);
    return this.insertSpans(slice.spanIndex, spans);
  }

  /*
  Section: Debug
  */

  toString() {
    const spanStrings = [];
    this.iterateSpans(0, this.getSpanCount(), span => spanStrings.push(span.toString()));
    return `${spanStrings.join('')}`;
  }
}
SpanBuffer.initClass();

module.exports = SpanBuffer;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}