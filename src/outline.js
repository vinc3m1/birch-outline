/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {Emitter, Disposable, CompositeDisposable} = require('event-kit');
const AttributedString = require('./attributed-string');
const ItemSerializer = require('./item-serializer');
const UndoManager = require('./undo-manager');
const ItemPath = require('./item-path');
const Mutation = require('./mutation');
const shortid = require('./shortid');
const _ = require('underscore-plus');
const { assert } = require('./util');
const Birch = require('./birch');
const Item = require('./item');

// Public: A mutable outline of {Item}s.
//
// Use outlines to create new items, find existing items, watch for changes
// in items, and add/remove items.
//
// When you add/remove items using the outline's methods the items children are
// left in place. For example if you remove an item, it's chilren stay in the
// outline and are reasigned to a new parent item.
//
// ## Examples
//
  // Group multiple changes:
//
// ```javascript
// outline.groupUndoAndChanges(function() {
//   root = outline.root;
//   root.appendChildren(outline.createItem());
//   root.appendChildren(outline.createItem());
//   root.firstChild.bodyString = 'first';
//   root.lastChild.bodyString = 'last';
// });
// ```
//
// Watch for outline changes:
//
// ```javascript
// disposable = outline.onDidChange(function(mutation) {
//   switch(mutation.type) {
//     case Mutation.ATTRIBUTE_CHANGED:
//       console.log(mutation.attributeName);
//       break;
//     case Mutation.BODY_CHANGED:
//       console.log(mutation.target.bodyString);
//       break;
//     case Mutation.CHILDREN_CHANGED:
//       console.log(mutation.addedItems);
//       console.log(mutation.removedItems);
//       break;
//   }
// });
// ...
// disposable.dispose()
// ```
class Outline {
  static initClass() {
  
    this.prototype.type = null;
    this.prototype.metadata = null;
    this.prototype.idsToItems = null;
    this.prototype.retainCount = 0;
    this.prototype.changes = null;
    this.prototype.changeCount = 0;
    this.prototype.undoSubscriptions = null;
    this.prototype.changingCount = 0;
    this.prototype.changesCallbacks = null;
    this.prototype.coalescingMutation = null;
    this.prototype.stoppedChangingDelay = 300;
    this.prototype.stoppedChangingTimeout = null;
  
    /*
    Section: Finding Outlines
    */
  
    // Public: Read-only unique (not persistent) {String} outline ID.
    this.prototype.id = null;
  
    this.outlines = [];
  
    this.prototype.serializedMetadata = null;
    Object.defineProperty(this.prototype, 'serializedMetadata', {
      get() {
        const metadata = {};
        this.metadata.forEach((value, key) => metadata[key] = value);
        return JSON.stringify(metadata);
      },
      set(jsonMetadata) {
        let metadata;
        if (metadata = JSON.parse(jsonMetadata)) {
          this.metadata = new Map();
          return Array.from(Object.keys(metadata)).map((each) =>
            this.setMetadata(each, metadata[each]));
        }
      }
    }
    );
  
    /*
    Section: Reading Items
    */
  
    // Public: Read-only root {Item} in the outline.
    this.prototype.root = null;
  
    this.prototype.isEmpty = null;
    Object.defineProperty(this.prototype, 'isEmpty', {
      get() {
        const {
          firstChild
        } = this.root;
        return !firstChild ||
            (!firstChild.nextItem &&
            (firstChild.bodyString.length === 0));
      }
    }
    );
  
    // Public: Read-only {Array} {Item}s in the outline (except the root).
    this.prototype.items = null;
    Object.defineProperty(this.prototype, 'items',
      {get() { return this.root.descendants; }});
  
    // Public: Read-only {Boolean} true if outline is changing.
    this.prototype.isChanging = null;
    Object.defineProperty(this.prototype, 'isChanging',
      {get() { return (this.startItem === this.endItem) && (this.startOffset === this.endOffset); }});
  }

  /*
  Section: Construction
  */

