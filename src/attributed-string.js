/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const RunBuffer = require('./run-buffer');
const {Emitter} = require('event-kit');
const _ = require('underscore-plus');

// Public: A container holding both characters and associated attributes.
//
// ## Examples
//
// Enumerate attribute ranges:
//
// ```javascript
// var effectiveRange = {};
// var textLength = attributedString.length;
// var index = 0;
// while (index < textLength) {
//   console.log(attributedString.getAttributesAtIndex(index, effectiveRange));
//   index += effectiveRange.length;
// }
//```
class AttributedString {
  static initClass() {
  
    /*
    Section: Characters
    */
  
    // Public: Read-only string
    this.prototype.string = null;
  
    this.prototype.length = null;
    Object.defineProperty(this.prototype, 'length',
      {get() { return this.string.length; }});
  }

  /*
  Section: Creating
  */

  // Public: Create a new AttributedString with the given text.
  //
  // - `text` Text content for the AttributedString.
  constructor(text) {
    if (text == null) { text = ''; }
    if (text instanceof AttributedString) {
      this.string = text.getString();
      this.runBuffer = text.runBuffer != null ? text.runBuffer.clone() : undefined;
    } else {
      this.string = text;
    }
  }

  // Public: Return a clone of this AttributedString. The attributes are
  // shallow copied.
  clone(location, length) {
    if (location == null) { location = 0; }
    if (length == null) { length = -1; }
    if (length === -1) {
      length = this.getLength() - location;
    }
    if (length === 0) {
      return new AttributedString();
    } else {
      const clone = new AttributedString(this.string.substr(location, length));
      if (this.runBuffer) {
        const slice = this.runBuffer.sliceSpansToRange(location, length);
        const insertRuns = [];
        this.runBuffer.iterateRuns(slice.spanIndex, slice.count, run => insertRuns.push(run.clone()));
        clone._getRunIndex().replaceSpansFromLocation(0, insertRuns);
      }
      return clone;
    }
  }

  getString() {
    return this.string.toString();
  }

  getLength() {
    return this.string.length;
  }

  substring(start, end) {
    return this.string.substring(start, end);
  }

  substr(start, length) {
    return this.string.substr(start, length);
  }

  charAt(position) {
    return this.string.charAt(position);
  }

  charCodeAt(position) {
    return this.string.charCodeAt(position);
  }

  // Public: Delete characters and attributes in range.
  //
  // - `location` Range start character index.
  // - `length` Range length.
  deleteRange(location, length) {
    if (!length) {
      return;
    }
    return this.replaceRange(location, length, '');
  }

  // Public: Insert text into the string.
  //
  // - `location` Location to insert at.
  // - `text` text to insert.
  insertText(location, text) {
    if (!text.length) {
      return;
    }
    return this.replaceRange(location, 0, text);
  }

  // Public: Append text to the end of the string.
  //
  // - `text` text to insert.
  appendText(text) {
    return this.insertText(this.string.length, text);
  }

  // Public: Replace existing text range with new text.
  //
  // - `location` Replace range start character index.
  // - `length` Replace range length.
  // - `text` text to insert.
  replaceRange(location, length, text) {
    let insertString, textRunBuffer;
    if (length === -1) {
      length = this.getLength() - location;
    }

    if (text instanceof AttributedString) {
      insertString = text.string;
      if (this.runBuffer) {
        textRunBuffer = text._getRunIndex();
      } else {
        textRunBuffer = text.runBuffer;
      }
    } else {
      insertString = text;
    }

    insertString = insertString.split(/\u000d(?:\u000a)?|\u000a|\u2029|\u000c|\u0085/).join('\n');

    this.string = this.string.substr(0, location) + insertString + this.string.substr(location + length);
    if (this.runBuffer != null) {
      this.runBuffer.replaceRange(location, length, insertString);
    }

    if (textRunBuffer && text.length) {
      if (this.runBuffer) {
        this.setAttributesInRange({}, location, text.length);
      }
      const insertRuns = [];
      textRunBuffer.iterateRuns(0, textRunBuffer.getRunCount(), run => insertRuns.push(run.clone()));
      return this._getRunIndex().replaceSpansFromLocation(location, insertRuns);
    }
  }

  /*
  Section: Attributes
  */

  _getRunIndex() {
    let runBuffer;
    if (!(runBuffer = this.runBuffer)) {
      this.runBuffer = (runBuffer = new RunBuffer);
      this.runBuffer.insertString(0, this.string.toString());
    }
    return runBuffer;
  }

  getRuns() {
    if (this.runBuffer) {
      return this.runBuffer.getRuns();
    } else {
      return [];
    }
  }

