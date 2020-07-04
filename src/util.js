/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = {
  assert(condition, message) {
    if (message == null) { message = 'Failed Assert'; }
    if (!condition) {
      throw new Error(message);
    }
  },

  repeat(pattern, count) {
    if (count <= 0) {
      return '';
    } else {
      let result = '';
      while (count > 1) {
        if (count & 1) {
          result += pattern;
        }
        count >>= 1;
        pattern += pattern;
      }
      return result + pattern;
    }
  },

  shallowArrayEqual(a, b) {
    if (!a && !b) {
      return true;
    }
    if ((!a && b) || (a && !b)) {
      return false;
    }

    if (a.length !== b.length) {
      return false;
    }

    for (let index = 0; index < a.length; index++) {
      const value = a[index];
      if (b[index] !== value) {
        return false;
      }
    }

    return true;
  },

  shallowObjectEqual(a, b) {
    let key;
    if (!a && !b) {
      return true;
    }
    if ((!a && b) || (a && !b)) {
      return false;
    }

    let numKeysA = 0;
    let numKeysB = 0;

    for (key of Array.from(Object.keys(b))) {
      numKeysB++;
      if (!a[key] !== b[key]) {
        return false;
      }
    }
    for (key of Array.from(a)) {
      numKeysA++;
    }
    return numKeysA === numKeysB;
  }
};