  // Public: Create a new outline.
  //
  // - `type` (optional) {String} outline type. Default to {ItemSerializer.TEXTType}.
  // - `serialization` (optional) {String} Serialized outline content of `type` to load.
  constructor(type, serialization) {
    let undoManager;
    this.id = shortid();
    this.metadata = new Map();
    this.idsToItems = new Map();
    this.branchContentIDsToItems = null;
    this.type = type != null ? type : ItemSerializer.TEXTType;
    this.root = this.createItem('', Birch.RootID);
    this.root.isInOutline = true;
    this.changeDelegateProcessing = 0;
    this.changeDelegate = __guard__(ItemSerializer.getSerializationsForType(this.type)[0], x => x.changeDelegate);
    this.undoManager = (undoManager = new UndoManager);
    this.emitter = new Emitter;

    this.undoSubscriptions = new CompositeDisposable;
    this.undoSubscriptions.add(undoManager.onDidCloseUndoGroup(group => {
      if (!undoManager.isUndoing && !undoManager.isRedoing && (group.length > 0)) {
        return this.updateChangeCount(Outline.ChangeDone);
      }
    })
    );
    this.undoSubscriptions.add(undoManager.onWillUndo(() => {
      return this.breakUndoCoalescing();
    })
    );
    this.undoSubscriptions.add(undoManager.onDidUndo(() => {
      this.updateChangeCount(Outline.ChangeUndone);
      return this.breakUndoCoalescing();
    })
    );
    this.undoSubscriptions.add(undoManager.onWillRedo(() => {
      return this.breakUndoCoalescing();
    })
    );
    this.undoSubscriptions.add(undoManager.onDidRedo(() => {
      this.updateChangeCount(Outline.ChangeRedone);
      return this.breakUndoCoalescing();
    })
    );

    if (serialization) {
      this.reloadSerialization(serialization);
    }
  }

  // Public: Returns a TaskPaper {Outline}.
  //
  // The outline is configured to handle TaskPaper content at runtime. For
  // example when you set attributes through the {Item} API they are encoded in
  // the item body text as @tags. And when you modify the body text @tags are
  // parsed out and stored as attributes.
  //
  // - `content` {String} (optional) outline content in TaskPaper format.
  static createTaskPaperOutline(content) {
    return new Outline(ItemSerializer.TaskPaperType, content);
  }

  destroy() {
    if (!this.destroyed) {
      if (this.undoSubscriptions != null) {
        this.undoSubscriptions.dispose();
      }
      if (this.undoManager != null) {
        this.undoManager.removeAllActions();
      }
      this.undoManager.disableUndoRegistration();
      this.destroyed = true;
      return this.emitter.emit('did-destroy');
    }
  }

  // Public: Retrieves all open {Outline}s.
  //
  // Returns an {Array} of {Outline}s.
  static getOutlines() {
    return this.outlines.slice();
  }

  // Public: Returns existing {Outline} with the given outline id.
  //
  // - `id` {String} outline id.
  static getOutlineForID(id) {
    for (let each of Array.from(this.outlines)) {
      if (each.id === id) {
        return each;
      }
    }
  }

  static addOutline(outline) {
    return this.addOutlineAtIndex(outline, this.outlines.length);
  }

  static addOutlineAtIndex(outline, index) {
    assert(!this.getOutlineForID(outline.id));
    this.outlines.splice(index, 0, outline);
    outline.onDidDestroy(() => {
      return this.removeOutline(outline);
    });
    return outline;
  }

  static removeOutline(outline) {
    const index = this.outlines.indexOf(outline);
    if (index !== -1) { return this.removeOutlineAtIndex(index); }
  }

  static removeOutlineAtIndex(index) {
    const [outline] = Array.from(this.outlines.splice(index, 1));
    return (outline != null ? outline.destroy() : undefined);
  }

  /*
  Section: Lifecycle
  */

  isRetained() { return this.retainCount > 0; }

  retain() {
    assert(!this.destroyed, 'Cant retain destroyed outline');
    if (this.retainCount === 0) {
      Outline.addOutline(this);
    }
    this.retainCount++;
    return this;
  }

  release() {
    this.retainCount--;
    if (!this.isRetained()) { this.destroy(); }
    return this;
  }

