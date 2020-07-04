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
\t\tthree @t
\t\tfour @t
\tfive
\t\tsix @t(23)\
`;

describe('TaskPaper', function() {
  let [outline, root, one, two, three, four, five, six] = Array.from([]);

  beforeEach(() => ({outline, root, one, two, three, four, five, six} = loadOutlineFixture(ItemSerializer.TaskPaperType)));

  afterEach(() => outline.destroy());

  describe('Serialization', function() {

    it('should serialize items to TaskPaper string', () => ItemSerializer.serializeItems(one.branchItems, {type: ItemSerializer.TaskPaperType}).should.equal(fixtureAsTextString));

    return it('should deserialize items from TaskPaper string', function() {
      one.depth.should.equal(1);
      one.bodyString.should.equal('one');
      one.descendants.length.should.equal(5);
      one.firstChild.firstChild.hasAttribute('data-t').should.be.true;
      one.firstChild.lastChild.hasAttribute('data-t').should.be.true;
      one.lastChild.bodyString.should.equal('five');
      return one.lastChild.lastChild.getAttribute('data-t').should.equal('23');
    });
  });

  describe('Body text to attributes', function() {

    it('should sync project sytax to data-type="project"', function() {
      one.bodyString = 'my project:';
      one.getAttribute('data-type').should.equal('project');
      return one.bodyHighlightedAttributedString.toString().should.equal('(my project/content:"")(:)');
    });

    it('should delete content of project without crashing"', function() {
      one.bodyString = 'a:';
      one.replaceBodyRange(0, 1, '');
      one.getAttribute('data-type').should.equal('project');
      return one.bodyHighlightedAttributedString.toString().should.equal('(:)');
    });

    it('should sync task sytax to data-type="task"', function() {
      one.bodyString = '- my task';
      one.getAttribute('data-type').should.equal('task');
      return one.bodyHighlightedAttributedString.toString().should.equal('(-/lead:""/link:"button://toggledone")( )(my task/content:"")');
    });

    it('should sync note sytax to data-type="note"', function() {
      one.bodyString = 'my note';
      return one.getAttribute('data-type').should.equal('note');
    });

    it('should sync tags to data- attributes', function() {
      one.bodyString = '@jesse(washere)';
      one.getAttribute('data-jesse').should.equal('washere');
      one.bodyString = '@jesse(washere) @2';
      one.getAttribute('data-jesse').should.equal('washere');
      one.getAttribute('data-2').should.equal('');
      one.attributeNames.toString().should.equal('data-2,data-jesse,data-type');
      one.bodyHighlightedAttributedString.toString().should.equal('(@jesse/link:"filter://@jesse"/tag:"data-jesse"/tagname:"data-jesse")((/tag:"data-jesse")(washere/link:"filter://@jesse = washere"/tag:"data-jesse"/tagvalue:"washere")()/tag:"data-jesse")( )(@2/link:"filter://@2"/tag:"data-2"/tagname:"data-2")');
      one.bodyString = 'no tags here';
      should.equal(one.getAttribute('data-jesse'), undefined);
      return should.equal(one.getAttribute('data-2'), undefined);
    });

    it('should allow recognize multiple tags with values in a row', function() {
      one.bodyString = 'hello @a(b) @c(d)';
      one.getAttribute('data-a').should.equal('b');
      return one.getAttribute('data-c').should.equal('d');
    });

    it('should force escaped ()s in tag values', function() {
      one.bodyString = 'hello @a(b @c(d)';
      should.equal(one.getAttribute('data-a'), undefined);
      return one.getAttribute('data-c').should.equal('d');
    });

    it('should escaped ()s in tag values', function() {
      one.bodyString = '@jesse(\\(moose\\))';
      return one.getAttribute('data-jesse').should.equal('(moose)');
    });

    it('should encode/decode ()s when setting/getting tag values', function() {
      one.setAttribute('data-jesse', '(hello)');
      one.bodyString.should.equal('one @jesse(\\(hello\\))');
      return one.getAttribute('data-jesse').should.equal('(hello)');
    });

    it('should separate content from trailing tags', function() {
      one.bodyString = 'one @done';
      one.bodyHighlightedAttributedString.toString().should.equal('(one/content:"")( )(@done/link:"filter://@done"/tag:"data-done"/tagname:"data-done")');
      one.bodyString = 'one @done ';
      return one.bodyHighlightedAttributedString.toString(false).should.equal('(one/content:"")( )(@done/link:"filter://@done"/tag:"data-done"/tagname:"data-done")( )');
    });

    it('should undo sync body text to attribute', function() {
      one.bodyString = '@jesse(washere)';
      outline.undoManager.undo();
      one.bodyString.should.equal('one');
      should.equal(one.getAttribute('data-jesse'), undefined);
      outline.undoManager.redo();
      one.bodyString.should.equal('@jesse(washere)');
      return one.getAttribute('data-jesse').should.equal('washere');
    });

    return it('should undo coaleced sync body text attributes', function() {
      one.replaceBodyRange(3, 0, ' ');
      one.replaceBodyRange(4, 0, '@');
      one.replaceBodyRange(5, 0, 'a');
      one.getAttribute('data-a').should.equal('');
      one.replaceBodyRange(6, 0, 'b');
      one.getAttribute('data-ab').should.equal('');
      outline.undoManager.undo();
      return one.bodyString.should.equal('one');
    });
  });

  describe('Attributes to body text', function() {

    it('should sync data-type="task" to task syntax', function() {
      one.setAttribute('data-type', 'task');
      one.bodyString.should.equal('- one');
      one.getAttribute('data-type').should.equal('task');
      return one.bodyHighlightedAttributedString.toString().should.equal('(-/lead:""/link:"button://toggledone")( )(one/content:"")');
    });

    it('should sync data-type="project" to project syntax', function() {
      one.setAttribute('data-type', 'project');
      one.bodyString.should.equal('one:');
      return one.getAttribute('data-type').should.equal('project');
    });

    it('should sync data-type="note" to note syntax', function() {
      one.setAttribute('data-type', 'note');
      one.bodyString.should.equal('one');
      return one.getAttribute('data-type').should.equal('note');
    });

    it('should sync between multiple data-types', function() {
      one.setAttribute('data-type', 'note');
      one.bodyString.should.equal('one');
      one.setAttribute('data-type', 'project');
      one.bodyString.should.equal('one:');
      one.setAttribute('data-type', 'task');
      one.bodyString.should.equal('- one');
      one.setAttribute('data-type', 'project');
      one.bodyString.should.equal('one:');
      one.setAttribute('data-type', 'note');
      return one.bodyString.should.equal('one');
    });

    it('should sync data- attributes to tags', function() {
      one.setAttribute('data-jesse', 'washere');
      one.bodyString.should.equal('one @jesse(washere)');
      one.setAttribute('data-moose', '');
      one.bodyString.should.equal('one @jesse(washere) @moose');
      one.setAttribute('data-jesse', '');
      one.bodyString.should.equal('one @jesse @moose');
      one.removeAttribute('data-jesse', '');
      one.bodyString.should.equal('one @moose');
      one.setAttribute('data-moose', 'mouse');
      one.bodyString.should.equal('one @moose(mouse)');
      return one.bodyHighlightedAttributedString.toString().should.equal('(one/content:"")( )(@moose/link:"filter://@moose"/tag:"data-moose"/tagname:"data-moose")((/tag:"data-moose")(mouse/link:"filter://@moose = mouse"/tag:"data-moose"/tagvalue:"mouse")()/tag:"data-moose")');
    });

    it('should sync from project with trailing tags', function() {
      one.bodyString = 'one: @done';
      one.setAttribute('data-type', 'note');
      return one.bodyString.should.equal('one @done');
    });

    it('should to from project with trailing tags', function() {
      one.bodyString = 'one @done';
      one.setAttribute('data-type', 'project');
      return one.bodyString.should.equal('one: @done');
    });

    it('should sync data- attributes to tags and change type if type changes', function() {
      one.bodyString = 'one:';
      one.setAttribute('data-moose', '');
      return one.getAttribute('data-type').should.equal('project');
    });

    it('should undo sync data- attributes to tags', function() {
      one.setAttribute('data-type', 'project');
      outline.undoManager.undo();
      one.bodyString.should.equal('one');
      outline.undoManager.redo();
      one.bodyString.should.equal('one:');
      return one.getAttribute('data-type').should.equal('project');
    });

    it('should ignore trailing tags when get/set by body content', function() {
      six.bodyContentString.should.equal('six');
      six.bodyContentString = 'moose';
      six.bodyContentString.should.equal('moose');
      return six.bodyString.should.equal('moose @t(23)');
    });

    return describe('Inline Syntax Highlighting', function() {

      it('should highlight email links', function() {
        one.bodyString = 'jesse@hogbay.com';
        return one.bodyHighlightedAttributedString.toString().should.equal('(jesse@hogbay.com/content:""/link:"mailto:jesse@hogbay.com")');
      });

      it('should highlight file links', function() {
        one.bodyString = 'one ./two and /thre/four.txt';
        return one.bodyHighlightedAttributedString.toString().should.equal('(one /content:"")(./two/content:""/link:"path:./two")( and /content:"")(/thre/four.txt/content:""/link:"path:/thre/four.txt")');
      });

      it('should highlight file links with multiple escaped spaces', function() {
        one.bodyString = '/hello\\ world\\ man.txt';
        return one.bodyHighlightedAttributedString.toString().should.equal('(/hello\\ world\\ man.txt/content:""/link:"path:/hello world man.txt")');
      });

      return it('should highlight web links', function() {
        one.bodyString = 'www.apple.com or ftp://apple.com mailto:jesse@hogbay.com';
        return one.bodyHighlightedAttributedString.toString().should.equal('(www.apple.com/content:""/link:"http://www.apple.com")( or /content:"")(ftp://apple.com/content:""/link:"ftp://apple.com")( /content:"")(mailto:jesse@hogbay.com/content:""/link:"mailto:jesse@hogbay.com")');
      });
    });
  });

  return describe('Item Path Types', () => it('should use item path type keywords', function() {
    outline.evaluateItemPath('task').length.should.equal(0);
    one.setAttribute('data-type', 'task');
    return outline.evaluateItemPath('task').length.should.equal(1);
  }));
});
