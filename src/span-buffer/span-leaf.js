/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class SpanLeaf {

  constructor(children) {
    this.children = children;
    this.indexParent = null;
    let length = 0;
    for (let each of Array.from(this.children)) {
      each.indexParent = this;
      length += each.getLength();
    }
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
    return this.children.length;
  }

  getSpan(index) {
    return this.children[index];
  }

  getSpanIndex(child) {
    let index = (this.indexParent != null ? this.indexParent.getSpanIndex(this) : undefined) || 0;
    if (child) {
      index += this.children.indexOf(child);
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
        spanIndex++;
        spanLocation += childLength;
      } else {
        return {
          span: each,
          location,
          spanIndex,
          spanLocation
        };
      }
    }
  }

  iterateSpans(start, count, operation) {
    for (let i = start, end = start + count, asc = start <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      if (operation(this.children[i]) === false) {
        return false;
      }
    }
  }

  insertSpans(index, spans) {
    for (let each of Array.from(spans)) {
      each.indexParent = this;
      this.length += each.getLength();
    }
    return this.children = this.children.slice(0, index).concat(spans).concat(this.children.slice(index));
  }

  removeSpans(start, removeCount) {
    const end = start + removeCount;
    for (let i = start, end1 = end, asc = start <= end1; asc ? i < end1 : i > end1; asc ? i++ : i--) {
      const each = this.children[i];
      each.indexParent = null;
      this.length -= each.getLength();
    }
    return this.children.splice(start, removeCount);
  }

  /*
  Section: Util
  */

  collapse(spans) {
    return Array.from(this.children).map((each) =>
      spans.push(each));
  }
}

module.exports = SpanLeaf;
