/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Item = require('../../item');

// Tag word
const tagWordStartCharsRegex = /[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
const tagWordCharsRegex =  /[\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]/;
const tagWordRegexString = `(?:${tagWordStartCharsRegex.source}|${tagWordCharsRegex.source})*`;

// Tag value
const tagValueRegex = /\(((?:\\\(|\\\)|[^()])*)\)/;
const tagValueRegexString = tagValueRegex.source;

// Tag
const tagRegexString = `(^|\\s+)@(${tagWordRegexString})(?:${tagValueRegexString})?(?=\\s|$)`;
const tagRegex = new RegExp(tagRegexString, 'g');

// Trailing Tags
const trailingTagsRegex = new RegExp(`(${tagRegexString})+\\s*$`, 'g');

const reservedTags = {
  'data-id': true,
  'data-text': true,
  'data-type': true
};

const tagRange = function(text, tag) {
  let result = undefined;
  tag = 'data-' + tag;
  parseTags(text, function(eachTag, eachValue, eachMatch) {
    if (tag === eachTag) {
      return result = {
        location: eachMatch.index,
        length: eachMatch[0].length
      };
    }
  });
  return result;
};

const encodeTag = function(tag, value) {
  if (value) {
    value = Item.objectToAttributeValueString(value);
    value = value.replace(/\)/g, '\\)');
    value = value.replace(/\(/g, '\\(');
    return `@${tag}(${value})`;
  } else {
    return `@${tag}`;
  }
};

const addTag = function(item, tag, value) {
  let tagString = encodeTag(tag, value);
  let range = tagRange(item.bodyString, tag);
  if (!range) {
    range = {
      location: item.bodyString.length,
      length: 0
    };
  }
  if ((range.location > 0) && !/\s+$/.test(item.bodyString)) {
    tagString = ' ' + tagString;
  }
  return item.replaceBodyRange(range.location, range.length, tagString);
};

const removeTag = function(item, tag) {
  let range;
  if (range = tagRange(item.bodyString, tag)) {
    return item.replaceBodyRange(range.location, range.length, '');
  }
};

var parseTags = function(text, callback) {
  let trailingMatch;
  const tags = {};
  if (text.indexOf('@') !== -1) {
    let match;
    let foundTag = false;
    while ((match = tagRegex.exec(text))) {
      foundTag = true;
      const leadingSpace = match[1];
      const tag = 'data-' + match[2];
      let value = match[3] != null ? match[3] : '';
      if ((tags[tag] == null) && encodesAttributeName(tag)) {
        value = value.replace(/\\\)/g, ')');
        value = value.replace(/\\\(/g, '(');
        tags[tag] = value;
        if (callback) {
          callback(tag, value, match);
        }
      }
    }
    if (foundTag) {
      trailingMatch = text.match(trailingTagsRegex);
    }
  }

  return {
    tags,
    trailingMatch
  };
};

const syncTagAttributeToItemBody = function(item, attributeName, value) {
  let tagName;
  if (tagName = encodeNameForAttributeName(attributeName)) {
    if (value != null) {
      return addTag(item, tagName, value);
    } else {
      return removeTag(item, tagName);
    }
  }
};

var encodesAttributeName = attributeName => !reservedTags[attributeName] && (attributeName.indexOf('data-') === 0);

var encodeNameForAttributeName = function(attributeName) {
  if (encodesAttributeName(attributeName)) {
    return attributeName.substr(5);
  } else {
    return null;
  }
};

module.exports = {
  syncTagAttributeToItemBody,
  encodeNameForAttributeName,
  encodesAttributeName,
  tagRegex,
  tagRange,
  encodeTag,
  parseTags
};
