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

const fixtureAsBMLString = `\
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="UTF-8"/>
  </head>
  <body>
    <ul id="Birch">
      <li id="1">
        <p>one</p>
        <ul>
          <li id="2">
            <p>two</p>
            <ul>
              <li id="3" data-t="">
                <p>three</p>
              </li>
              <li id="4" data-t="">
                <p>fo<b>u</b>r</p>
              </li>
            </ul>
          </li>
          <li id="5">
            <p>five</p>
            <ul>
              <li id="6" data-t="23" indent="2">
                <p>six</p>
              </li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </body>
</html>\
`;

describe('BML Serialization', function() {
  let [outline, root, one, two, three, four, five, six] = Array.from([]);

  beforeEach(function() {
    ({outline, root, one, two, three, four, five, six} = loadOutlineFixture());
    return six.indent = 2;
  });

  afterEach(() => outline.destroy());

  describe('Serialization', function() {
    it('should serialize items to BML string', () => ItemSerializer.serializeItems(outline.root.descendants, {type: ItemSerializer.BMLType}).should.equal(fixtureAsBMLString));

    return it('should only serialize non default indents', function() {
      one.setAttribute('indent', 1);
      ItemSerializer.serializeItems(outline.root.descendants, {type: ItemSerializer.BMLType}).should.equal(fixtureAsBMLString);
      one.setAttribute('indent', 2);
      return ItemSerializer.serializeItems(outline.root.descendants, {type: ItemSerializer.BMLType}).should.not.equal(fixtureAsBMLString);
    });
  });

  return describe('Deserialization', function() {
    it('should load items from BML string', function() {
      one = ItemSerializer.deserializeItems(fixtureAsBMLString, outline, {type: ItemSerializer.BMLType})[0];
      one.depth.should.equal(1);
      one.bodyString.should.equal('one');
      one.descendants.length.should.equal(5);
      one.lastChild.bodyString.should.equal('five');
      one.lastChild.lastChild.getAttribute('data-t').should.equal('23');
      one.lastChild.lastChild.indent.should.equal(2);
      return one.lastChild.lastChild.depth.should.equal(4);
    });

    it('reload outline from BML string', function() {
      const out = new Outline();
      out.reloadSerialization(fixtureAsBMLString, {type: ItemSerializer.BMLType});
      return ItemSerializer.serializeItems(outline.root.descendants, {type: ItemSerializer.BMLType}).should.equal(fixtureAsBMLString);
    });

    it('should throw exception when loading invalid html outline UL child', function() {
      const bmlString = `\
<ul id="Birch">
  <div>bad</div>
</ul>\
`;
      return ((() => ItemSerializer.deserializeItems(bmlString, outline, {type: ItemSerializer.BMLType}))).should.throw("Expected 'LI' or 'UL', but got div");
    });

    it('should throw exception when loading invalid html outline LI child', function() {
      const bmlString = `\
<ul id="Birch">
  <li>bad</li>
</ul>\
`;
      return ((() => ItemSerializer.deserializeItems(bmlString, outline, {type: ItemSerializer.BMLType}))).should.throw("Expected 'P', but got undefined");
    });

    return it('should throw exception when loading invalid html outline P contents', function() {
      const bmlString = `\
<ul id="Birch">
  <li><p>o<dog>n</dog>e</p></li>
</ul>\
`;
      return ((() => ItemSerializer.deserializeItems(bmlString, outline, {type: ItemSerializer.BMLType}))).should.throw("Unexpected tagName 'dog' in 'P'");
    });
  });
});
