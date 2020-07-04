/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const SpanLeaf = require('./span-leaf');

class SpanBranch {

  constructor(children) {
    this.children = children;
    this.indexParent = null;
    let spanCount = 0;
    let length = 0;
    for (let each of Array.from(this.children)) {
      each.indexParent = this;
      spanCount += each.getSpanCount();
      length += each.getLength();
    }
    this.spanCount = spanCount;
    this.length = length;
  }

  clone() {
    const children = [];
    for (let each of Array.from(this.children)) {
      children.push(each.clone());
    }
    return new this.constructor(children);
  }

  /*
  Section: Characters
  */

  getLength() {
    return this.length;
  }

  getString() {
    const strings = [];
    for (let each of Array.from(this.children)) {
      strings.push(each.getString());
    }
    return strings.join('');
  }

  getLocation(child) {
    let length = (this.indexParent != null ? this.indexParent.getLocation(this) : undefined) || 0;
    if (child) {
      for (let each of Array.from(this.children)) {
        if (each === child) {
          break;
        }
        length += each.getLength();
      }
    }
    return length;
  }

  /*
  Section: Spans
  */

  getSpanCount() {
    return this.spanCount;
  }

  getSpan(index) {
    for (let each of Array.from(this.children)) {
      const childSpanCount = each.getSpanCount();
      if (index >= childSpanCount) {
        index -= childSpanCount;
      } else {
        return each.getSpan(index);
      }
    }
  }

  getSpanIndex(child) {
    let index = (this.indexParent != null ? this.indexParent.getSpanIndex(this) : undefined) || 0;
    if (child) {
      for (let each of Array.from(this.children)) {
        if (each === child) {
          break;
        }
        index += each.getSpanCount();
      }
    }
    return index;
  }

  getSpanInfoAtLocation(location, spanIndex, spanLocation) {
    if (spanIndex == null) { spanIndex = 0; }
    if (spanLocation == null) { spanLocation = 0; }
    for (let each of Array.from(this.children)) {
      const childLength = each.getLength();
      if (location > childLength) {
        location -= childLength;
        spanIndex += each.getSpanCount();
        spanLocation += childLength;
      } else {
        return each.getSpanInfoAtLocation(location, spanIndex, spanLocation);
      }
    }
  }

  getSpans(start, count) {
    if (start == null) { start = 0; }
    if (count == null) { count = this.getSpanCount() - start; }

    const spans = [];
    this.iterateSpans(start, count, span => spans.push(span));
    return spans;
  }

  iterateSpans(spanIndex, count, operation) {
    for (let child of Array.from(this.children)) {
      const childSpanCount = child.getSpanCount();
      if (spanIndex < childSpanCount) {
        const used = Math.min(count, childSpanCount - spanIndex);
        if (child.iterateSpans(spanIndex, used, operation) === false) {
          return false;
        }
        if ((count -= used) === 0) {
          break;
        }
        spanIndex = 0;
      } else {
        spanIndex -= childSpanCount;
      }
    }
  }

  insertSpans(spanIndex, spans) {
    this.spanCount += spans.length;

    for (let each of Array.from(spans)) {
      this.length += each.getLength();
    }

    return (() => {
      const result = [];
      for (let i = 0; i < this.children.length; i++) {
        const child = this.children[i];
        const childSpanCount = child.getSpanCount();
        if (spanIndex <= childSpanCount) {
          child.insertSpans(spanIndex, spans);
          if (child instanceof SpanLeaf && (child.children.length > 50)) {
            while (child.children.length > 50) {
              const spilled = child.children.splice(child.children.length - 25, 25);
              const newleaf = new SpanLeaf(spilled);
              child.length -= newleaf.length;
              this.children.splice(i + 1, 0, newleaf);
              newleaf.indexParent = this;
            }
            this.maybeSpill();
          }
          break;
        }
        result.push(spanIndex -= childSpanCount);
      }
      return result;
    })();
  }

  removeSpans(spanIndex, removeCount) {
    let child;
    this.spanCount -= removeCount;
    let i = 0;
    while ((child = this.children[i])) {
      const childSpanCount = child.getSpanCount();
      if (spanIndex < childSpanCount) {
        const childDeleteCount = Math.min(removeCount, childSpanCount - spanIndex);
        const childOldCharactersCount = child.getLength();
        child.removeSpans(spanIndex, childDeleteCount);
        this.length -= (childOldCharactersCount - child.getLength());
        if (childSpanCount === childDeleteCount) {
          this.children.splice(i--, 1);
          child.indexParent = null;
        }
        if ((removeCount -= childDeleteCount) === 0) {
          break;
        }
        spanIndex = 0;
      } else {
        spanIndex -= childSpanCount;
      }
      i++;
    }
    return this.maybeCollapse(removeCount);
  }

  mergeSpans(spanIndex, count) {
    const prev = null;
    let removeStart = spanIndex;
    const removeRanges = [];
    let removeRange = null;
    this.iterateSpans(spanIndex, count, function(each) {
      if (prev != null ? prev.mergeWithSpan(each) : undefined) {
        if (!removeRange) {
          removeRange = {spanIndex: removeStart({count: 0})};
          removeRanges.push(removeRange);
        }
        return removeRange.count++;
      } else {
        removeRange = null;
        return removeStart++;
      }
    });
    return (() => {
      const result = [];
      for (let each of Array.from(removeRanges)) {
        result.push(this.removeSpans(each.spanIndex, each.count));
      }
      return result;
    })();
  }

  /*
  Section: Tree Balance
  */

  maybeSpill() {
    if (this.children.length <= 10) {
      return;
    }

    let current = this;
    while (current.children.length > 10) {
      const spilled = current.children.splice(current.children.length - 5, 5);
      const sibling = new SpanBranch(spilled);
      if (current.indexParent) {
        current.spanCount -= sibling.spanCount;
        current.length -= sibling.length;
        const index = current.indexParent.children.indexOf(current);
        current.indexParent.children.splice(index + 1, 0, sibling);
      } else {
        const copy = new SpanBranch(current.children);
        copy.indexParent = current;
        current.children = [copy, sibling];
        current = copy;
      }
      sibling.indexParent = current.indexParent;
    }
    return current.indexParent.maybeSpill();
  }

  maybeCollapse(removeCount) {
    if ((this.spanCount - removeCount) > 25) {
      return;
    }

    if ((this.children.length > 1) || !(this.children[0] instanceof SpanLeaf)) {
      const spans = [];
      this.collapse(spans);
      this.children = [new SpanLeaf(spans)];
      return this.children[0].indexParent = this;
    }
  }

  collapse(spans) {
    return Array.from(this.children).map((each) =>
      each.collapse(spans));
  }
}

module.exports = SpanBranch;
