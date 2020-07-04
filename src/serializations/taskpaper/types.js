/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const tagsHelper = require('./tags');
const taskRegex = /^([\-+*])\s/;
const projectRegex = /:$/;

const parseType = function(contentString) {
  if (contentString.match(taskRegex)) {
    return 'task';
  } else if (contentString.match(projectRegex)) {
    return 'project';
  } else {
    return 'note';
  }
};

const syncTypeAttributeToItemBody = function(item, newType, oldType) {
  // Remove old type syntax
  let trailingTagsLength;
  let left;
  let left1;
  switch (oldType) {
    case 'project':
      trailingTagsLength = (left = __guard__(tagsHelper.parseTags(item.bodyString).trailingMatch, x => x[0].length)) != null ? left : 0;
      item.replaceBodyRange(item.bodyString.length - (1 + trailingTagsLength), 1, '');
      break;
    case 'task':
      item.replaceBodyRange(0, 2, '');
      break;
  }

  // Add new type syntax
  switch (newType) {
    case 'project':
      trailingTagsLength = (left1 = __guard__(tagsHelper.parseTags(item.bodyString).trailingMatch, x1 => x1[0].length)) != null ? left1 : 0;
      return item.replaceBodyRange(item.bodyString.length - trailingTagsLength, 0, ':');
    case 'task':
      return item.replaceBodyRange(0, 0, '- ');
  }
};

module.exports = {
  taskRegex,
  projectRegex,
  parseType,
  syncTypeAttributeToItemBody
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}