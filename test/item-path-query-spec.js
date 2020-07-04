/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const loadOutlineFixture = require('./load-outline-fixture');
const ItemPathQuery = require('../src/item-path-query');
const Outline = require('../src/outline');
const should = require('chai').should();

describe('ItemPathQuery', function() {
  let [outline, root, one, two, three, four, five, six, query] = Array.from([]);

  beforeEach(function() {
    ({outline, root, one, two, three, four, five, six} = loadOutlineFixture());
    return query = new ItemPathQuery(outline);
  });

  afterEach(() => outline.destroy());

  it('should not start query when path is set', function() {
    query.itemPath = '//three';
    query.started.should.equal(false);
    return query.results.should.eql([]);
  });

  it('should not start query when path is set', function() {
    query.itemPath = '//three';
    query.start();
    query.started.should.equal(true);
    return query.results.should.eql([three]);
  });

  return it('should allow custom query function', function() {
    query.queryFunction = () => [one, six];
    query.start();
    return query.results.should.eql([one, six]);
  });
});
