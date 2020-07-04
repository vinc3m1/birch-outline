/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const AttributedString = require('./attributed-string');
const bmlTags = require('./attributed-string-bml-tags');
const ElementType = require('domelementtype');
const _ = require('underscore-plus');
const dom = require('./dom');

AttributedString.prototype.toInlineBMLString = function() {
  const p = dom.createElement('p');
  this.toInlineBMLInContainer(p);
  return dom.getInnerHTML(p, {
    decodeEntities: true,
    lowerCaseTags: true,
    xmlMode: true
  }
  );
};

AttributedString.prototype.toInlineBMLInContainer = function(container) {
  const nodeRanges = calculateInitialNodeRanges(this);
  const nodeRangeStack = [{
    start: 0,
    end: this.getLength(),
    node: container
  }
  ];
  return buildFragmentFromNodeRanges(nodeRanges, nodeRangeStack);
};

var calculateInitialNodeRanges = function(attributedString) {
  // For each attribute run create element nodes for each attribute and text node
  // for the text content. Store node along with range over which is should be
  // applied. Return sorted node ranages.
  let nodeRanges = [];

  if (attributedString.runBuffer) {
    const tagsToRanges = {};
    let runLocation = 0;
    let runBuffer = 0;

    for (let run of Array.from(attributedString.getRuns())) {
      for (let attributeName in run.attributes) {
        const attributeValue = run.attributes[attributeName];
        let nodeRange = tagsToRanges[attributeName];
        if (!nodeRange || (nodeRange.end <= runLocation)) {

          // Create element for each attribute name in run. If is known bmlTag
          // create element directly. Otherwise create span and add the
          // attribute name/value an attribute on the span.
          var element;
          if (bmlTags[attributeName]) {
            element = dom.createElement(attributeName);
            if (typeof attributeValue === 'string') {
              element.attribs['value'] = attributeValue;
            } else if (_.isObject(attributeValue)) {
              for (let attrName in attributeValue) {
                const attrValue = attributeValue[attrName];
                element.attribs[attrName] = attrValue.toString();
              }
            }
          } else {
            element = dom.createElement('span');
            element.attribs[attributeName] = attributeValue.toString();
          }

          nodeRange = {
            node: element,
            start: runLocation,
            end: seekTagRangeEnd(attributeName, attributeValue, runBuffer, runLocation, attributedString)
          };

          tagsToRanges[attributeName] = nodeRange;
          nodeRanges.push(nodeRange);
        }
      }

      const text = run.getString();
      if ((text !== AttributedString.ObjectReplacementCharacter) && (text !== AttributedString.LineSeparatorCharacter)) {
        nodeRanges.push({
          start: runLocation,
          end: runLocation + run.getLength(),
          node: dom.createTextNode(text)
        });
      }

      runLocation += run.getLength();
      runBuffer++;
    }

    nodeRanges.sort(compareNodeRanges);
  } else {
    const string = attributedString.getString();
    nodeRanges = [{
      start: 0,
      end: string.length,
      node: dom.createTextNode(string)
    }];
  }

  return nodeRanges;
};

var seekTagRangeEnd = function(tagName, seekTagAttributes, runBuffer, runLocation, attributedString) {
  const attributeRuns = attributedString.getRuns();
  const end = attributeRuns.length;
  while (true) {
    const run = attributeRuns[runBuffer++];
    const runTagAttributes = run.attributes[tagName];
    const equalAttributes = (runTagAttributes === seekTagAttributes) || _.isEqual(runTagAttributes, seekTagAttributes);
    if (!equalAttributes) {
      return runLocation;
    } else if (runBuffer === end) {
      return runLocation + run.getLength();
    }
    runLocation += run.getLength();
  }
};

var compareNodeRanges = function(a, b) {
  if (a.start < b.start) {
    return -1;
  } else if (a.start > b.start) {
    return 1;
  } else if (a.end !== b.end) {
    return b.end - a.end;
  } else {
    const aNodeType = a.node.type;
    const bNodeType = b.node.type;
    if (aNodeType !== bNodeType) {
      if (aNodeType === ElementType.Text) {
        return 1;
      } else if (bNodeType === ElementType.Text) {
        return -1;
      } else {
        const aTagName = a.node.name;
        const bTagName = b.node.name;
        if (aTagName < bTagName) {
          return -1;
        } else if (aTagName > bTagName) {
          return 1;
        } else {
          return 0;
        }
      }
    } else {
      return 0;
    }
  }
};

var buildFragmentFromNodeRanges = function(nodeRanges, nodeRangeStack) {
  let i = 0;
  while (i < nodeRanges.length) {
    const range = nodeRanges[i++];
    let parentRange = nodeRangeStack.pop();
    while (nodeRangeStack.length && (parentRange.end <= range.start)) {
      parentRange = nodeRangeStack.pop();
    }

    if (range.end > parentRange.end) {
      // In this case each has started inside current parent tag, but
      // extends past. Must split this node range into two. Process
      // start part of split here, and insert end part in correct
      // postion (after current parent) to be processed later.
      const splitStart = range;
      const splitEnd = {
        end: splitStart.end,
        start: parentRange.end,
        node: dom.cloneNode(splitStart.node)
      };
      splitStart.end = parentRange.end;
      // Insert splitEnd after current parent in correct location.
      let j = nodeRanges.indexOf(parentRange);
      while (compareNodeRanges(nodeRanges[j], splitEnd) < 0) {
        j++;
      }
      nodeRanges.splice(j, 0, splitEnd);
    }

    dom.appendChild(parentRange.node, range.node);
    nodeRangeStack.push(parentRange);
    nodeRangeStack.push(range);
  }

  return nodeRangeStack[0].node;
};

module.exports = AttributedString;