  getFirstOccuranceOfAttribute(attribute, effectiveRange, longestEffectiveRange) {
    for (let eachRun of Array.from(this.getRuns())) {
      if (eachRun.attributes[attribute] != null) {
        return this.getAttributeAtIndex(attribute, eachRun.getLocation(), effectiveRange, longestEffectiveRange);
      }
    }
    return null;
  }

  // Public: Returns an {Object} with keys for each attribute at the given
  // character index, and by reference the range over which the
  // attributes apply.
  //
  // - `index` The character index.
  // - `effectiveRange` (optional) {Object} whose `location` and `length`
  //    properties are set to effective range of the attributes.
  // - `longestEffectiveRange` (optional) {Object} whose `location` and `length`
  //    properties are set to longest effective range of the attributes.
  getAttributesAtIndex(index, effectiveRange, longestEffectiveRange) {
    if (index >= this.length) {
      throw new Error(`Invalide character index: ${index}`);
    }
    if (this.runBuffer) {
      return this.runBuffer.getAttributesAtIndex(index, effectiveRange, longestEffectiveRange);
    } else {
      if (effectiveRange) {
        effectiveRange.location = 0;
        effectiveRange.length = this.length;
      }
      if (longestEffectiveRange) {
        longestEffectiveRange.location = 0;
        longestEffectiveRange.length = this.length;
      }
      return {};
    }
  }

  // Public: Returns the value for an attribute with a given name of the
  // character at a given character index, and by reference the range over which
  // the attribute applies.
  //
  // - `attribute` Attribute {String} name.
  // - `index` The character index.
  // - `effectiveRange` (optional) {Object} whose `location` and `length`
  //    properties are set to effective range of the attribute.
  // - `longestEffectiveRange` (optional) {Object} whose `location` and `length`
  //    properties are set to longest effective range of the attribute.
  getAttributeAtIndex(attribute, index, effectiveRange, longestEffectiveRange) {
    if (index >= this.length) {
      throw new Error(`Invalide character index: ${index}`);
    }
    if (this.runBuffer) {
      return this.runBuffer.getAttributeAtIndex(attribute, index, effectiveRange, longestEffectiveRange);
    } else {
      if (effectiveRange) {
        effectiveRange.location = 0;
        effectiveRange.length = this.length;
      }
      if (longestEffectiveRange) {
        longestEffectiveRange.location = 0;
        longestEffectiveRange.length = this.length;
      }
      return undefined;
    }
  }

  // Sets the attributes for the characters in the given range to the
  // given attributes. Replacing any existing attributes in the range.
  //
  // - `attributes` {Object} with keys and values for each attribute
  // - `index` Start character index.
  // - `length` Range length.
  setAttributesInRange(attributes, index, length) {
    return this._getRunIndex().setAttributesInRange(attributes, index, length);
  }

  // Public: Adds an attribute to the characters in the given range.
  //
  // - `attribute` The {String} attribute name.
  // - `value` The attribute value.
  // - `index` Start character index.
  // - `length` Range length.
  addAttributeInRange(attribute, value, index, length) {
    return this._getRunIndex().addAttributeInRange(attribute, value, index, length);
  }

  // Public: Adds attributes to the characters in the given range.
  //
  // - `attributes` {Object} with keys and values for each attribute
  // - `index` Start index.
  // - `length` Range length.
  addAttributesInRange(attributes, index, length) {
    return this._getRunIndex().addAttributesInRange(attributes, index, length);
  }

  // Public: Removes the attribute from the given range.
  //
  // - `attribute` The {String} attribute name
  // - `index` Start character index.
  // - `length` Range length.
  removeAttributeInRange(attribute, index, length) {
    if (this.runBuffer) {
      return this.runBuffer.removeAttributeInRange(attribute, index, length);
    }
  }

  /*
  Section: Extracting a Substring
  */

  // Public: Returns an {AttributedString} object consisting of the characters
  // and attributes within a given range in the receiver.
  //
  // - `location` (optional) Range start character index. Defaults to 0.
  // - `length` (optional) Range length. Defaults to end of string.
  attributedSubstringFromRange(location, length) {
    if (location == null) { location = 0; }
    if (length == null) { length = -1; }
    return this.clone(location, length);
  }

  /*
  Section: Debug
  */

  // Public: Returns debug string for this item.
  toString() {
    if (this.runBuffer) {
      return this.runBuffer.toString();
    } else if (this.string) {
      return `(${this.string})`;
    } else {
      return '';
    }
  }
}
AttributedString.initClass();

AttributedString.ObjectReplacementCharacter = '\ufffc';
AttributedString.LineSeparatorCharacter = '\u2028';

module.exports = AttributedString;

require('./attributed-string-from-bml');
require('./attributed-string-to-bml');
