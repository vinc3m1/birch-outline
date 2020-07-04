/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { assert, shallowObjectEqual } = require('../util');
const Span = require('../span-buffer/span');

// Still trying to figure this out. Isn't really an issue for TaskPaper format,
// but becomes an issue when serializaing to HTML. Question... how do you map
// string name/string value to inline HTML? Automatically embed in a span in
// that case? Maybe should make that translation immediatly... not sure! :)
const validateAttributes = attributes => (() => {
  const result = [];
  for (var attribute in attributes) {
    var value = attributes[attribute];
    assert(typeof attribute === 'string', `Expected ${attribute} to be string`);
    if (value) {
      if (_.isObject(value)) {
        result.push((() => {
          const result1 = [];
          for (attribute in value) {
            value = value[attribute];
            assert(typeof attribute === 'string', `Expected ${attribute} to be string`);
            result1.push(assert(typeof value === 'string', `Expected ${value} to be string`));
          }
          return result1;
        })());
      } else {
        result.push(assert(typeof value === 'string', `Expected ${value} to be string`));
      }
    } else {
      result.push(undefined);
    }
  }
  return result;
})();

class RunSpan extends Span {
  static initClass() {
  
    this.attributes = null;
  }

  constructor(text, attributes) {
    //validateAttributes(@attributes)
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    if (attributes == null) { attributes = {}; }
    this.attributes = attributes;
    super(text);
  }

  clone() {
    const clone = super.clone();
    clone.attributes = Object.assign({}, this.attributes);
    return clone;
  }

  /*
  tagName: null
  Object.defineProperty @::, 'tagName',
    get: -> 'run'
  */

  setAttributes(attributes) {
    if (attributes == null) { attributes = {}; }
    return this.attributes = Object.assign({}, attributes);
  }
    //validateAttributes(@attributes)

  addAttribute(attribute, value) {
    return this.attributes[attribute] = value;
  }
    //validateAttributes(@attributes)

  addAttributes(attributes) {
    return (() => {
      const result = [];
      for (let k in attributes) {
        const v = attributes[k];
        result.push(this.attributes[k] = v);
      }
      return result;
    })();
  }
    //validateAttributes(@attributes)

  removeAttribute(attribute) {
    return delete this.attributes[attribute];
  }

  mergeWithSpan(run) {
    if (shallowObjectEqual(this.attributes, run.attributes)) {
      this.setString(this.string + run.string);
      return true;
    } else {
      return false;
    }
  }

  toString() {
    let name;
    const sortedNames = (() => {
      const result = [];
      for (name in this.attributes) {
        result.push(name);
      }
      return result;
    })();
    sortedNames.sort();
    const nameValues = ((() => {
      const result1 = [];
      for (name of Array.from(sortedNames)) {         result1.push(`${name}:${JSON.stringify(this.attributes[name])}`);
      }
      return result1;
    })());
    return super.toString(nameValues.join('/'));
  }
}
RunSpan.initClass();

module.exports = RunSpan;
