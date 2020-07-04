/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const smartLinks = require('./smart-links');
const typesHelper = require('./types');
const tagsHelper = require('./tags');

// Hook to insert @one(two) into body text when item.setAttribute('one', 'two')
// is called.
const processItemDidChangeAttribute = function(item, attribute, value, oldValue) {
  const startBodyString = item.bodyString;

  if (attribute === 'data-type') {
    typesHelper.syncTypeAttributeToItemBody(item, value, oldValue);
  } else if (tagsHelper.encodesAttributeName(attribute)) {
    tagsHelper.syncTagAttributeToItemBody(item, attribute, value);
  }

  if (startBodyString !== item.bodyString) {
    return highlightItemBody(item);
  }
};

// Hook to add attribute one=two when the user types @one(two) in body text.
// Also used to update item syntax highlighting.
const processItemDidChangeBody = function(item, oldBody) {
  let contentString, tag;
  const oldTags = tagsHelper.parseTags(oldBody).tags;
  const newTagMatches = [];
  const parseResults = tagsHelper.parseTags(item.bodyString, (tag, value, match) => newTagMatches.push({
    tag,
    value,
    match
  }));
  const newTags = parseResults.tags;

  const {
    bodyString
  } = item;
  if (parseResults.trailingMatch) {
    contentString = bodyString.substr(0, bodyString.length - parseResults.trailingMatch[0].length);
  } else {
    contentString = bodyString;
  }

  const type = typesHelper.parseType(contentString);
  item.setAttribute('data-type', type);

  highlightItemBody(item, type, newTags, newTagMatches, contentString);

  for (tag in oldTags) {
    if (newTags[tag] == null) {
      item.removeAttribute(tag);
    }
  }

  return (() => {
    const result = [];
    for (tag in newTags) {
      if (newTags[tag] !== oldTags[tag]) {
        result.push(item.setAttribute(tag, newTags[tag]));
      } else {
        result.push(undefined);
      }
    }
    return result;
  })();
};

var highlightItemBody = function(item, type, tags, tagMatches, contentString) {
  let length;
  const {
    bodyString
  } = item;

  if (!tags) {
    tagMatches = [];
    const parseResults = tagsHelper.parseTags(bodyString, (tag, value, match) => tagMatches.push({
      tag,
      value,
      match
    }));
    ({
      tags
    } = parseResults);

    if (parseResults.trailingMatch) {
      contentString = bodyString.substr(0, bodyString.length - parseResults.trailingMatch[0].length);
    } else {
      contentString = bodyString;
    }
  }

  for (let each of Array.from(tagMatches)) {
    const {
      tag
    } = each;
    const {
      value
    } = each;
    const {
      match
    } = each;
    const leadingSpace = match[1];
    const start = match.index + leadingSpace.length;
    length = match[0].length - leadingSpace.length;
    item.addBodyHighlightAttributeInRange('tag', tag, start, length);
    const encodedTagName = tagsHelper.encodeNameForAttributeName(tag);
    let attributes = {tagname: tag, link: `filter://@${encodedTagName}`};
    item.addBodyHighlightAttributesInRange(attributes, start, match[2].length + 1);

    if (value != null ? value.length : undefined) {
      attributes = {tagvalue: value, link: `filter://@${encodedTagName} = ${value}`};
      item.addBodyHighlightAttributesInRange(attributes, start + 1 + match[2].length + 1, value.length);
    }
  }

  if (type == null) { type = typesHelper.parseType(contentString); }
  if (type === 'task') {
    item.addBodyHighlightAttributesInRange({link: 'button://toggledone', lead: ''}, 0, 1);
    if (contentString.length > 2) {
      item.addBodyHighlightAttributeInRange('content', '', 2, contentString.length - 2);
    }
  } else if (type === 'project') {
    if (contentString.length > 1) {
      item.addBodyHighlightAttributeInRange('content', '', 0, contentString.length - 1);
    }
  } else {
    if (contentString) {
      item.addBodyHighlightAttributeInRange('content', '', 0, contentString.length);
    }
  }

  return smartLinks.highlightLinks(item);
};

module.exports = {
  processItemDidChangeBody,
  processItemDidChangeAttribute
};
