/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const loadOutlineFixture = require('./load-outline-fixture');
const Outline = require('../src/outline');
const Item = require('../src/item');
const shortid = require('../src/shortid');
const should = require('chai').should();
const path = require('path');

describe('Outline', function() {
  let [outline, root, one, two, three, four, five, six] = Array.from([]);

  beforeEach(() => ({outline, root, one, two, three, four, five, six} = loadOutlineFixture()));

  afterEach(function() {
    outline.destroy();
    return Outline.outlines.length.should.equal(0);
  });

  describe('TaskPaper Outline', function() {

    let taskPaperOutline = null;

    beforeEach(() => taskPaperOutline = Outline.createTaskPaperOutline('one @t(1)\ntwo'));

    afterEach(() => taskPaperOutline.destroy());

    it('should convert string to TaskPaper outline', function() {
      taskPaperOutline.root.firstChild.bodyString.should.equal('one @t(1)');
      taskPaperOutline.root.firstChild.getAttribute('data-t').should.equal('1');
      return taskPaperOutline.root.lastChild.bodyString.should.equal('two');
    });

    return it('should convert outline to TaskPaper string', () => taskPaperOutline.serialize().should.equal('one @t(1)\ntwo'));
  });

  describe('Metadata', function() {

    it('should get/set', function() {
      should.not.exist(outline.getMetadata('key'));
      outline.setMetadata('key', 'value');
      outline.getMetadata('key').should.equal('value');
      outline.setMetadata('key', null);
      return should.not.exist(outline.getMetadata('key'));
    });

    return it('should serialize', function() {
      let serialized = outline.serializedMetadata;
      outline.setMetadata('key', 'value');
      outline.serializedMetadata = serialized;
      should.not.exist(outline.getMetadata('key'));

      outline.setMetadata('key', 'value');
      serialized = outline.serializedMetadata;
      outline.serializedMetadata = serialized;
      return outline.getMetadata('key').should.equal('value');
    });
  });

  it('should create item', function() {
    const item = outline.createItem('hello');
    return item.isInOutline.should.not.be.ok;
  });

  it('should get item by id', function() {
    const item = outline.createItem('hello');
    outline.root.appendChildren(item);
    return outline.getItemForID(item.id).should.equal(item);
  });

  it('should get item by branch content id', function() {
    const id = one.branchContentID;
    return outline.getItemForBranchContentID(id).should.equal(one);
  });

  it('should not get item by branch content id when content changes', function() {
    let id = one.branchContentID;
    one.bodyString = 'goat';
    should.not.exist(outline.getItemForBranchContentID(id));

    id = one.branchContentID;
    six.removeFromParent();
    return should.not.exist(outline.getItemForBranchContentID(id));
  });

  it('should copy item', function() {
    const oneCopy = outline.cloneItem(one);
    oneCopy.isInOutline.should.be.false;
    oneCopy.id.should.not.equal(one.id);
    oneCopy.bodyString.should.equal('one');
    oneCopy.firstChild.bodyString.should.equal('two');
    oneCopy.firstChild.firstChild.bodyString.should.equal('three');
    oneCopy.firstChild.lastChild.bodyString.should.equal('four');
    oneCopy.lastChild.bodyString.should.equal('five');
    return oneCopy.lastChild.firstChild.bodyString.should.equal('six');
  });

  it('should import item', function() {
    const outline2 = new Outline();
    const oneImport = outline2.importItem(one);
    oneImport.outline.should.equal(outline2);
    oneImport.isInOutline.should.be.false;
    oneImport.id.should.equal(one.id);
    oneImport.bodyString.should.equal('one');
    oneImport.firstChild.bodyString.should.equal('two');
    oneImport.firstChild.firstChild.bodyString.should.equal('three');
    oneImport.firstChild.lastChild.bodyString.should.equal('four');
    oneImport.lastChild.bodyString.should.equal('five');
    return oneImport.lastChild.firstChild.bodyString.should.equal('six');
  });

  describe('Insert & Remove Items', function() {

    it('inserts items at indent level 1 by default', function() {
      const newItem = outline.createItem('new');
      outline.insertItemsBefore(newItem, two);
      newItem.depth.should.equal(1);
      newItem.previousSibling.should.equal(one);
      newItem.firstChild.should.equal(two);
      return newItem.lastChild.should.equal(five);
    });

    it('inserts items at specified indent level', function() {
      three.indent = 3;
      four.indent = 2;
      const newItem = outline.createItem('new');
      newItem.indent = 3;
      outline.insertItemsBefore(newItem, three);
      newItem.depth.should.equal(3);
      three.depth.should.equal(5);
      four.depth.should.equal(4);
      two.firstChild.should.equal(newItem);
      newItem.firstChild.should.equal(three);
      return newItem.lastChild.should.equal(four);
    });

    it('inserts items with children', function() {
      three.indent = 4;
      four.indent = 3;
      const newItem = outline.createItem('new');
      const newItemChild = outline.createItem('new child');
      newItem.appendChildren(newItemChild);
      newItem.indent = 3;
      outline.insertItemsBefore(newItem, three);
      newItem.depth.should.equal(3);
      newItemChild.depth.should.equal(4);
      three.depth.should.equal(6);
      four.depth.should.equal(5);
      two.firstChild.should.equal(newItem);
      newItemChild.firstChild.should.equal(three);
      return newItemChild.lastChild.should.equal(four);
    });

    it('remove item leaving children', function() {
      outline.undoManager.beginUndoGrouping();
      outline.removeItems(two);
      outline.undoManager.endUndoGrouping();
      two.isInOutline.should.equal(false);
      three.isInOutline.should.equal(true);
      three.parent.should.equal(one);
      three.depth.should.equal(3);
      four.isInOutline.should.equal(true);
      four.parent.should.equal(one);
      four.depth.should.equal(3);
      outline.undoManager.undo();
      two.isInOutline.should.equal(true);
      two.firstChild.should.equal(three);
      two.lastChild.should.equal(four);
      return outline.undoManager.redo();
    });

    it('should special case remove items 1', function() {
      four.removeFromParent();
      root.appendChildren(six);
      outline.removeItems([one, two, three]);
      return six.previousItem.should.equal(five);
    });

    it('should special case remove items 2', function() {
      for (let each of Array.from(outline.root.descendants)) { each.removeFromParent(); }
      one.indent = 1;
      two.indent = 3;
      three.indent = 2;
      four.indent = 1;
      outline.insertItemsBefore([one, two, three, four]);
      outline.removeItems([one, two]);
      return root.firstChild.should.equal(three);
    });

    it('should bug case insert items', function() {
      three.indent = 2;
      outline.removeItems(two);
      two.indent -= 1;
      outline.insertItemsBefore(two, three);
      five.isInOutline.should.be.true;
      return six.isInOutline.should.be.true;
    });

    it('add items in batch in single event', function() {});

    return it('remove items in batch in single event', function() {});
  });

  describe('Undo', function() {

    it('should undo append child', function() {
      const child = outline.createItem('hello');
      one.appendChildren(child);
      outline.undoManager.undo();
      return should.not.exist(child.parent);
    });

    it('should undo remove child', function() {
      outline.undoManager.beginUndoGrouping();
      two.depth.should.equal(2);
      one.removeChildren(two);
      outline.undoManager.endUndoGrouping();
      outline.undoManager.undo();
      two.parent.should.equal(one);
      return two.depth.should.equal(2);
    });

    it('should undo remove over indented child', function() {
      three.indent = 3;
      three.depth.should.equal(5);
      outline.undoManager.beginUndoGrouping();
      two.removeChildren(three);
      outline.undoManager.endUndoGrouping();
      outline.undoManager.undo();
      three.parent.should.equal(two);
      return three.depth.should.equal(5);
    });

    it('should undo move child', function() {
      outline.undoManager.beginUndoGrouping();
      six.depth.should.equal(3);
      one.appendChildren(six);
      outline.undoManager.endUndoGrouping();
      outline.undoManager.undo();
      six.parent.should.equal(five);
      return six.depth.should.equal(3);
    });

    it('should undo set attribute', function() {
      one.setAttribute('myattr', 'test');
      one.getAttribute('myattr').should.equal('test');
      outline.undoManager.undo();
      return should.equal(one.getAttribute('myattr'), undefined);
    });

    return describe('Body Text', function() {
      it('should undo set body text', function() {
        one.bodyString = 'hello word';
        outline.undoManager.undo();
        return one.bodyString.should.equal('one');
      });

      it('should undo replace body text', function() {
        one.replaceBodyRange(1, 1, 'hello');
        one.bodyString.should.equal('ohelloe');
        outline.undoManager.undo();
        return one.bodyString.should.equal('one');
      });

      it('should coalesce consecutive body text inserts', function() {
        outline.changeCount.should.equal(0);
        outline.undoManager.beginUndoGrouping();
        one.replaceBodyRange(1, 0, 'a');
        outline.undoManager.endUndoGrouping();
        outline.undoManager.beginUndoGrouping();
        one.replaceBodyRange(2, 0, 'b');
        outline.undoManager.endUndoGrouping();
        one.replaceBodyRange(3, 0, 'c');
        outline.changeCount.should.equal(1);
        one.bodyString.should.equal('oabcne');
        outline.undoManager.undo();
        outline.changeCount.should.equal(0);
        one.bodyString.should.equal('one');
        outline.undoManager.redo();
        outline.changeCount.should.equal(1);
        return one.bodyString.should.equal('oabcne');
      });

      return it('should coalesce consecutive body text deletes', function() {
        one.replaceBodyRange(2, 1, '');
        one.replaceBodyRange(1, 1, '');
        one.replaceBodyRange(0, 1, '');
        one.bodyString.should.equal('');
        outline.undoManager.undo();
        one.bodyString.should.equal('one');
        outline.undoManager.redo();
        return one.bodyString.should.equal('');
      });
    });
  });

  return describe('Performance', () => it('should create/copy/remove 10,000 items', function() {
    // Create, copy, past a all relatively slow compared to load
    // because of time taken to generate IDs and validate that they
    // are unique to the document. Seems there should be a better
    // solution for that part of the code.
    let each, i;
    let asc, end;
    let asc1, end1;
    const branch = outline.createItem('branch');

    const itemCount = 10000;
    console.time('Create IDs');
    let items = [];
    for (i = 0, end = itemCount, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
      items.push({name: shortid()});
    }
    console.timeEnd('Create IDs');

    if (typeof console.profile === 'function') {
      console.profile('Create Items');
    }
    console.time('Create Items');
    items = [];
    for (i = 0, end1 = itemCount, asc1 = 0 <= end1; asc1 ? i <= end1 : i >= end1; asc1 ? i++ : i--) {
      each = outline.createItem('hello');
      items.push(outline.createItem('hello'));
    }
    console.timeEnd('Create Items');
    if (typeof console.profileEnd === 'function') {
      console.profileEnd();
    }

    for (each of Array.from(items)) {
      each.indent = Math.floor(Math.random() * 3);
    }

    if (typeof console.profile === 'function') {
      console.profile('Build Item Hiearchy');
    }
    console.time('Build Item Hiearchy');
    const roots = Item.buildItemHiearchy(items);
    branch.appendChildren(roots);
    outline.root.appendChildren(branch);
    outline.root.descendants.length.should.equal(itemCount + 8);
    console.timeEnd('Build Item Hiearchy');
    if (typeof console.profileEnd === 'function') {
      console.profileEnd();
    }

    console.time('Copy Items');
    branch.clone();
    console.timeEnd('Copy Items');

    console.time('Remove Items');
    Item.removeItemsFromParents(items);
    console.timeEnd('Remove Items');

    const randoms = [];
    for (i = 0; i < items.length; i++) {
      each = items[i];
      each.indent = Math.floor(Math.random() * 10);
    }

    if (typeof console.profile === 'function') {
      console.profile('Insert Items');
    }
    console.time('Insert Items');
    outline.insertItemsBefore(items, null);
    console.timeEnd('Insert Items');
    return (typeof console.profileEnd === 'function' ? console.profileEnd() : undefined);
  })

  /*
      it 'should load 100,000 items', ->
        console.profile?('Load Items')
        console.time('Load Items')
        outline2 = new Outline()
        outline2.loadSync(path.join(__dirname, '..', 'fixtures', 'big-outline.bml'))
        console.timeEnd('Load Items')
        outline2.root.descendants.length.should.equal(100007)
        console.profileEnd?()
        outline2.destroy()
      */);
});
