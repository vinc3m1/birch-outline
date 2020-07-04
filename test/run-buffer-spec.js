/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const RunBuffer = require('../src/run-buffer');
const should = require('chai').should();

describe('RunBuffer', function() {
  let [runBuffer] = Array.from([]);

  beforeEach(() => runBuffer = new RunBuffer());

  afterEach(() => runBuffer.destroy());

  it('starts empty', () => runBuffer.toString().should.equal(''));

  it('sets attributes', function() {
    runBuffer.insertString(0, 'hello!');
    runBuffer.setAttributesInRange({one: 'two'}, 0, 6);
    return runBuffer.toString().should.equal('(hello!/one:"two")');
  });

  it('adds attribute', function() {
    runBuffer.insertString(0, 'hello!');
    runBuffer.setAttributesInRange({one: 'two'}, 0, 6);
    runBuffer.addAttributeInRange('newattr', 'boo', 0, 6);
    return runBuffer.toString().should.equal('(hello!/newattr:"boo"/one:"two")');
  });

  it('adds attributes', function() {
    runBuffer.insertString(0, 'hello!');
    runBuffer.setAttributesInRange({one: 'two'}, 0, 6);
    runBuffer.addAttributesInRange({three: 'four'}, 0, 6);
    return runBuffer.toString().should.equal('(hello!/one:"two"/three:"four")');
  });

  it('removes attribute', function() {
    runBuffer.insertString(0, 'hello!');
    runBuffer.setAttributesInRange({one: 'two'}, 0, 6);
    runBuffer.removeAttributeInRange('one', 0, 6);
    return runBuffer.toString().should.equal('(hello!)');
  });

  it('splits attribute runs as needed', function() {
    runBuffer.insertString(0, 'hello!');
    runBuffer.addAttributeInRange('one', 'two', 0, 1);
    runBuffer.addAttributeInRange('one', 'two', 3, 1);
    runBuffer.addAttributeInRange('one', 'two', 5, 1);
    return runBuffer.toString().should.equal('(h/one:"two")(el)(l/one:"two")(o)(!/one:"two")');
  });

  return describe('Accessing Attributes', function() {

    beforeEach(function() {
      runBuffer.insertString(0, 'hello!');
      runBuffer.addAttributesInRange({a: '1'}, 0, 4);
      return runBuffer.addAttributesInRange({b: '2'}, 2, 3);
    });

    it('finds attributes at character index', function() {
      runBuffer.getAttributesAtIndex(0).should.eql({a: '1'});
      runBuffer.getAttributesAtIndex(1).should.eql({a: '1'});
      runBuffer.getAttributesAtIndex(2).should.eql({a: '1', b: '2'});
      runBuffer.getAttributesAtIndex(3).should.eql({a: '1', b: '2'});
      runBuffer.getAttributesAtIndex(4).should.eql({b: '2'});
      runBuffer.getAttributesAtIndex(5).should.eql({});
      return ((() => runBuffer.getAttributesAtIndex(6))).should.throw();
    });

    it('finds effective range of attributes at character index', function() {
      const range = {};
      runBuffer.getAttributesAtIndex(0, range);
      range.should.eql({location: 0, length: 2});

      runBuffer.getAttributesAtIndex(1, range);
      range.should.eql({location: 0, length: 2});

      runBuffer.getAttributesAtIndex(2, range);
      range.should.eql({location: 2, length: 2});

      runBuffer.getAttributesAtIndex(3, range);
      range.should.eql({location: 2, length: 2});

      runBuffer.getAttributesAtIndex(4, range);
      range.should.eql({location: 4, length: 1});

      runBuffer.getAttributesAtIndex(5, range);
      return range.should.eql({location: 5, length: 1});
    });

    return it('finds longest effective range of attribute at location', function() {
      const range = {};
      runBuffer.getAttributeAtIndex('a', 0, null, range).should.equal('1');
      range.should.eql({location: 0, length: 4});

      runBuffer.getAttributeAtIndex('a', 1, null, range).should.equal('1');
      range.should.eql({location: 0, length: 4});

      runBuffer.getAttributeAtIndex('a', 2, null, range).should.equal('1');
      range.should.eql({location: 0, length: 4});

      runBuffer.getAttributeAtIndex('a', 3, null, range).should.equal('1');
      range.should.eql({location: 0, length: 4});

      runBuffer.getAttributeAtIndex('b', 4, null, range).should.equal('2');
      range.should.eql({location: 2, length: 3});

      should.not.exist(runBuffer.getAttributeAtIndex('b', 5, null, range));
      range.should.eql({location: 5, length: 1});

      runBuffer.getAttributeAtIndex('undefinedeverywhere', 4, null, range);
      return range.should.eql({location: 0, length: 6});
    });
  });
});
