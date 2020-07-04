/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const deserializeItems = function(pathList, outline, options) {
  const filenames = pathList.split('\n');
  const items = [];
  for (let each of Array.from(filenames)) {
    const item = outline.createItem();
    item.bodyString = each.trim().replace(/[ ]/g, '\\ ');
    items.push(item);
  }
  return items;
};

module.exports =
  {deserializeItems};
