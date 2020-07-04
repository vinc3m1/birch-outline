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
const Item = require('../../src/item');

const fixtureAsTextString = `\
one
\ttwo
\t\tthree
\t\tfour
\tfive
\t\t\tsix\
`;

describe('TEXT Serialization', function() {
  let [outline, root, one, two, three, four, five, six] = Array.from([]);

  beforeEach(function() {
    ({outline, root, one, two, three, four, five, six} = loadOutlineFixture());
    return six.indent = 2;
  });

  afterEach(() => outline.destroy());

  it('should serialize items to TEXT string', () => ItemSerializer.serializeItems(outline.root.descendants, {type: ItemSerializer.TEXTType}).should.equal(fixtureAsTextString));

  it('should deserialize items from TEXT string', function() {
    one = ItemSerializer.deserializeItems(fixtureAsTextString, outline, {type: ItemSerializer.TEXTType})[0];
    one.depth.should.equal(1);
    one.bodyString.should.equal('one');
    one.descendants.length.should.equal(5);
    one.lastChild.bodyString.should.equal('five');
    one.lastChild.lastChild.indent.should.equal(2);
    return one.lastChild.lastChild.depth.should.equal(4);
  });

  it('should convert leading spaces to indentation and serilize using tabs', function() {

    // 2 spaces
    let serializedItems = `\
one
   two
    three
    four
  five
      six\
`;
    let deserializedOne = ItemSerializer.deserializeItems(serializedItems, outline, {type: ItemSerializer.TEXTType})[0];
    ItemSerializer.serializeItems(Item.flattenItemHiearchy([deserializedOne], false), {type: ItemSerializer.TEXTType}).should.equal(fixtureAsTextString);

    // 4 spaces
    serializedItems = `\
one
    two
        three
        four
    five
            six\
`;
    deserializedOne = ItemSerializer.deserializeItems(serializedItems, outline, {type: ItemSerializer.TEXTType})[0];
    ItemSerializer.serializeItems(Item.flattenItemHiearchy([deserializedOne], false), {type: ItemSerializer.TEXTType}).should.equal(fixtureAsTextString);

    // 8 spaces
    serializedItems = `\
one
        two
                three
                four
        five
                        six\
`;
    deserializedOne = ItemSerializer.deserializeItems(serializedItems, outline, {type: ItemSerializer.TEXTType})[0];
    return ItemSerializer.serializeItems(Item.flattenItemHiearchy([deserializedOne], false), {type: ItemSerializer.TEXTType}).should.equal(fixtureAsTextString);
  });

  it('should deserialize empty lines at level of next non empty line', function() {
    const serializedItems = `\
one

\t\tthree
\t\tfour
\tfive
\t\tsix
\
`;
    const roots = ItemSerializer.deserializeItems(serializedItems, outline, {type: ItemSerializer.TEXTType});
    ItemSerializer.serializeItems(outline.root.descendants, ItemSerializer.TEXTType);

    let each = roots[0];
    each.depth.should.equal(1);
    (each = each.nextItem).depth.should.equal(3);
    (each = each.nextItem).depth.should.equal(3);
    (each = each.nextItem).depth.should.equal(3);
    (each = each.nextItem).depth.should.equal(2);
    (each = each.nextItem).depth.should.equal(3);
    return roots[1].depth.should.equal(1);
  });

  it('should deserialize items indented under initial empty line', function() {
    const serializedItems = `\

\t\one\
`;
    const roots = ItemSerializer.deserializeItems(serializedItems, outline, {type: ItemSerializer.TEXTType});
    roots.length.should.equal(2);
    roots[0].depth.should.equal(2);
    return roots[1].depth.should.equal(2);
  });

  return it('should serialize and deserialize overindented items', function() {
    const item = outline.createItem('one');
    item.indent = 2;
    const serializedItems = ItemSerializer.serializeItems([item], {type: ItemSerializer.TEXTType, baseDepth: 0});
    serializedItems.should.equal('\t\tone');
    const roots = ItemSerializer.deserializeItems(serializedItems, outline, {type: ItemSerializer.TEXTType});
    roots[0].depth.should.equal(3);

    return it('should reload empty serialization', function() {
      outline.reloadSerialization('');
      return outline.root.descendants.length.should.equal(1);
    });
  });
});

