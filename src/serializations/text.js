/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { repeat } = require('../util');
const Item = require('../item');

// This is a lossy serialization, both item attributes and attribute runs in
// the body string are lost.

/*
Serialization
*/

const beginSerialization = (items, options, context) => context.lines = [];

const beginSerializeItem = function(item, options, context) {};

const serializeItemBody = (item, bodyAttributedString, options, context) => context.lines.push(repeat('\t', item.depth - options.baseDepth) + bodyAttributedString.string);

const endSerializeItem = function(item, options, context) {};

const emptyEncodeLastItem = (options, context) => context.lines.push('');

const endSerialization = (options, context) => context.lines.join('\n');

/*
Deserialization
*/

const deserializeItemBody = function(item) {};

const deserializeItem = function(text, outline) {
  const item = outline.createItem();
  const indent = text.match(/^\t*/)[0].length + 1;
  const body = text.substring(indent - 1);
  item.indent = indent;
  item.bodyString = body;
  return item;
};

const _parseLinesAndNormalizeIndentation = function(text) {
  text = text.replace(/(\r\n|\n|\r)/gm,'\n');

  let lines = text.split('\n');

  // Hack... don't strip off spaces in case of single line. Otherwise when you
  // copy " some text " and paste, then the leading space is always removed...
  if (lines.length > 1) {
    // Find min length leading space sequence.
    // Replace with tags.
    // Remove any left over spaces.
    let length;
    let spacesPerTab = Number.MAX_VALUE;
    for (let each of Array.from(lines)) {
      ({
        length
      } = each);
      let count = 0;
      let i = 0;
      while (i < length) {
        const char = each[i];
        if (char === ' ') {
          count++;
        } else if (char === '\t') {
          if (count > 0) {
            spacesPerTab = Math.min(spacesPerTab, count);
          }
          count = 0;
        } else {
          break;
        }
        i++;
      }
      if (count > 0) {
        spacesPerTab = Math.min(spacesPerTab, count);
      }
    }

    if (spacesPerTab !== Number.MAX_VALUE) {
      text = lines.join('\n');
      const leadingSpacesRegex = new RegExp('^( {' + spacesPerTab + '})+', 'gm');
      text = text.replace(leadingSpacesRegex, matchText => Array(1 + (matchText.length / spacesPerTab)).join('\t'));
      text = text.replace(/^\s+/gm, function(matchText) {
        const index = matchText.indexOf(' ');
        if (index !== -1) {
          return matchText.substr(0, index);
        } else {
          return matchText;
        }
      });
      lines = text.split('\n');
    }
  }

  return lines;
};

const deserializeItems = function(text, outline, options, deserializeItemCallback) {
  let eachEmpty;
  if (options == null) { options = {}; }
  if (deserializeItemCallback == null) { deserializeItemCallback = deserializeItem; }
  const lines = _parseLinesAndNormalizeIndentation(text);
  const flatItems = [];
  let emptyLines = [];
  for (let eachLine of Array.from(lines)) {
    const eachItem = deserializeItemCallback(eachLine, outline);
    flatItems.push(eachItem);

    if (/^\s*$/.test(eachLine)) {
      emptyLines.push(eachItem);
    } else {
      if (emptyLines.length) {
        for (eachEmpty of Array.from(emptyLines)) {
          eachEmpty.indent = eachItem.indent;
        }
        emptyLines = [];
      }
    }
  }

  if (emptyLines.length) {
    for (eachEmpty of Array.from(emptyLines)) {
      eachEmpty.indent = 1;
    }
  }

  const roots = Item.buildItemHiearchy(flatItems);
  return roots;
};

module.exports = {
  beginSerialization,
  beginSerializeItem,
  serializeItemBody,
  endSerializeItem,
  endSerialization,
  emptyEncodeLastItem,
  deserializeItems
};
