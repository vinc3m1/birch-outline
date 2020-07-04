/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { shallowObjectEqual } = require('../util');
const SpanBuffer = require('../span-buffer');
const RunSpan = require('./run-span');

class RunBuffer extends SpanBuffer {

  constructor(children) {
    super(children);
  }

  getRunCount() {
    return this.spanCount;
  }

  getRun(index) {
    return this.getSpan(index);
  }

  getRunIndex(child) {
    return this.getSpanIndex(child);
  }

  getRuns(start, count) {
    return this.getSpans(start, count);
  }

  iterateRuns(start, count, operation) {
    return this.iterateSpans(start, count, operation);
  }

  insertRuns(start, lines) {
    return this.insertSpans(start, lines);
  }

  removeRuns(start, removeCount) {
    return this.removeSpans(start, removeCount);
  }

  sliceRunsToRange(location, length) {
    return this.sliceSpansToRange(location, length);
  }

  createRun(text) {
    return this.createSpan(text);
  }

  createSpan(text) {
    return new RunSpan(text);
  }

  /*
  Reading attributes
  */

  getAttributesAtIndex(characterIndex, effectiveRange, longestEffectiveRange) {
    const start = this.getSpanInfoAtCharacterIndex(characterIndex);
    const result = start.span.attributes;

    if (effectiveRange) {
      effectiveRange.location = start.spanLocation;
      effectiveRange.length = start.span.getLength();
    }

    if (longestEffectiveRange) {
      this._longestEffectiveRange(start.spanIndex, start.span, longestEffectiveRange, run => shallowObjectEqual(run.attributes, result));
    }

    return result;
  }

  getAttributeAtIndex(attribute, characterIndex, effectiveRange, longestEffectiveRange) {
    const start = this.getSpanInfoAtCharacterIndex(characterIndex);
    const result = start.span.attributes[attribute];

    if (effectiveRange) {
      effectiveRange.location = start.spanLocation;
      effectiveRange.length = start.span.getLength();
    }

    if (longestEffectiveRange) {
      this._longestEffectiveRange(start.spanIndex, start.span, longestEffectiveRange, run => run.attributes[attribute] === result);
    }

    return result;
  }

  _longestEffectiveRange(runIndex, attributeRun, range, shouldExtendRunToInclude) {
    let nextRun;
    let nextIndex = runIndex - 1;
    let currentRun = attributeRun;

    // scan backwards
    while (nextIndex >= 0) {
      nextRun = this.getRun(nextIndex);
      if (shouldExtendRunToInclude(nextRun)) {
        currentRun = nextRun;
        nextIndex--;
      } else {
        break;
      }
    }

    range.location = currentRun.getLocation();
    nextIndex = runIndex + 1;
    currentRun = attributeRun;

    // scan forwards
    while (nextIndex < this.getRunCount()) {
      nextRun = this.getRun(nextIndex);
      if (shouldExtendRunToInclude(nextRun)) {
        currentRun = nextRun;
        nextIndex++;
      } else {
        break;
      }
    }

    range.length = (currentRun.getLocation() + currentRun.getLength()) - range.location;
    return range;
  }

  /*
  Changing attributes
  */

  sliceAndIterateRunsByRange(location, length, operation) {
    const slice = this.sliceRunsToRange(location, length);
    return this.iterateSpans(slice.spanIndex, slice.count, operation);
  }

  setAttributesInRange(attributes, location, length) {
    return this.sliceAndIterateRunsByRange(location, length, run => run.setAttributes(attributes));
  }

  addAttributeInRange(attribute, value, location, length) {
    return this.sliceAndIterateRunsByRange(location, length, run => run.addAttribute(attribute, value));
  }

  addAttributesInRange(attributes, location, length) {
    return this.sliceAndIterateRunsByRange(location, length, run => run.addAttributes(attributes));
  }

  removeAttributeInRange(attribute, location, length) {
    return this.sliceAndIterateRunsByRange(location, length, run => run.removeAttribute(attribute));
  }

  /*
  Changing characters and attributes
  */

  insertRunBuffer(runIndex, index) {}
}

module.exports = RunBuffer;
