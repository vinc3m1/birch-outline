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

const fixtureAsOPMLString = `\
<opml version="2.0">
  <head/>
  <body>
    <outline id="1" text="one">
      <outline id="2" text="two">
        <outline id="3" data-t="" text="three"/>
        <outline id="4" data-t="" text="fo&lt;b&gt;u&lt;/b&gt;r"/>
      </outline>
      <outline id="5" text="five">
        <outline id="6" data-t="23" indent="2" text="six"/>
      </outline>
    </outline>
  </body>
</opml>\
`;

describe('OPML Serialization', function() {
  let [outline, root, one, two, three, four, five, six] = Array.from([]);

  beforeEach(function() {
    ({outline, root, one, two, three, four, five, six} = loadOutlineFixture());
    return six.indent = 2;
  });

  afterEach(() => outline.destroy());

  it('should serialize items to OPML string', () => ItemSerializer.serializeItems(outline.root.descendants, {type: ItemSerializer.OPMLType}).should.equal(fixtureAsOPMLString));

  it('should only serialize non default indents', function() {
    one.setAttribute('indent', 1);
    ItemSerializer.serializeItems(outline.root.descendants, {type: ItemSerializer.OPMLType}).should.equal(fixtureAsOPMLString);
    one.setAttribute('indent', 2);
    return ItemSerializer.serializeItems(outline.root.descendants, {type: ItemSerializer.OPMLType}).should.not.equal(fixtureAsOPMLString);
  });

  return it('should deserialize items from OPML string', function() {
    one = ItemSerializer.deserializeItems(fixtureAsOPMLString, outline, {type: ItemSerializer.OPMLType})[0];
    one.depth.should.equal(1);
    one.bodyString.should.equal('one');
    one.descendants.length.should.equal(5);
    one.lastChild.bodyString.should.equal('five');
    one.lastChild.lastChild.getAttribute('data-t').should.equal('23');
    one.lastChild.lastChild.indent.should.equal(2);
    return one.lastChild.lastChild.depth.should.equal(4);
  });
});
