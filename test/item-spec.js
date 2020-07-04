/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const loadOutlineFixture = require('./load-outline-fixture');
const AttributedString = require('../src/attributed-string');
const Outline = require('../src/outline');
const should = require('chai').should();
const Item = require('../src/item');

describe('Item', function() {
  let [outline, root, one, two, three, four, five, six] = Array.from([]);

  beforeEach(() => ({outline, root, one, two, three, four, five, six} = loadOutlineFixture()));

  afterEach(function() {
    outline.destroy();
    return Outline.outlines.length.should.equal(0);
  });

  it('should have content id', () => one.contentID.should.not.be.null);

  it('should change content id when body string changes', function() {
    const id = one.contentID;
    one.bodyString = 'moose';
    return one.contentID.should.not.equal(id);
  });

  it('should change branch content id when body string changes', function() {
    const id = one.branchContentID;
    one.bodyString = 'moose';
    return one.branchContentID.should.not.equal(id);
  });

  it('should change branch content id when any descendent changes', function() {
    let id = one.branchContentID;
    three.bodyString = 'moose';
    one.branchContentID.should.not.equal(id);

    id = one.branchContentID;
    three.removeFromParent();
    one.branchContentID.should.not.equal(id);

    id = one.branchContentID;
    four.appendChildren(outline.createItem('moose'));
    return one.branchContentID.should.not.equal(id);
  });

  it('should get parent', function() {
    two.parent.should.equal(one);
    return one.parent.should.equal(root);
  });

  it('should append item', function() {
    const item = outline.createItem('hello');
    outline.root.appendChildren(item);
    item.parent.should.equal(outline.root);
    return item.isInOutline.should.be.true;
  });

  it('should delete item', function() {
    two.removeFromParent();
    return should.equal(two.parent, null);
  });

  it('should removeItemsFromParents and maintain undo', function() {
    outline.undoManager.beginUndoGrouping();
    Item.removeItemsFromParents([five, six]);
    six.isInOutline.should.not.be.true;
    outline.undoManager.endUndoGrouping();
    outline.undoManager.undo();
    return six.isInOutline.should.be.true;
  });

  it('should make item connections', function() {
    one.firstChild.should.equal(two);
    one.lastChild.should.equal(five);
    one.firstChild.nextSibling.should.equal(five);
    return one.lastChild.previousSibling.should.equal(two);
  });

  it('should calculate cover items', () => Item.getCommonAncestors([
    three,
    five,
    six,
  ]).should.eql([three, five]));

  it('should build item hiearchy', function() {
    const a = outline.createItem('a');
    a.indent = 1;
    const b = outline.createItem('b');
    b.indent = 2;

    const stack = [a];
    Item.buildItemHiearchy([b], stack);
    b.parent.should.equal(a);
    a.depth.should.equal(1);
    return b.depth.should.equal(2);
  });

  it('should know row', function() {
    root.row.should.equal(-1);
    one.row.should.equal(0);
    two.row.should.equal(1);
    return six.row.should.equal(5);
  });

  describe('Attributes', function() {
    it('should set/get attribute', function() {
      should.equal(five.getAttribute('test'), undefined);
      five.setAttribute('test', 'hello');
      return five.getAttribute('test').should.equal('hello');
    });

    it('should get/set attribute as array', function() {
      five.setAttribute('test', ['one', 'two', 'three']);
      five.getAttribute('test').should.eql('one,two,three');
      return five.getAttribute('test', null, true).should.eql(['one', 'two', 'three']);
    });

    it('should get/set number attributes', function() {
      five.setAttribute('test', 1);
      five.getAttribute('test').should.eql('1');
      five.getAttribute('test', Number).should.eql(1);
      five.setAttribute('test', '0.1');
      return five.getAttribute('test', Number).should.eql(0.1);
    });

    return xit('should get/set date attributes', function() {
      const date = new Date('11/27/76');
      five.setAttribute('test', date);
      five.getAttribute('test').should.eql('1976-11-27T05:00:00.000Z');
      return five.getAttribute('test', Date).should.eql(date);
    });
  });

  return describe('Body', function() {
    it('should get', function() {
      one.bodyString.should.equal('one');
      one.bodyHTMLString.should.equal('one');
      return one.bodyString.length.should.equal(3);
    });

    it('should get empy', function() {
      const item = outline.createItem('');
      item.bodyString.should.equal('');
      item.bodyHTMLString.should.equal('');
      return item.bodyString.length.should.equal(0);
    });

    it('should get/set by Text', function() {
      one.bodyString = 'one <b>two</b> three';
      one.bodyString.should.equal('one <b>two</b> three');
      one.bodyHTMLString.should.equal('one &lt;b&gt;two&lt;/b&gt; three');
      return one.bodyString.length.should.equal(20);
    });

    it('should get/set by HTML', function() {
      one.bodyHTMLString = 'one <b>two</b> three';
      one.bodyString.should.equal('one two three');
      one.bodyHTMLString.should.equal('one <b>two</b> three');
      return one.bodyString.length.should.equal(13);
    });

    return describe('Inline Elements', function() {
      it('should get elements', function() {
        one.bodyHTMLString = '<b>one</b> <img src="boo.png">two three';
        one.getBodyAttributesAtIndex(0).should.eql({ b: {} });
        one.getBodyAttributesAtIndex(3).should.eql({});
        return one.getBodyAttributesAtIndex(4).should.eql({ img: { src: 'boo.png' } });
      });

      it('should get empty elements', function() {
        one.bodyString = 'one two three';
        return one.getBodyAttributesAtIndex(0).should.eql({});
      });

      it('should add elements', function() {
        one.bodyString = 'one two three';
        one.addBodyAttributeInRange('b', null, 4, 3);
        return one.bodyHTMLString.should.equal('one <b>two</b> three');
      });

      it('should add overlapping back element', function() {
        one.bodyString = 'one two three';
        one.addBodyAttributeInRange('b', null, 0, 7);
        one.addBodyAttributeInRange('i', null, 4, 9);
        return one.bodyHTMLString.should.equal('<b>one <i>two</i></b><i> three</i>');
      });

      it('should add overlapping front and back element', function() {
        one.bodyString = 'three';
        one.addBodyAttributeInRange('b', null, 0, 2);
        one.addBodyAttributeInRange('u', null, 1, 3);
        one.addBodyAttributeInRange('i', null, 3, 2);
        return one.bodyHTMLString.should.equal('<b>t<u>h</u></b><u>r<i>e</i></u><i>e</i>');
      });

      it('should add consecutive attribute with different values', function() {
        one.addBodyAttributeInRange('span', {'data-a': 'a'}, 0, 1);
        one.addBodyAttributeInRange('span', {'data-b': 'b'}, 1, 2);
        return one.bodyHTMLString.should.equal('<span data-a="a">o</span><span data-b="b">ne</span>');
      });

      it('should add consecutive attribute with same values', function() {
        one.addBodyAttributeInRange('span', {'data-a': 'a'}, 0, 1);
        one.addBodyAttributeInRange('span', {'data-a': 'a'}, 1, 2);
        return one.bodyHTMLString.should.equal('<span data-a="a">one</span>');
      });

      it('should remove element', function() {
        one.bodyHTMLString = '<b>one</b>';
        one.removeBodyAttributeInRange('b', 0, 3);
        return one.bodyHTMLString.should.equal('one');
      });

      it('should remove middle of element span', function() {
        one.bodyHTMLString = '<b>one</b>';
        one.removeBodyAttributeInRange('b', 1, 1);
        return one.bodyHTMLString.should.equal('<b>o</b>n<b>e</b>');
      });

      return describe('Void Elements', function() {
        it('should remove tags when they become empty if they are not void tags', function() {
          one.bodyHTMLString = 'one <b>two</b> three';
          one.replaceBodyRange(4, 3, '');
          one.bodyString.should.equal('one  three');
          return one.bodyHTMLString.should.equal('one  three');
        });

        it('should not remove void tags that are empty', function() {
          one.bodyHTMLString = 'one <br/><img> three';
          one.bodyString.length.should.equal(12);
          return one.bodyHTMLString.should.equal('one <br/><img/> three');
        });

        it('void tags should count as length 1 in outline range', function() {
          one.bodyHTMLString = 'one <br/><img/> three';
          one.replaceBodyRange(7, 3, '');
          return one.bodyHTMLString.should.equal('one <br/><img/> ee');
        });

        it('void tags should be replaceable', function() {
          one.bodyHTMLString = 'one <br/><img/> three';
          one.replaceBodyRange(4, 1, '');
          one.bodyHTMLString.should.equal('one <img/> three');
          return one.bodyString.length.should.equal(11);
        });

        it('text content enocde <br> using "New Line Character"', function() {
          one.bodyHTMLString = 'one <br> three';
          return one.bodyString.should.equal(`one ${AttributedString.LineSeparatorCharacter} three`);
        });

        return it('text content encode <img> and other void tags using "Object Replacement Character"', function() {
          one.bodyHTMLString = 'one <img> three';
          return one.bodyString.should.equal(`one ${AttributedString.ObjectReplacementCharacter} three`);
        });
      });
    });
  });
});