  /*
  Section: Metadata
  */

  getMetadata(key) {
    return this.metadata.get(key);
  }

  setMetadata(key, value) {
    if (value) {
      try {
        JSON.stringify(value);
        this.metadata.set(key, value);
      } catch (e) {
        console.log(`value: ${value} not JSON serializable ${e}`);
      }
    } else {
      this.metadata.delete(key);
    }
    return this.updateChangeCount(Outline.ChangeDone);
  }

  /*
  Section: Events
  */

  // Public: Invoke the given callback when the outline begins a series of
  // changes.
  //
  // * `callback` {Function} to be called when the outline begins updating.
  //
  // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  onDidBeginChanges(callback) {
    return this.emitter.on('did-begin-changes', callback);
  }

  // Public: Invoke the given callback _before_ the outline changes.
  //
  // * `callback` {Function} to be called when the outline will change.
  //   * `mutation` {Mutation} describing the change.
  //
  // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  onWillChange(callback) {
    return this.emitter.on('will-change', callback);
  }

  // Public: Invoke the given callback when the outline changes.
  //
  // See {Outline} Examples for an example of subscribing to this event.
  //
  // - `callback` {Function} to be called when the outline changes.
  //   - `mutation` {Mutation} describing the changes.
  //
  // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  onDidChange(callback) {
    return this.emitter.on('did-change', callback);
  }

  // Public: Invoke the given callback when the outline ends a series of
  // changes.
  //
  // * `callback` {Function} to be called when the outline ends updating.
  //   - `changes` {Array} of {Mutation}s.
  //
  // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  onDidEndChanges(callback) {
    return this.emitter.on('did-end-changes', callback);
  }

  // Public: Invoke the given callback when the outline's change count is
  // updated.
  //
  // - `callback` {Function} to be called when change count is updated.
  //   - `changeType` The type of change made to the document.
  //
  // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  onDidUpdateChangeCount(callback) {
    return this.emitter.on('did-update-change-count', callback);
  }

  onWillReload(callback) {
    return this.emitter.on('will-reload', callback);
  }

  onDidReload(callback) {
    return this.emitter.on('did-reload', callback);
  }

  // Public: Invoke the given callback when the outline is destroyed.
  //
  // - `callback` {Function} to be called when the outline is destroyed.
  //
  // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
  }

  getStoppedChangingDelay() { return this.stoppedChangingDelay; }

  // Public: Returns {Item} for given id.
  //
  // - `id` {String} id.
  getItemForID(id) {
    return this.idsToItems.get(id);
  }

  getItemsForIDs(ids) {
    if (!ids) { return []; }

    const items = [];
    for (let each of Array.from(ids)) {
      each = this.getItemForID(each);
      if (each) {
        items.push(each);
      }
    }
    return items;
  }

  getItemForBranchContentID(contentID) {
    if (!this.branchContentIDsToItems) {
      this.branchContentIDsToItems = new Map();
      for (let each of Array.from(this.root.descendants)) {
        this.branchContentIDsToItems.set(each.branchContentID, each);
      }
    }
    return this.branchContentIDsToItems.get(contentID);
  }

  getItemForFuzzyContentID(fuzzyContentID) {}

  getAttributeNames(autoIncludeAttributes, excludeAttributes) {
    let each;
    if (autoIncludeAttributes == null) { autoIncludeAttributes = []; }
    if (excludeAttributes == null) { excludeAttributes = []; }
    const attributes = new Set();

    for (each of Array.from(autoIncludeAttributes)) {
      attributes.add(each);
    }

    for (each of Array.from(this.root.descendants)) {
      for (let eachAttributeName of Array.from(Object.keys(each.attributes))) {
        if (excludeAttributes.indexOf(eachAttributeName) === -1) {
          attributes.add(eachAttributeName);
        }
      }
    }

    const attributesArray = [];
    attributes.forEach(each => attributesArray.push(each));
    attributesArray.sort();
    return attributesArray;
  }

  getTagAttributeNames(autoIncludeAttributes, excludeAttributes) {
    if (autoIncludeAttributes == null) { autoIncludeAttributes = []; }
    if (excludeAttributes == null) { excludeAttributes = []; }
    return this.getAttributeNames(autoIncludeAttributes, excludeAttributes).filter(each => each.substring(0, 5) === 'data-');
  }

  // Public: Evaluate the [item path
  // search](https://guide.taskpaper.com/reference/searches/) starting from
  // this outline's {Outline.root} item or from the passed in `contextItem` if
  // present.
  //
  // - `itemPath` {String} itempath expression.
  // - `contextItem` (optional) defaults to {Outline.root}.
  //
  // Returns an {Array} of matching {Item}s.
  evaluateItemPath(itemPath, contextItem, options) {
    if (options == null) { options = {}; }
    if (options.root == null) { options.root = this.root; }
    if (options.types == null) { options.types = ItemSerializer.getSerializationsForType(this.type)[0].itemPathTypes; }
    if (contextItem == null) { contextItem = this.root; }
    return ItemPath.evaluate(itemPath, contextItem, options);
  }

  /*
  Section: Creating Items
  */

  // Public: Create a new item. The new item is owned by this outline, but is
  // not yet inserted into it so it won't be visible until you insert it.
  //
  // - `text` (optional) {String} or {AttributedString}.
  createItem(text, id, remapIDCallback) {
    return new Item(this, text, id, remapIDCallback);
  }

  // Public: The cloned item is owned by this outline, but is not yet inserted
  // into it so it won't be visible until you insert it.
  //
  // - `item` {Item} to clone.
  // - `deep` (optional) defaults to true.
  //
  // Returns Clone of the given {Item}.
  cloneItem(item, deep, remapIDCallback) {
    let eachChild;
    if (deep == null) { deep = true; }
    assert(!item.isOutlineRoot, 'Can not clone root');
    assert(item.outline === this, 'Item must be owned by this outline');

    const clonedItem = this.createItem(item.bodyAttributedString.clone());

    if (item.attributes) {
      clonedItem.attributes = Object.assign({}, item.attributes);
    }

    clonedItem.indent = item.depth;

    if (deep && (eachChild = item.firstChild)) {
      const clonedChildren = [];
      while (eachChild) {
        const clonedChild = this.cloneItem(eachChild, deep);
        clonedChild.indent = eachChild.indent;
        clonedChildren.push(clonedChild);
        eachChild = eachChild.nextSibling;
      }
      clonedItem.insertChildrenBefore(clonedChildren, null, true);
    }

    if (typeof remapIDCallback === 'function') {
      remapIDCallback(item.id, clonedItem.id, clonedItem);
    }
    return clonedItem;
  }

  cloneItems(items, deep, remapIDCallback) {
    if (deep == null) { deep = true; }
    const clones = [];
    for (let each of Array.from(items)) {
      clones.push(this.cloneItem(each, deep, remapIDCallback));
    }
    return clones;
  }


  // Public: Creates a clone of the given {Item} from an external outline that
  // can be inserted into the current outline.
  //
  // - `item` {Item} to import.
  // - `deep` (optional) defaults to true.
  //
  // Returns {Item} clone.
  importItem(item, deep, remapIDCallback) {
    let eachChild;
    if (deep == null) { deep = true; }
    assert(!item.isOutlineRoot, 'Can not import root item');
    assert(item.outline !== this, 'Item must not be owned by this outline');

    const importedItem = this.createItem(item.bodyAttributedString.clone(), item.id, remapIDCallback);

    if (item.attributes) {
      importedItem.attributes = Object.assign({}, item.attributes);
    }

    if (deep && (eachChild = item.firstChild)) {
      const children = [];
      while (eachChild) {
        children.push(this.importItem(eachChild, deep));
        eachChild = eachChild.nextSibling;
      }
      importedItem.appendChildren(children);
    }

    return importedItem;
  }

  /*
  Section: Insert & Remove Items
  */

  // Public: Insert the items before the given `referenceItem`. If the
  // reference item isn't defined insert at the end of this outline.
  //
  // Unlike {Item::insertChildrenBefore} this method uses {Item::indent} to
  // determine where in the outline structure to insert the items. Depending on
  // the indent value these items may become referenceItem's parent, previous
  // sibling, or unrelated.
  //
  // - `items` {Item} or {Array} of {Item}s to insert.
  // - `referenceItem` Reference {Item} to insert before.
  insertItemsBefore(items, referenceItem) {
    if (!Array.isArray(items)) {
      items = [items];
    }

    if (!items.length) {
      return;
    }

    return this.groupUndoAndChanges(() => {
      // 1. Group items into hiearhcies while saving roots.
      let each, nextBranch;
      const roots = Item.buildItemHiearchy(items);

      // 1.1 Validate reference item.
      if (referenceItem) {
        assert(referenceItem.isInOutline, 'reference item must be in outline if defined');
        assert(referenceItem.outline === this, 'reference item outline must be this outline if defined');
      }

      // 2. Make sure each root has indent of at least 1 so that they will always
      // insert as children of outline.root.
      for (each of Array.from(roots)) {
        if (each.indent < 1) {
          each.indent = 1;
        }
      }

      // 3. Group roots by indentation level so they can all be inseted in a
      // single mutation instent of one by one.
      const rootGroups = [];
      let currentDepth = undefined;
      for (each of Array.from(roots)) {
        if (each.depth === currentDepth) {
          current.push(each);
        } else {
          var current = [each];
          rootGroups.push(current);
          currentDepth = each.depth;
        }
      }

      // 4. Insert root groups where appropriate in the outline.
      for (let eachGroup of Array.from(rootGroups)) {
        const eachGroupDepth = eachGroup[0].depth;
        // find insert point
        let parent = (referenceItem != null ? referenceItem.previousItemOrRoot : undefined) || this.root.lastBranchItem;
        let nextSibling = parent.firstChild;
        let parentDepth = parent.depth;
        nextBranch = referenceItem;
        while (parentDepth >= eachGroupDepth) {
          ({
            nextSibling
          } = parent);
          ({
            parent
          } = parent);
          parentDepth = parent.depth;
        }
        // restore indents and insert
        for (each of Array.from(eachGroup)) {
          each.indent = eachGroupDepth - parent.depth;
        }
        parent.insertChildrenBefore(eachGroup, nextSibling, true);
      }

      // 5. Reparent covered trailing branches to last inserted root.
      const lastRoot = roots[roots.length - 1];
      const ancestorStack = [];
      each = lastRoot;
      while (each) {
        ancestorStack.push(each);
        each = each.lastChild;
      }

      const trailingBranches = [];
      while (referenceItem && (referenceItem.depth > lastRoot.depth)) {
        trailingBranches.push(referenceItem);
        referenceItem = referenceItem.nextBranch;
      }

      return Item.buildItemHiearchy(trailingBranches, ancestorStack);
    });
  }

  // Public: Remove the items but leave their child items in the outline and
  // give them new parents.
  //
  // - `items` {Item} or {Item} {Array} to remove.
  removeItems(items) {
    let each;
    if (!Array.isArray(items)) {
      items = [items];
    }

    if (!(items.length > 0)) {
      return;
    }

    // Group items into contiguous ranges so they are easier to reason about
    // when grouping the removes for efficiency.
    const contiguousItemRanges = [];
    let previousItem = undefined;
    for (each of Array.from(items)) {
      if (previousItem && (previousItem === each.previousItem)) {
        currentRange.push(each);
      } else {
        var currentRange = [each];
        contiguousItemRanges.push(currentRange);
      }
      previousItem = each;
    }

    return this.groupUndoAndChanges(() => {
      return (() => {
        const result = [];
        for (each of Array.from(contiguousItemRanges)) {
          result.push(this._removeContiguousItems(each));
        }
        return result;
      })();
    });
  }

  _removeContiguousItems(items) {
    // 1. Collect all items to remove together with their children. Only
    // some of these items are to be removed, the others will be reinserted.
    const coveredItems = [];
    const commonAncestors = Item.getCommonAncestors(items);
    const end = commonAncestors[commonAncestors.length - 1].nextBranch;
    let each = items[0];
    while (each !== end) {
      coveredItems.push(each);
      each = each.nextItem;
    }

    // 2. Save item that reinserted items should be reinserted before.
    const insertBefore = coveredItems[coveredItems.length - 1].nextBranch;

    // 3. Figure out which items should be reinserted.
    const removeItemsSet = new Set();
    for (each of Array.from(items)) {
      removeItemsSet.add(each);
    }
    const reinsertChildren = [];
    for (each of Array.from(coveredItems)) {
      if (!removeItemsSet.has(each)) {
        reinsertChildren.push(each);
      }
    }

    // 4. Remove the items that are actually meant to be removed.
    Item.removeItemsFromParents(items);

    // 5. Reinsert items that shouldn't have been removed
    return this.insertItemsBefore(reinsertChildren, insertBefore);
  }

  /*
  Section: Changes
  */

  // Public: Determine if the outline is changed.
  //
  // Returns a {Boolean}.
  isChanged() {
    return this.changeCount !== 0;
  }

  // Public: Updates the receiver’s change count according to the given change
  // type.
  updateChangeCount(changeType) {
    switch (changeType) {
      case Outline.ChangeDone:
        this.changeCount++;
        break;
      case Outline.ChangeUndone:
        this.changeCount--;
        break;
      case Outline.ChangeCleared:
        this.changeCount = 0;
        break;
      case Outline.ChangeRedone:
        this.changeCount++;
        break;
    }
    return this.emitter.emit('did-update-change-count', changeType);
  }

  // Public: Group changes to the outline for better performance.
  //
  // - `callback` Callback that contains code to change {Item}s in this {Outline}.
  groupChanges(callback) {
    this.beginChanges();
    callback();
    return this.endChanges();
  }

  willChange(mutation) {
    return this.emitter.emit('will-change', mutation);
  }

  beginChanges() {
    this.changingCount++;
    if (this.changingCount === 1) {
      this.changes = [];
      this.changesCallbacks = [];
      return this.emitter.emit('did-begin-changes');
    }
  }

  itemDidChangeBody(item, oldBody) {
    if (!this.changeDelegate) { return; }
    this.changeDelegateProcessing++;
    this.changeDelegate.processItemDidChangeBody(item, oldBody);
    return this.changeDelegateProcessing--;
  }

  itemDidChangeAttribute(item, name, value, oldValue) {
    if (!this.changeDelegateProcessing && this.changeDelegate) {
      return this.changeDelegate.processItemDidChangeAttribute(item, name, value, oldValue);
    }
  }

  recordChange(mutation) {
    if (!this.undoManager.isUndoRegistrationEnabled()) {
      return;
    }

    if (this.undoManager.isUndoing || this.undoManager.isUndoing) {
      this.breakUndoCoalescing();
    }

    if (this.coalescingMutation && this.coalescingMutation.coalesce(mutation)) {
      const metadata = this.undoManager.getUndoGroupMetadata();
      const {
        undoSelection
      } = metadata;
      if (undoSelection && (this.coalescingMutation.type === Mutation.BODY_CHANGED)) {
        // Update the undo selection to match coalescingMutation
        undoSelection.anchorOffset = this.coalescingMutation.insertedTextLocation;
        undoSelection.startOffset = this.coalescingMutation.insertedTextLocation;
        undoSelection.headOffset = this.coalescingMutation.insertedTextLocation + this.coalescingMutation.replacedText.length;
        return undoSelection.endOffset = this.coalescingMutation.insertedTextLocation + this.coalescingMutation.replacedText.length;
      }
    } else {
      this.undoManager.registerUndoOperation(mutation);
      return this.coalescingMutation = mutation;
    }
  }

  didChange(mutation) {
    this.changes.push(mutation);
    return this.emitter.emit('did-change', mutation);
  }

  endChanges(callback) {
    if (callback) { this.changesCallbacks.push(callback); }
    this.changingCount--;
    if (this.changingCount === 0) {
      this.branchContentIDsToItems = null;
      this.emitter.emit('did-end-changes', this.changes);
      const {
        changesCallbacks
      } = this;
      this.changesCallbacks = null;
      for (let each of Array.from(changesCallbacks)) {
        each(this.changes);
      }
      return this.changes = null;
    }
  }

  /*
  Section: Undo
  */

  // Public: Group multiple changes into a single undo group.
  //
  // - `callback` Callback that contains code to change {Item}s in this {Outline}.
  groupUndo(callback) {
    this.beginUndoGrouping();
    callback();
    return this.endUndoGrouping();
  }

  // Public: Group multiple changes into a single undo and change
  // group. This is a shortcut for:
  //
  // ```javascript
  // outline.groupUndo(function() {
  //   outline.groupChanges(function() {
  //     console.log('all grouped up!');
  //   });
  // });
  // ```
  //
  // - `callback` Callback that contains code to change {Item}s in this {Outline}.
  groupUndoAndChanges(callback) {
    this.beginUndoGrouping();
    this.beginChanges();
    callback();
    this.endChanges();
    return this.endUndoGrouping();
  }

  beginUndoGrouping(metadata) {
    return this.undoManager.beginUndoGrouping(metadata);
  }

  endUndoGrouping() {
    return this.undoManager.endUndoGrouping();
  }

  breakUndoCoalescing() {
    return this.coalescingMutation = null;
  }

  // Public: Undo the last undo group.
  undo() {
    return this.undoManager.undo();
  }

  // Public: Redo the last undo group.
  redo() {
    return this.undoManager.redo();
  }

  /*
  Section: Serialization
  */

  serializeItems(items, options) {
    if (options == null) { options = {}; }
    return ItemSerializer.serializeItems(items, options);
  }

  deserializeItems(serializedItems, options) {
    if (options == null) { options = {}; }
    return ItemSerializer.deserializeItems(serializedItems, this, options);
  }

  // Public: Return a serialized {String} version of this Outline's content.
  //
  // - `options` (optional) Serialization options as defined in `{ItemSerializer.serializeItems}.
  //   `type` key defaults to {outline::type}.
  serialize(options) {
    if (options == null) { options = {}; }
    if (options['type'] == null) { options['type'] = this.type; }
    return ItemSerializer.serializeItems(this.root.descendants, options);
  }

  // Public: Reload the content of this outline using the given string serilaization.
  //
  // - `serialization` {String} outline serialization.
  // - `options` (optional) Deserialization options as defined in `{ItemSerializer.deserializeItems}.
  //   `type` key defaults to {outline::type}.
  reloadSerialization(serialization, options) {
    if (options == null) { options = {}; }
    if (serialization != null) {
      if (options['type'] == null) { options['type'] = this.type; }
      this.emitter.emit('will-reload');
      this.undoManager.removeAllActions();
      this.undoManager.disableUndoRegistration();
      this.groupChanges(() => {
        const items = ItemSerializer.deserializeItems(serialization, this, options);
        this.root.removeChildren(this.root.children);
        return this.root.appendChildren(items);
      });
      this.undoManager.enableUndoRegistration();
      this.updateChangeCount(Outline.ChangeCleared);
      return this.emitter.emit('did-reload');
    }
  }

  /*
  Section: Debug
  */

  // Extended: Returns debug string for this item.
  toString() {
    return this.root.branchToString();
  }

  /*
  Section: Private Utility Methods
  */

  nextOutlineUniqueItemID(candidateID) {
    const {
      loadingLIUsedIDs
    } = this;
    while (true) {
      const id = candidateID || shortid();
      if (loadingLIUsedIDs && !loadingLIUsedIDs[id]) {
        loadingLIUsedIDs[id] = true;
        return id;
      } else if (!this.idsToItems.get(id)) {
        return id;
      } else {
        candidateID = null;
      }
    }
  }
}
Outline.initClass();

Outline.ChangeDone = 'Done';
Outline.ChangeUndone = 'Undone';
Outline.ChangeRedone = 'Redone';
Outline.ChangeCleared = 'Cleared';

module.exports = Outline;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}