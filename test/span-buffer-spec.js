/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const SpanBuffer = require('../src/span-buffer');
const Outline = require('../src/outline');
const should = require('chai').should();

describe('SpanBuffer', function() {
  let [spanIndex, bufferSubscription, indexDidChangeExpects] = Array.from([]);

  beforeEach(function() {
    spanIndex = new SpanBuffer();
    return bufferSubscription = spanIndex.onDidChange(function(e) {
      if (indexDidChangeExpects) {
        const exp = indexDidChangeExpects.shift();
        return exp(e);
      }
    });
  });

  afterEach(function() {
    if (indexDidChangeExpects) {
      indexDidChangeExpects.length.should.equal(0);
      indexDidChangeExpects = null;
    }
    bufferSubscription.dispose();
    spanIndex.destroy();
    return Outline.outlines.length.should.equal(0);
  });

  it('starts empty', function() {
    spanIndex.getLength().should.equal(0);
    return spanIndex.getSpanCount().should.equal(0);
  });

  it('is clonable', function() {
    spanIndex.insertSpans(0, [
      spanIndex.createSpan('a'),
      spanIndex.createSpan('b'),
      spanIndex.createSpan('c')
    ]);
    return spanIndex.clone().toString().should.equal('(a)(b)(c)');
  });

  describe('Text', function() {

    it('insert text into empty adds span if needed', function() {
      spanIndex.insertString(0, 'hello world');
      spanIndex.getLength().should.equal(11);
      spanIndex.getSpanCount().should.equal(1);
      return spanIndex.toString().should.equal('(hello world)');
    });

    it('inserts text into correct span', function() {
      spanIndex.insertSpans(0, [
        spanIndex.createSpan('a'),
        spanIndex.createSpan('b')
      ]);
      spanIndex.insertString(0, 'a');
      spanIndex.toString().should.equal('(aa)(b)');
      spanIndex.insertString(2, 'a');
      spanIndex.toString().should.equal('(aaa)(b)');
      spanIndex.insertString(4, 'b');
      spanIndex.toString().should.equal('(aaa)(bb)');
      return spanIndex.getString().should.equal('aaabb');
    });

    it('removes appropriate spans when text is deleted', function() {
      spanIndex.insertSpans(0, [
        spanIndex.createSpan('a'),
        spanIndex.createSpan('b'),
        spanIndex.createSpan('c')
      ]);
      const sp0 = spanIndex.getSpan(0);
      const sp1 = spanIndex.getSpan(1);
      const sp2 = spanIndex.getSpan(2);

      spanIndex.deleteRange(0, 1);
      should.equal(sp0.indexParent, null);
      spanIndex.toString().should.equal('(b)(c)');

      spanIndex.deleteRange(1, 1);
      should.equal(sp2.indexParent, null);
      return spanIndex.toString().should.equal('(b)');
    });

    return it('delete text to empty deletes last span', function() {
      spanIndex.insertString(0, 'hello world');
      spanIndex.deleteRange(0, 11);
      spanIndex.getLength().should.equal(0);
      spanIndex.getSpanCount().should.equal(0);
      return spanIndex.toString().should.equal('');
    });
  });

  describe('Spans', function() {

    it('clones spans', () => spanIndex.createSpan('one').getString().should.equal('one'));

    it('inserts spans', function() {
      spanIndex.insertSpans(0, [
        spanIndex.createSpan('hello'),
        spanIndex.createSpan(' '),
        spanIndex.createSpan('world')
      ]);
      return spanIndex.toString().should.equal('(hello)( )(world)');
    });

    it('removes spans', function() {
      spanIndex.insertSpans(0, [
        spanIndex.createSpan('hello'),
        spanIndex.createSpan(' '),
        spanIndex.createSpan('world')
      ]);
      spanIndex.removeSpans(1, 2);
      return spanIndex.toString().should.equal('(hello)');
    });

    it('slices spans at text location ', function() {
      spanIndex.insertString(0, 'onetwo');
      spanIndex.sliceSpanAtLocation(0).should.eql({span: spanIndex.getSpan(0), spanIndex: 0, spanLocation: 0, location: 0});
      spanIndex.sliceSpanAtLocation(6).should.eql({span: spanIndex.getSpan(0), spanIndex: 0, spanLocation: 0, location: 6});
      spanIndex.toString().should.equal('(onetwo)');
      spanIndex.sliceSpanAtLocation(3).should.eql({span: spanIndex.getSpan(0), spanIndex: 0, spanLocation: 0, location: 3});
      spanIndex.toString().should.equal('(one)(two)');
      return spanIndex.sliceSpanAtLocation(3).should.eql({span: spanIndex.getSpan(0), spanIndex: 0, spanLocation: 0, location: 3});
    });

    it('slice spans to range', function() {
      spanIndex.insertString(0, 'onetwo');
      spanIndex.sliceSpansToRange(0, 6).should.eql({spanIndex: 0, count: 1});
      spanIndex.sliceSpansToRange(0, 2).should.eql({spanIndex: 0, count: 1});
      return spanIndex.sliceSpansToRange(4, 2).should.eql({spanIndex: 2, count: 1});
    });

    it('finds span over character index', function() {
      spanIndex.insertSpans(0, [
        spanIndex.createSpan('one'),
        spanIndex.createSpan('two')
      ]);
      spanIndex.getSpanInfoAtCharacterIndex(0).should.eql({span: spanIndex.getSpan(0), spanIndex: 0, spanLocation: 0, location: 0});
      spanIndex.getSpanInfoAtCharacterIndex(1).should.eql({span: spanIndex.getSpan(0), spanIndex: 0, spanLocation: 0, location: 1});
      spanIndex.getSpanInfoAtCharacterIndex(2).should.eql({span: spanIndex.getSpan(0), spanIndex: 0, spanLocation: 0, location: 2});
      spanIndex.getSpanInfoAtCharacterIndex(3).should.eql({span: spanIndex.getSpan(1), spanIndex: 1, spanLocation: 3, location: 0});
      spanIndex.getSpanInfoAtCharacterIndex(4).should.eql({span: spanIndex.getSpan(1), spanIndex: 1, spanLocation: 3, location: 1});
      spanIndex.getSpanInfoAtCharacterIndex(5).should.eql({span: spanIndex.getSpan(1), spanIndex: 1, spanLocation: 3, location: 2});
      return ((() => spanIndex.getSpanInfoAtCharacterIndex(6))).should.throw();
    });

    it('get choose left span at cursor index', function() {
      spanIndex.insertSpans(0, [
        spanIndex.createSpan('one'),
        spanIndex.createSpan('two')
      ]);
      spanIndex.getSpanInfoAtLocation(0).should.eql({span: spanIndex.getSpan(0), spanIndex: 0, spanLocation: 0, location: 0});
      spanIndex.getSpanInfoAtLocation(1).should.eql({span: spanIndex.getSpan(0), spanIndex: 0, spanLocation: 0, location: 1});
      spanIndex.getSpanInfoAtLocation(2).should.eql({span: spanIndex.getSpan(0), spanIndex: 0, spanLocation: 0, location: 2});
      spanIndex.getSpanInfoAtLocation(3).should.eql({span: spanIndex.getSpan(0), spanIndex: 0, spanLocation: 0, location: 3});
      spanIndex.getSpanInfoAtLocation(4).should.eql({span: spanIndex.getSpan(1), spanIndex: 1, spanLocation: 3, location: 1});
      spanIndex.getSpanInfoAtLocation(5).should.eql({span: spanIndex.getSpan(1), spanIndex: 1, spanLocation: 3, location: 2});
      spanIndex.getSpanInfoAtLocation(6).should.eql({span: spanIndex.getSpan(1), spanIndex: 1, spanLocation: 3, location: 3});
      return ((() => spanIndex.getSpanInfoAtLocation(7))).should.throw();
    });

    return it('get choose right span at cursor index', function() {
      spanIndex.insertSpans(0, [
        spanIndex.createSpan('one'),
        spanIndex.createSpan('two')
      ]);
      spanIndex.getSpanInfoAtLocation(0, true).should.eql({span: spanIndex.getSpan(0), spanIndex: 0, spanLocation: 0, location: 0});
      spanIndex.getSpanInfoAtLocation(1, true).should.eql({span: spanIndex.getSpan(0), spanIndex: 0, spanLocation: 0, location: 1});
      spanIndex.getSpanInfoAtLocation(2, true).should.eql({span: spanIndex.getSpan(0), spanIndex: 0, spanLocation: 0, location: 2});
      spanIndex.getSpanInfoAtLocation(3, true).should.eql({span: spanIndex.getSpan(1), spanIndex: 1, spanLocation: 3, location: 0});
      spanIndex.getSpanInfoAtLocation(4, true).should.eql({span: spanIndex.getSpan(1), spanIndex: 1, spanLocation: 3, location: 1});
      spanIndex.getSpanInfoAtLocation(5, true).should.eql({span: spanIndex.getSpan(1), spanIndex: 1, spanLocation: 3, location: 2});
      spanIndex.getSpanInfoAtLocation(6, true).should.eql({span: spanIndex.getSpan(1), spanIndex: 1, spanLocation: 3, location: 3});
      return ((() => spanIndex.getSpanInfoAtLocation(7, true))).should.throw();
    });
  });

  describe('Events', function() {

    it('posts change events when updating text in span', function() {
      spanIndex.insertSpans(0, [
        spanIndex.createSpan('a'),
        spanIndex.createSpan('b'),
        spanIndex.createSpan('c')
      ]);
      indexDidChangeExpects = [
        function(e) {
          e.location.should.equal(0);
          e.replacedLength.should.equal(1);
          return e.insertedString.should.equal('moose');
        }
      ];
      return spanIndex.replaceRange(0, 1, 'moose');
    });

    it('posts change events when inserting spans', function() {
      indexDidChangeExpects = [
        function(e) {
          e.location.should.equal(0);
          e.replacedLength.should.equal(0);
          return e.insertedString.should.equal('abc');
        }
      ];
      return spanIndex.insertSpans(0, [
        spanIndex.createSpan('a'),
        spanIndex.createSpan('b'),
        spanIndex.createSpan('c')
      ]);
  });

    it('posts change events when removing spans', function() {
      spanIndex.insertSpans(0, [
        spanIndex.createSpan('a'),
        spanIndex.createSpan('b'),
        spanIndex.createSpan('c')
      ]);
      indexDidChangeExpects = [
        function(e) {
          e.location.should.equal(2);
          e.replacedLength.should.equal(1);
          return e.insertedString.should.equal('');
        }
      ];
      return spanIndex.removeSpans(2, 1);
    });

    return it('posts change events when removing all', function() {
      spanIndex.insertSpans(0, [
        spanIndex.createSpan('a'),
        spanIndex.createSpan('b'),
        spanIndex.createSpan('c')
      ]);
      indexDidChangeExpects = [
        function(e) {
          e.location.should.equal(0);
          e.replacedLength.should.equal(3);
          return e.insertedString.should.equal('');
        }
      ];
      return spanIndex.removeSpans(0, 3);
    });
  });

  return xdescribe('Performance', () => it('should handle 10,000 spans', function() {
    let each, i;
    let asc, end1;
    let asc1, end2;
    let asc2, end3;
    if (typeof console.profile === 'function') {
      console.profile('Create Spans');
    }
    console.time('Create Spans');
    const spanCount = 10000;
    const spans = [];
    for (i = 0, end1 = spanCount - 1, asc = 0 <= end1; asc ? i <= end1 : i >= end1; asc ? i++ : i--) {
      spans.push(spanIndex.createSpan('hello world!'));
    }
    console.timeEnd('Create Spans');
    if (typeof console.profileEnd === 'function') {
      console.profileEnd();
    }

    if (typeof console.profile === 'function') {
      console.profile('Batch Insert Spans');
    }
    console.time('Batch Insert Spans');
    spanIndex.insertSpans(0, spans);
    spanIndex.getSpanCount().should.equal(spanCount);
    spanIndex.getLength().should.equal(spanCount * 'hello world!'.length);
    console.timeEnd('Batch Insert Spans');
    if (typeof console.profileEnd === 'function') {
      console.profileEnd();
    }

    if (typeof console.profile === 'function') {
      console.profile('Batch Remove Spans');
    }
    console.time('Batch Remove Spans');
    spanIndex.removeSpans(0, spanIndex.getSpanCount());
    spanIndex.getSpanCount().should.equal(0);
    spanIndex.getLength().should.equal(0);
    console.timeEnd('Batch Remove Spans');
    if (typeof console.profileEnd === 'function') {
      console.profileEnd();
    }

    const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min)) + min;

    if (typeof console.profile === 'function') {
      console.profile('Random Insert Spans');
    }
    console.time('Random Insert Spans');
    for (each of Array.from(spans)) {
      spanIndex.insertSpans(getRandomInt(0, spanIndex.getSpanCount()), [each]);
    }
    spanIndex.getSpanCount().should.equal(spanCount);
    spanIndex.getLength().should.equal(spanCount * 'hello world!'.length);
    console.timeEnd('Random Insert Spans');
    if (typeof console.profileEnd === 'function') {
      console.profileEnd();
    }

    if (typeof console.profile === 'function') {
      console.profile('Random Insert Text');
    }
    console.time('Random Insert Text');
    for (i = 0, end2 = spanCount - 1, asc1 = 0 <= end2; asc1 ? i <= end2 : i >= end2; asc1 ? i++ : i--) {
      spanIndex.insertString(getRandomInt(0, spanIndex.getLength()), 'Hello');
    }
    spanIndex.getLength().should.equal(spanCount * 'hello world!Hello'.length);
    console.timeEnd('Random Insert Text');
    if (typeof console.profileEnd === 'function') {
      console.profileEnd();
    }

    if (typeof console.profile === 'function') {
      console.profile('Random Access Spans');
    }
    console.time('Random Access Spans');
    for (i = 0, end3 = spanCount - 1, asc2 = 0 <= end3; asc2 ? i <= end3 : i >= end3; asc2 ? i++ : i--) {
      const start = getRandomInt(0, spanIndex.getSpanCount());
      const end = getRandomInt(start, Math.min(start + 100, spanIndex.getSpanCount()));
      spanIndex.getSpans(start, end - start);
    }
    console.timeEnd('Random Access Spans');
    if (typeof console.profileEnd === 'function') {
      console.profileEnd();
    }

    if (typeof console.profile === 'function') {
      console.profile('Random Remove Spans');
    }
    console.time('Random Remove Spans');
    for (each of Array.from(spans)) {
      spanIndex.removeSpans(getRandomInt(0, spanIndex.getSpanCount()), 1);
    }
    spanIndex.getSpanCount().should.equal(0);
    spanIndex.getLength().should.equal(0);
    console.timeEnd('Random Remove Spans');
    return (typeof console.profileEnd === 'function' ? console.profileEnd() : undefined);
  }));
});
