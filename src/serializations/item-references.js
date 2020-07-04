/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const _ = require('underscore-plus');
const Item = require('../item');

/*
Serialization
*/

const beginSerialization = function(items, options, context) {
  let each, expandedItemIDs;
  const coverItems = Item.getCommonAncestors(items);
  const expandedItemIDsSet = new Set();
  const serializedItems = [];

  if (expandedItemIDs = options != null ? options.expandedItemIDs : undefined) {
    for (each of Array.from(expandedItemIDs)) {
      expandedItemIDsSet.add(each);
    }
  }

  let outline = null;
  for (each of Array.from(items)) {
    if (outline == null) { ({
      outline
    } = each); }
    serializedItems.push({
      id: each.id,
      expanded: expandedItemIDsSet.has(each.id)
    });
  }
  return context.json = JSON.stringify({
    outlineID: outline.id,
    items: serializedItems
  });
};

const beginSerializeItem = function(item, options, context) {};

const serializeItemBody = function(item, bodyAttributedString, options, context) {};

const endSerializeItem = function(item, options, context) {};

const endSerialization = (options, context) => context.json;

/*
Deserialization
*/

const deserializeItems = function(json, outline, options) {
  const Outline = require('../outline');
  json = JSON.parse(json);
  const items = [];
  const expandedItemIDs = [];
  items.loadOptions =
    {expanded: expandedItemIDs};
  const sourceOutline = Outline.getOutlineForID(json.outlineID);

  if (sourceOutline) {
    for (let each of Array.from(json.items)) {
      var item;
      if (item = sourceOutline.getItemForID(each.id)) {
        items.push(item);
        if (each.expanded) {
          expandedItemIDs.push(each.id);
        }
      }
    }
  }

  return Item.getCommonAncestors(items);
};

module.exports = {
  beginSerialization,
  beginSerializeItem,
  serializeItemBody,
  endSerializeItem,
  endSerialization,
  deserializeItems
};
