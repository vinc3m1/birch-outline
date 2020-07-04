/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const ItemSerializer = require('../../src/item-serializer');
const loadOutlineFixture = require('../load-outline-fixture');
const Outline = require('../../src/outline');
const should = require('chai').should();

const fixtureAsItemReferencesJSON = '{"outlineID":"m1eLUlEF8b","items":[{"id":"1"}]}';

describe('Item References Serialization', function() {
  let [outline, root, one, two, three, four, five, six] = Array.from([]);

  beforeEach(() => ({outline, root, one, two, three, four, five, six} = loadOutlineFixture()));

  afterEach(() => outline.destroy());

  return it('should serialize and deserialize items', function() {
    const serializedReferences = ItemSerializer.serializeItems([three, five], {type: ItemSerializer.ItemReferencesType});
    const items = ItemSerializer.deserializeItems(serializedReferences, outline, {type: ItemSerializer.ItemReferencesType});
    delete items['loadOptions'];
    return items.should.eql([three, five]);
  });
});
