/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const htmlparser = require('htmlparser2');
const { assert } = require('../util');
const _ = require('underscore-plus');
const Item = require('../item');
const dom = require('../dom');

/*
Serialization
*/

const beginSerialization = function(items, options, context) {
  context.opml = dom.createElement('opml', {version: '2.0'});
  context.elementStack = [];

  context.topElement = function() {
    return this.elementStack[this.elementStack.length - 1];
  };
  context.popElement = function() {
    return this.elementStack.pop();
  };
  context.pushElement = function(element) {
    return this.elementStack.push(element);
  };

  const headElement = dom.createElement('head');
  const bodyElement = dom.createElement('body');

  dom.appendChild(context.opml, headElement);
  dom.appendChild(context.opml, bodyElement);
  return context.pushElement(bodyElement);
};

const beginSerializeItem = function(item, options, context) {
  const parentElement = context.topElement();
  const outlineElement = dom.createElement('outline', {id: item.id});
  for (let eachName of Array.from(item.attributeNames)) {
    if ((eachName !== 'id') && (eachName !== 'text')) {
      const eachValue = item.getAttribute(eachName);
      if ((eachName !== 'indent') || (eachValue !== '1')) {
        outlineElement.attribs[eachName] = eachValue;
      }
    }
  }
  dom.appendChild(parentElement, outlineElement);
  return context.pushElement(outlineElement);
};

const serializeItemBody = function(item, bodyAttributedString, options, context) {
  const outlineElement = context.topElement();
  return outlineElement.attribs['text'] = bodyAttributedString.toInlineBMLString();
};

const endSerializeItem = (item, options, context) => context.popElement();

const endSerialization = function(options, context) {
  dom.prettyDOM(context.opml, {p: true});
  return dom.getOuterHTML(context.opml, {
    decodeEntities: true,
    lowerCaseTags: true,
    xmlMode: true
  }
  );
};

/*
Deserialization
*/

const deserializeItems = function(opmlString, outline, options) {
  const parsedDOM = dom.parseDOM(opmlString);
  const opmlElement = dom.getElementsByTagName('opml', parsedDOM, false)[0];
  if (!opmlElement) {
    throw new Error('Could not find <opml> element.');
  }
  const headElement = dom.getElementsByTagName('head', opmlElement.children, false)[0];
  const bodyElement = dom.getElementsByTagName('body', opmlElement.children, false)[0];

  if (bodyElement) {
    dom.normalizeDOM(bodyElement);
    const flatItems = [];
    let eachOutline = dom.firstChild(bodyElement);
    while (eachOutline) {
      createItem(outline, eachOutline, 0, flatItems);
      eachOutline = eachOutline.next;
    }
    const items = Item.buildItemHiearchy(flatItems);
    return items;
  } else {
    throw new Error('Could not find <body> element.');
  }
};

var createItem = function(outline, outlineElement, depth, flatItems, remapIDCallback) {
  assert(outlineElement.name === 'outline', `Expected OUTLINE element but got ${outlineElement.tagName}`);
  const item = outline.createItem('', outlineElement.attribs['id']);
  item.bodyHTMLString = outlineElement.attribs['text'] || '';

  for (let each of Array.from(Object.keys(outlineElement.attribs))) {
    if (each !== 'id') {
      item.setAttribute(each, outlineElement.attribs[each]);
    }
  }

  const itemIndent = item.indent || 1;
  depth = depth + itemIndent;
  item.indent = depth;

  flatItems.push(item);

  let eachOutline = dom.firstChild(outlineElement);
  return (() => {
    const result = [];
    while (eachOutline) {
      createItem(outline, eachOutline, depth, flatItems, remapIDCallback);
      result.push(eachOutline = eachOutline.next);
    }
    return result;
  })();
};

module.exports = {
  beginSerialization,
  beginSerializeItem,
  serializeItemBody,
  endSerializeItem,
  endSerialization,
  deserializeItems
};
