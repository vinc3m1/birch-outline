/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const tagsHelper = require('./tags');
const changeDelegate = require('./change-delegate');
const { repeat } = require('../../util');
const text = require('../text');

const serializeItemBody = function(item, bodyAttributedString, options, context) {
  let bodyString = bodyAttributedString.string;

  if (item.outline.changeDelegate !== changeDelegate) {
    const itemClone = item.clone();

    // Only need to do this if TaskPaper change delegate isn't alreayd keeping
    // attributes in sync with body text.
    let encodedAttributes = [];
    for (let attributeName of Array.from(item.attributeNames)) {
      if (tagsHelper.encodesAttributeName(attributeName)) {
        tagsHelper.addTag(itemClone, attributeName, itemClone.getAttribute(attributeName));
      }
    }

    if (encodedAttributes.length) {
      encodedAttributes = encodedAttributes.join(' ');
      if (bodyString.length) {
        encodedAttributes = ' ' + encodedAttributes;
      }
      bodyString += encodedAttributes;
    }
  }

  return context.lines.push(repeat('\t', item.depth - options.baseDepth) + bodyString);
};

const deserializeItem = function(itemString, outline) {
  const item = outline.createItem();
  const indent = itemString.match(/^\t*/)[0].length + 1;
  let body = itemString.substring(indent - 1);
  item.indent = indent;
  item.bodyString = body;

  if (item.outline.changeDelegate !== changeDelegate) {
    // Unused untested branch. Only need to do this if TaskPaper change
    // delegate isn't already keeping attributes in sync with body text. Idea
    // is to extract attributes from taskpaper body text. Not sure if it's best
    // to
    let removedLength = 0;
    parseTags(body, function(tag, value, match) {
      item.setAttribute(tag, value);
      const index = match.index - removedLength;
      body = body.substring(0, index) + body.substring(index + match[0].length);
      return removedLength += match[0].length;
    });
  }

  return item;
};

const deserializeItems = function(itemsString, outline, options) {
  if (options == null) { options = {}; }
  return text.deserializeItems(itemsString, outline, options, deserializeItem);
};

module.exports = {
  changeDelegate: require('./change-delegate'),
  beginSerialization: text.beginSerialization,
  beginSerializeItem: text.beginSerializeItem,
  serializeItemBody,
  endSerializeItem: text.endSerializeItem,
  endSerialization: text.endSerialization,
  emptyEncodeLastItem: text.emptyEncodeLastItem,
  deserializeItems,
  itemPathTypes: { 'project': true, 'task': true, 'note': true
}
};
