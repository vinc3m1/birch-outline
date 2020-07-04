/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const AttributedString = require('../attributed-string');
const ElementType = require('domelementtype');
const { assert } = require('../util');
const Birch = require('../birch');
const Item = require('../item');
const dom = require('../dom');

/*
Serialization
*/

const beginSerialization = function(items, options, context) {
  context.html = dom.createElement('html', {xmlns: 'http://www.w3.org/1999/xhtml'});
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

  const head = dom.createElement('head');
  dom.appendChild(context.html, head);
  const expandedIDs = options != null ? options.expandedIDs : undefined;

  if (expandedIDs != null ? expandedIDs.length : undefined) {
    const expandedMeta = dom.createElement('meta', {
      name: 'expandedItems',
      content: expandedIDs.join(' ')
    }
    );
    dom.appendChild(head, expandedMeta);
  }

  const encodingMeta = dom.createElement('meta', {charset: 'UTF-8'});
  dom.appendChild(head, encodingMeta);

  const body = dom.createElement('body');
  dom.appendChild(context.html, body);

  const rootUL = dom.createElement('ul', {id: Birch.RootID});
  dom.appendChild(body, rootUL);
  return context.pushElement(rootUL);
};

const beginSerializeItem = function(item, options, context) {
  let parentElement = context.topElement();
  if (parentElement.name === 'li') {
    context.popElement();
    const ulElement = dom.createElement('ul');
    dom.appendChild(parentElement, ulElement);
    parentElement = ulElement;
    context.pushElement(ulElement);
  }

  const liElement = dom.createElement('li', {id: item.id});
  for (let eachName of Array.from(item.attributeNames)) {
    const eachValue = item.getAttribute(eachName);
    if ((eachName !== 'indent') || (eachValue !== '1')) {
      liElement.attribs[eachName] = eachValue;
    }
  }
  dom.appendChild(parentElement, liElement);

  return context.pushElement(liElement);
};

const serializeItemBody = function(item, bodyAttributedString, options, context) {
  const liElement = context.topElement();
  const pElement = dom.createElement('p');
  bodyAttributedString.toInlineBMLInContainer(pElement);
  context.lastSerializedLI = liElement;
  return dom.appendChild(liElement, pElement);
};

const endSerializeItem = (item, options, context) => context.popElement();

const endSerialization = function(options, context) {
  dom.prettyDOM(context.html, {p: true});
  const result = dom.getOuterHTML(context.html, {
    decodeEntities: true,
    lowerCaseTags: true,
    xmlMode: true
  }
  );
  return '<!DOCTYPE html>\n' + result;
};

/*
Deserialization
*/

const deserializeItems = function(bmlString, outline, options) {
  let left, left1, left2;
  const parsedDOM = dom.parseDOM(bmlString);
  const htmlElement = dom.getElementsByTagName('html', parsedDOM, false)[0];
  const rootUL =
    (left = (left1 = (left2 = dom.getElementById(Birch.RootID, parsedDOM)) != null ? left2 : dom.getElementById('Birch.Root', parsedDOM)) != null ? left1 : dom.getElementById('Birch', parsedDOM)) != null ? left : dom.getElementById('Root', parsedDOM);

  if (rootUL) {
    rootUL.attribs['id'] = Birch.RootID;
    dom.normalizeDOM(rootUL, {'p': true});
    const expandedItemIDs = {};
    const flatItems = [];

    let eachLI = dom.firstChild(rootUL);
    while (eachLI) {
      createItem(outline, eachLI, 0, flatItems, function(oldID, newID) {
        if (expandedItemIDs[oldID]) {
          delete expandedItemIDs[oldID];
        }
        return expandedItemIDs[newID] = true;
      });
      eachLI = eachLI.next;
    }

    const items = Item.buildItemHiearchy(flatItems);
    return items;
  } else {
    throw new Error('Could not find <ul id="Birch"> element.');
  }
};

var createItem = function(outline, liOrRootUL, depth, flatItems, remapIDCallback) {
  const tagName = liOrRootUL.name;
  if (tagName === 'li') {
    const p = dom.firstChild(liOrRootUL);
    const pOrUL = dom.lastChild(liOrRootUL);
    const pTagName = p != null ? p.name : undefined;
    const pOrULTagName = pOrUL != null ? pOrUL.name : undefined;
    assert(pTagName === 'p', `Expected 'P', but got ${pTagName}`);
    if (pTagName === pOrULTagName) {
      assert(pOrUL === p, "Expect single 'P' child in 'LI'");
    } else {
      assert(pOrULTagName === 'ul', `Expected 'UL', but got ${pOrULTagName}`);
      assert(pOrUL.prev === p, "Expected previous sibling of 'UL' to be 'P'");
    }
    AttributedString.validateInlineBML(p);
  } else if (tagName === 'ul') {
    assert(liOrRootUL.id === Birch.RootID);
  } else {
    assert(false, `Expected 'LI' or 'UL', but got ${tagName}`);
  }

  const P = dom.firstChild(liOrRootUL);
  const UL = dom.lastChild(liOrRootUL);
  const text = AttributedString.fromInlineBML(P.children);
  const item = outline.createItem(text, liOrRootUL.attribs['id'], remapIDCallback);
  flatItems.push(item);

  if (liOrRootUL.attribs) {
    for (let attributeName of Array.from(Object.keys(liOrRootUL.attribs))) {
      if (attributeName !== 'id') {
        item.setAttribute(attributeName, liOrRootUL.attribs[attributeName]);
      }
    }
  }

  const itemIndent = item.indent || 1;
  depth = depth + itemIndent;
  item.indent = depth;

  if (P !== UL) {
    let eachLI = dom.firstChild(UL);
    while (eachLI) {
      createItem(outline, eachLI, depth, flatItems, remapIDCallback);
      eachLI = eachLI.next;
    }
  }
  return item;
};

module.exports = {
  beginSerialization,
  beginSerializeItem,
  serializeItemBody,
  endSerializeItem,
  endSerialization,
  deserializeItems
};
