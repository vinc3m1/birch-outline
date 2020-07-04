/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const ElementType = require('domelementtype');
const htmlparser = require('htmlparser2');
const domutils = require('domutils');
const _ = require('underscore-plus');

/*
Create
*/

const parseDOM = function(string, options) {
  if (!options) {
    options = {
      decodeEntities: true,
      lowerCaseTags: true,
      xmlMode: true
    };
  }

  let out = null;
  const handler = new htmlparser.DomHandler(function(error, parsedDOM) {
    if (error) {
      throw error;
    } else {
      return out = parsedDOM;
    }
  });

  const parser = new htmlparser.Parser(handler, options);
  parser.write(string);
  parser.done();
  return out;
};

const createElement = function(tagName, attribs) {
  if (attribs == null) { attribs = {}; }
  return {
    type: ElementType.Tag,
    name: tagName.toLowerCase(),
    attribs,
    children: []
  };
};

const createTextNode = text => ({
  type: ElementType.Text,
  data: text
});

var cloneNode = function(node) {
  const clone = Object.assign({}, node);
  if (clone.children) {
    clone.children = [];
    for (let each of Array.from(node.children)) {
      domutils.appendChild(clone, cloneNode(each));
    }
  }
  return clone;
};

/*
Manipulate
*/

const appendChild = (parent, child) => domutils.appendChild(parent, child);

const insertChildBefore = (parent, child, sibling) => domutils.appendChild(parent, child);

const removeElement = element => domutils.removeElement(element);

const firstChild = parent => parent.children != null ? parent.children[0] : undefined;

const lastChild = function(parent) {
  let children;
  if (children = parent.children) {
    return children[children.length - 1];
  }
  return null;
};

const parents = function(node) {
  const nodes = [node];
  while ((node = node.parent)) {
    nodes.unshift(node);
  }
  return nodes;
};

const nextSibling = node => node.next;

const previousSibling = node => node.prev;

const shortestPath = function(node1, node2) {
  if (node1 === node2) {
    return [node1];
  } else {
    const parents1 = parents(node1);
    const parents2 = parents(node2);
    let commonDepth = 0;
    while (parents1[commonDepth] === parents2[commonDepth]) {
      commonDepth++;
    }
    parents1.splice(0, commonDepth - 1);
    parents2.splice(0, commonDepth);
    return parents1.concat(parents2);
  }
};

const commonAncestor = function(node1, node2) {
  if (node1 === node2) {
    return [node1];
  } else {
    const parents1 = parents(node1);
    const parents2 = parents(node2);
    while (parents1[depth] === parents2[depth]) {
      depth++;
    }
    return parents1[depth - 1];
  }
};

const previousNode = function(node) {
  let prev;
  if ((prev = previousSibling(node))) {
    return lastDescendantNodeOrSelf(prev);
  } else {
    return node.parent || null;
  }
};

const nextNode = function(node) {
  let first;
  if (first = firstChild(node)) {
    return first;
  } else {
    let next = nextSibling(node);
    if (next) {
      return next;
    } else {
      let {
        parent
      } = node;
      while (parent) {
        next = nextSibling(parent);
        if (next) {
          return next;
        }
        ({
          parent
        } = parent);
      }
      return null;
    }
  }
};

const nodeNextBranch = function(node) {
  let next;
  if (next = nextSibling(node)) {
    return next;
  } else {
    let p = node.parent;
    while (p) {
      if (next = nextSibling(p)) {
        return next;
      }
      p = p.parent;
    }
    return null;
  }
};

var lastDescendantNodeOrSelf = function(node) {
  let last = lastChild(node);
  let each = node;
  while (last) {
    each = last;
    last = lastChild(each);
  }
  return each;
};

const getElementById = (id, element, recurse) => domutils.getElementById(id, element);

const getElementsByTagName = (name, element, recurse, limit) => domutils.getElementsByTagName(name, element, recurse, limit);

var normalizeDOM = function(element, skip) {
  if (skip == null) { skip = {}; }
  if (skip[element.name]) {
    return;
  }
  if ((element.children != null ? element.children.length : undefined) > 0) {
    return Array.from(element.children.slice()).map((each) =>
      each.type === ElementType.Text ?
        removeElement(each)
      :
        normalizeDOM(each, skip));
  }
};

var prettyDOM = function(element, skip, trimEmpty, indent) {
  if (skip == null) { skip = {}; }
  if (trimEmpty == null) { trimEmpty = {}; }
  if (indent == null) { indent = '\n'; }
  if (skip[element.name]) {
    return;
  }
  if (element.children.length > 0) {
    const childIndent = indent + '  ';
    for (let each of Array.from(element.children.slice())) {
      domutils.prepend(each, createTextNode(childIndent));
      prettyDOM(each, skip, trimEmpty, childIndent);
    }
    return domutils.append(lastChild(element), createTextNode(indent));
  }
};

const getInnerHTML = (node, options) => domutils.getInnerHTML(node, options);

const getOuterHTML = (node, options) => domutils.getOuterHTML(node, options);

const stopEventPropagation = function(commandListeners) {
  const newCommandListeners = {};
  for (var commandName in commandListeners) {
    const commandListener = commandListeners[commandName];
    ((commandListener => newCommandListeners[commandName] = function(event) {
      event.stopPropagation();
      return commandListener.call(this, event);
    }))(commandListener);
  }
  return newCommandListeners;
};

module.exports = {
  parseDOM,
  createElement,
  createTextNode,
  cloneNode,
  appendChild,
  firstChild,
  lastChild,
  parents,
  shortestPath,
  commonAncestor,
  previousNode,
  nextNode,
  nodeNextBranch,
  lastDescendantNodeOrSelf,
  getElementById,
  getElementsByTagName,
  normalizeDOM,
  prettyDOM,
  getInnerHTML,
  getOuterHTML,
  stopEventPropagation
};
