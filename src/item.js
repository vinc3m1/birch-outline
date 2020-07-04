/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Item;
const AttributedString = require('./attributed-string');
const stringHash = require('string-hash');
const DateTime = require('./date-time');
const ItemPath = require('./item-path');
const Mutation = require('./mutation');
const _ = require('underscore-plus');
const { assert } = require('./util');
const ctphHash = require('ctph.js');


// Public: A paragraph of text in an {Outline}.
//
// Items cannot be created directly. Use {Outline::createItem} to create items.
//
// Items may contain other child items to form a hierarchy. When you move an
// item its children move with it. See the "Structure" and "Mutate Structure"
// sections for associated APIs. To move an item while leaving it's children in
// place see the methods in {Outline}s "Insert & Remove Items".
//
// Items may have associated attributes. You can add your own attributes by
// using the APIs described in the "Item Attributes" section. For example you might
// add a due date using the `data-due-date` attribute.
//
// Items have an associated paragraph of body text. You can access it as plain
// text or as an immutable {AttributedString}. You can also add and remove
// attributes from ranges of body text. See "Item Body Text" for associated
// APIs. While you can add these attributes at runtime, TaskPaper won't save
// them to disk since it saved in plain text without associated text run
// attributes.
//
// ## Examples
//
// Create Items:
//
// ```javascript
// var item = outline.createItem('Hello World!');
// outline.root.appendChildren(item);
// ```
//
// Add attributes to body text:
//
// ```javascript
// var item = outline.createItem('Hello World!');
// item.addBodyAttributeInRange('B', {}, 6, 5);
// item.addBodyAttributeInRange('I', {}, 0, 11);
// ```
//
// Reading attributes from body text:
//
// ```javascript
// var effectiveRange = {};
// var textLength = item.bodyString.length;
// var index = 0;
// while (index < textLength) {
//   console.log(item.getBodyAttributesAtIndex(index, effectiveRange));
//   index += effectiveRange.length;
// }
//```
module.exports =
(Item = (function() {
  Item = class Item {
    static initClass() {
  
      /*
      Section: Properties
      */
  
      // Public: Read-only unique {String} identifier.
      this.prototype.id = null;
  
      this.prototype.contentID = null;
      Object.defineProperty(this.prototype, 'contentID', {
        get() {
          return stringHash(this.bodyString);
        }
      }
      );
  
      this.prototype.branchContentID = null;
      Object.defineProperty(this.prototype, 'branchContentID', {
        get() {
          if (!this.cachedBranchContentID) {
            const childBranchContentIDs = [this.contentID];
            let each = this.firstChild;
            while (each) {
              childBranchContentIDs.push(each.branchContentID);
              each = each.nextSibling;
            }
            this.cachedBranchContentID = `${stringHash(childBranchContentIDs.join(''))}`;
          }
          return this.cachedBranchContentID;
        }
      }
      );
  
      // Public: Read-only {Outline} that this item belongs to.
      this.prototype.outline = null;
  
  
      /*
      Section: Structure
      */
  
      // Public: Read-only true if item is contained by root of owning {Outline}.
      this.prototype.isInOutline = false;
      Object.defineProperty(this.prototype, 'isInOutline', {
        get() { return this.inOutline; },
        set(isInOutline) {
          if (this.inOutline !== isInOutline) {
            if (isInOutline) {
              // After an item is first added to outline start recording undoable
              // changes for remainder of items existance.
              this.recordedUndoableChanges = true;
              this.outline.idsToItems.set(this.id, this);
            } else {
              this.outline.idsToItems.delete(this.id);
            }
  
            this.inOutline = isInOutline;
            let each = this.firstChild;
            while (each) {
              each.isInOutline = isInOutline;
              each = each.nextSibling;
            }
          }
          return this;
        }
      }
      );
  
      // Public: Read-only true if is {::outline} root {Item}.
      this.prototype.isOutlineRoot = null;
      Object.defineProperty(this.prototype, 'isOutlineRoot',
        {get() { return this === this.outline.root; }});
  
      this.prototype.localRoot = null;
      Object.defineProperty(this.prototype, 'localRoot', {
        get() {
          if (this.isInOutline) {
            return this.outline.root;
          } else {
            let each = this;
            while (each.parent) {
              each = each.parent;
            }
            return each;
          }
        }
      }
      );
  
      // Public: Read-only depth of {Item} in outline structure. Calculated by
      // summing the {Item::indent} of this item and it's ancestors.
      this.prototype.depth = null;
      Object.defineProperty(this.prototype, 'depth', {
        get() {
          let depth = this.indent;
          let ancestor = this.parent;
          while (ancestor) {
            depth += ancestor.indent;
            ancestor = ancestor.parent;
          }
          return depth;
        }
      }
      );
  
      this.prototype.row = null;
      Object.defineProperty(this.prototype, 'row', {
        get() {
          if (this.isOutlineRoot) {
            return -1;
          }
          let row = 0;
          let each = this.previousItem;
          while (each) {
            row++;
            each = each.previousItem;
          }
          return row;
        }
      }
      );
  
      // Public: Read-only parent {Item}.
      this.prototype.parent = null;
  
      // Public: Read-only first child {Item}.
      this.prototype.firstChild = null;
  
      // Public: Read-only last child {Item}.
      this.prototype.lastChild = null;
  
      // Public: Read-only previous sibling {Item}.
      this.prototype.previousSibling = null;
  
      // Public: Read-only next sibling {Item}.
      this.prototype.nextSibling = null;
  
      // Public: Read-only previous branch {Item}.
      this.prototype.previousBranch = null;
      Object.defineProperty(this.prototype, 'previousBranch',
        {get() { return this.previousSibling || this.previousItem; }});
  
      // Public: Read-only next branch {Item}.
      this.prototype.nextBranch = null;
      Object.defineProperty(this.prototype, 'nextBranch',
        {get() { return this.lastBranchItem.nextItem; }});
  
      // Public: Read-only {Array} of ancestor {Item}s.
      this.prototype.ancestors = null;
      Object.defineProperty(this.prototype, 'ancestors', {
        get() {
          const ancestors = [];
          let each = this.parent;
          while (each) {
            ancestors.unshift(each);
            each = each.parent;
          }
          return ancestors;
        }
      }
      );
  
      // Public: Read-only {Array} of descendant {Item}s.
      this.prototype.descendants = null;
      Object.defineProperty(this.prototype, 'descendants', {
        get() {
          const descendants = [];
          const end = this.nextBranch;
          let each = this.nextItem;
          while (each !== end) {
            descendants.push(each);
            each = each.nextItem;
          }
          return descendants;
        }
      }
      );
  
      // Public: Read-only last descendant {Item}.
      this.prototype.lastDescendant = null;
      Object.defineProperty(this.prototype, 'lastDescendant', {
        get() {
          let each = this.lastChild;
          while (each != null ? each.lastChild : undefined) {
            each = each.lastChild;
          }
          return each;
        }
      }
      );
  
      // Public: Read-only {Array} of this {Item} and its descendants.
      this.prototype.branchItems = null;
      Object.defineProperty(this.prototype, 'branchItems', {
        get() {
          const {
            descendants
          } = this;
          descendants.unshift(this);
          return descendants;
        }
      }
      );
  
      // Public: Last {Item} in branch rooted at this item.
      this.prototype.lastBranchItem = null;
      Object.defineProperty(this.prototype, 'lastBranchItem',
        {get() { return this.lastDescendant || this; }});
  
      // Public: Read-only previous {Item} in the outline.
      this.prototype.previousItem = null;
      Object.defineProperty(this.prototype, 'previousItem', {
        get() {
          const {
            previousSibling
          } = this;
          if (previousSibling) {
            return previousSibling.lastBranchItem;
          } else {
            const {
              parent
            } = this;
            if (!parent || parent.isOutlineRoot) {
              return null;
            } else {
              return parent;
            }
          }
        }
      }
      );
  
      Object.defineProperty(this.prototype, 'previousItemOrRoot',
        {get() { return this.previousItem || this.parent; }});
  
      // Public: Read-only next {Item} in the outline.
      this.prototype.nextItem = null;
      Object.defineProperty(this.prototype, 'nextItem', {
        get() {
          const {
            firstChild
          } = this;
          if (firstChild) {
            return firstChild;
          }
  
          let {
            nextSibling
          } = this;
          if (nextSibling) {
            return nextSibling;
          }
  
          let {
            parent
          } = this;
          while (parent) {
            ({
              nextSibling
            } = parent);
            if (nextSibling) {
              return nextSibling;
            }
            ({
              parent
            } = parent);
          }
  
          return null;
        }
      }
      );
  
      // Public: Read-only has children {Boolean}.
      this.prototype.hasChildren = null;
      Object.defineProperty(this.prototype, 'hasChildren',
        {get() { return !!this.firstChild; }});
  
      // Public: Read-only {Array} of child {Item}s.
      this.prototype.children = null;
      Object.defineProperty(this.prototype, 'children', {
        get() {
          const children = [];
          let each = this.firstChild;
          while (each) {
            children.push(each);
            each = each.nextSibling;
          }
          return children;
        }
      }
      );
  
      /*
      Section: Mutate Structure
      */
  
      // Public: Visual indent of {Item} relative to parent. Normally this will be
      // 1 for children with a parent as they are indented one level beyond there
      // parent. But items can be visually over-indented in which case this value
      // would be greater then 1.
      this.prototype.indent = null;
      Object.defineProperty(this.prototype, 'indent', {
        get() {
          let indent;
          if ((indent = this.getAttribute('indent'))) {
            return parseInt(indent, 10);
          } else if (this.parent) {
            return 1;
          } else {
            return 0;
          }
        },
  
        set(indent) {
          let nextSibling, previousSibling;
          if (indent < 1) { indent = 1; }
  
          if (previousSibling = this.previousSibling) {
            assert(indent <= previousSibling.indent, 'item indent must be less then or equal to previousSibling indent');
          }
  
          if (nextSibling = this.nextSibling) {
            assert(indent >= nextSibling.indent, 'item indent must be greater then or equal to nextSibling indent');
          }
  
          if (this.parent && (indent === 1)) {
            indent = null;
          } else if (indent < 1) {
            indent = null;
          }
  
          return this.setAttribute('indent', indent);
        }
      }
      );
  
      /*
      Section: Item Attributes
      */
  
      this.prototype.tagName = null; // Not used, except for in stylesheet-spec right now.
      Object.defineProperty(this.prototype, 'tagName',
        {get() { return 'item'; }});
  
      /*
      Not going to support nested elements for styling, makes invalidating to hard for now.
      parentNode: null
      Object.defineProperty @::, 'parentNode',
        get: -> @parent
      */
  
      // Public: Read-only key/value object of the attributes associated with this
      // {Item}.
      this.prototype.attributes = null;
  
      // Public: Read-only {Array} of this {Item}'s attribute names.
      this.prototype.attributeNames = null;
      Object.defineProperty(this.prototype, 'attributeNames', {
        get() {
          if (this.attributes) {
            return Object.keys(this.attributes).sort();
          } else {
            return [];
          }
        }
      });
  
      /*
      Section: Item Body Text
      */
  
      // Public: Body text as plain text {String}.
      this.prototype.bodyString = null;
      Object.defineProperty(this.prototype, 'bodyString', {
        get() {
          return this.body.string.toString();
        },
        set(text) {
          if (text == null) { text = ''; }
          return this.replaceBodyRange(0, -1, text);
        }
      }
      );
  
      // Public: Body "content" text as plain text {String}. Excludes trailing tags
      // and leading syntax. For example used when displaying items to user's in
      // menus.
      this.prototype.bodyContentString = null;
      Object.defineProperty(this.prototype, 'bodyContentString', {
        get() {
          const range = {};
          if (this.bodyHighlightedAttributedString.getFirstOccuranceOfAttribute('content', null, range) != null) {
            return this.bodyString.substr(range.location, range.length);
          } else {
            return this.bodyString;
          }
        },
        set(text) {
          if (text == null) { text = ''; }
          const range = {};
          if (this.bodyHighlightedAttributedString.getFirstOccuranceOfAttribute('content', null, range) != null) {
            return this.replaceBodyRange(range.location, range.length, text);
          } else {
            return this.bodyString = text;
          }
        }
      }
      );
  
      this.prototype.bodyHTMLString = null;
      Object.defineProperty(this.prototype, 'bodyHTMLString', {
        get() { return this.bodyAttributedString.toInlineBMLString(); },
        set(html) {
          return this.bodyAttributedString = AttributedString.fromInlineBMLString(html);
        }
      }
      );
  
      // Public: Body text as immutable {AttributedString}. Do not modify this
      // AttributedString, instead use the other methods in this "Body Text"
      // section. They will both modify the string and create the appropriate
      // {Mutation} events needed to keep the outline valid.
      this.prototype.bodyAttributedString = null;
      Object.defineProperty(this.prototype, 'bodyAttributedString', {
        get() {
          if (this.isOutlineRoot) {
            return new AttributedString;
          }
          return this.body;
        },
        set(attributedText) {
          return this.replaceBodyRange(0, -1, attributedText);
        }
      }
      );
  
      // Public: Syntax highlighted body text as immutable {AttributedString}.
      // Unlike `bodyAttributedString` this string contains attributes created by
      // syntax highlighting such as tag name and value ranges.
      //
      // Do not modify this AttributedString, instead use the other methods in this
      // "Body Text" section. They will both modify the string and create the
      // appropriate {Mutation} events needed to keep the outline valid.
      this.prototype.bodyHighlightedAttributedString = null;
      Object.defineProperty(this.prototype, 'bodyHighlightedAttributedString', {
        get() {
          return this.bodyHighlighted != null ? this.bodyHighlighted : this.body;
        }
      }
      );
    }

    constructor(outline, text, id, remappedIDCallback) {
      this.id = outline.nextOutlineUniqueItemID(id);
      this.cachedBranchContentID = null;
      this.outline = outline;
      this.inOutline = false;
      this.recordedUndoableChanges = false;
      this.bodyHighlighted = null;

      if (text instanceof AttributedString) {
        this.body = text;
      } else {
        this.body = new AttributedString(text);
      }


      outline.itemDidChangeBody(this, '');

      if (id !== this.id) {
        if (remappedIDCallback && id) {
          remappedIDCallback(id, this.id, this);
        }
      }
    }

    clearCachedBranchContentID() {
      let each = this;
      return (() => {
        const result = [];
        while (each) {
          each.cachedBranchContentID = null;
          result.push(each = each.parent);
        }
        return result;
      })();
    }

    /*
    Section: Clone
    */

    // Public: Clones this item.
    //
    // - `deep` (optional) defaults to true.
    //
    // Returns a duplicate {Item} with a new {::id}.
    clone(deep, remappedIDCallback) {
      return this.outline.cloneItem(this, deep, remappedIDCallback);
    }

    // Public: Determines if this item contains the given item.
    //
    // - `item` The {Item} to check for containment.
    //
    // Returns {Boolean}.
    contains(item) {
      let ancestor = item != null ? item.parent : undefined;
      while (ancestor) {
        if (ancestor === this) {
          return true;
        }
        ancestor = ancestor.parent;
      }
      return false;
    }

    // Public: Given an array of items determines and returns the common
    // ancestors of those items.
    //
    // - `items` {Array} of {Item}s.
    //
    // Returns a {Array} of common ancestor {Item}s.
    static getCommonAncestors(items) {
      let each;
      const commonAncestors = [];
      const itemIDs = {};

      for (each of Array.from(items)) {
        itemIDs[each.id] = true;
      }

      for (each of Array.from(items)) {
        let p = each.parent;
        while (p && !itemIDs[p.id]) {
          p = p.parent;
        }
        if (!p) {
          commonAncestors.push(each);
        }
      }

      return commonAncestors;
    }

    // Build tree by processing items in order and builing structure based on
    // item depth. Build efficiently, single call to insertChildrenBefore for
    // each parent.
    static buildItemHiearchy(items, parentStack) {
      let siblings;
      if (parentStack == null) { parentStack = []; }
      Item.removeItemsFromParents(items);

      let roots = [];
      const siblingsStack = [];

      const insertSiblings = function(siblings) {
        if (siblings.parent) {
          const parentDepth = siblings.parent.depth;
          const siblingsDepth = siblings.depth;
          const siblingsIndent = siblingsDepth - parentDepth;
          for (let each of Array.from(siblings)) {
            each.indent = siblingsIndent;
          }
          return siblings.parent.insertChildrenBefore(siblings, null, true);
        } else {
          return roots = roots.concat(siblings);
        }
      };

      for (let each of Array.from(items)) {
        const eachDepth = each.depth;

        while ((siblings = siblingsStack[siblingsStack.length - 1]) && (siblings.depth > eachDepth)) {
          insertSiblings(siblings);
          siblingsStack.pop();
        }

        if (siblings && (siblings.depth === eachDepth)) {
          siblings.push(each);
        } else {
          var parent;
          while ((parent = parentStack[parentStack.length - 1]) && (parent.depth >= eachDepth)) {
            parentStack.pop();
          }

          const newGroup = [each];
          newGroup.parent = parent;
          newGroup.depth = eachDepth;
          siblingsStack.push(newGroup);
        }

        parentStack.push(each);
      }

      while (siblingsStack.length) {
        siblings = siblingsStack[siblingsStack.length - 1];
        insertSiblings(siblings);
        siblingsStack.pop();
      }

      return roots;
    }

    static flattenItemHiearchy(items, removeFromParents) {
      if (removeFromParents == null) { removeFromParents = true; }
      const flattenedItems = [];
      for (let each of Array.from(items)) {
        flattenedItems.push(each);
        if (each.hasChildren) {
          for (let eachDescendant of Array.from(each.descendants)) {
            flattenedItems.push(eachDescendant);
          }
        }
      }
      if (removeFromParents) {
        this.removeItemsFromParents(flattenedItems);
      }
      return flattenedItems;
    }

    // Removes items efficiently in minimal number of mutations. Assumes that
    // items are in continiguous outline order.
    static removeItemsFromParents(items) {
      let siblings = [];
      let previous = null;
      for (let each of Array.from(items)) {
        if (each.parent != null) {
          if (!previous || (previous.nextSibling === each)) {
            siblings.push(each);
          } else {
            if (siblings[0].parent != null) {
              siblings[0].parent.removeChildren(siblings);
            }
            siblings = [each];
          }
          previous = each;
        }
      }
      if (siblings.length) {
        return (siblings[0].parent != null ? siblings[0].parent.removeChildren(siblings) : undefined);
      }
    }

    static itemsWithAncestors(items) {
      const ancestorsAndItems = [];
      const addedIDs = {};
      for (let each of Array.from(items)) {
        const index = ancestorsAndItems.length;
        while (each) {
          if (addedIDs[each.id]) {
            continue;
          } else {
            ancestorsAndItems.splice(index, 0, each);
            addedIDs[each.id] = true;
          }
          each = each.parent;
        }
      }
      return ancestorsAndItems;
    }

    // Public: Insert the new children before the referenced sibling in this
    // item's list of children. If referenceSibling isn't defined the new children are
    // inserted at the end. This method resets the indent of children to match
    // referenceSibling's indent or to 1.
    //
    // - `children` {Item} or {Array} of {Item}s to insert.
    // - `referenceSibling` (optional) The referenced sibling {Item} to insert before.
    insertChildrenBefore(children, referenceSibling, maintainIndentHack) {
      let each, mutation, previousSibling;
      if (maintainIndentHack == null) { maintainIndentHack = false; }
      if (!Array.isArray(children)) {
        children = [children];
      }

      if (!children.length) {
        return;
      }

      const {
        recordedUndoableChanges
      } = this;
      const {
        isInOutline
      } = this;
      const {
        outline
      } = this;

      if (isInOutline) {
        outline.beginChanges();
      }

      if (recordedUndoableChanges) {
        outline.undoManager.beginUndoGrouping();
      }

      Item.removeItemsFromParents(children);

      if (referenceSibling) {
        assert(referenceSibling.parent === this, 'referenceSibling must be child of this item');
        ({
          previousSibling
        } = referenceSibling);
      } else {
        previousSibling = this.lastChild;
      }

      if (isInOutline || recordedUndoableChanges) {
        mutation = Mutation.createChildrenMutation(this, children, [], previousSibling, referenceSibling);
        if (isInOutline) {
          outline.willChange(mutation);
        }
        outline.recordChange(mutation);
      }

      for (let i = 0; i < children.length; i++) {
        each = children[i];
        assert(each.parent !== this, 'insert items must not already be children');
        assert(each.outline === this.outline, 'children must share same outline as parent');
        each.previousSibling = children[i - 1];
        each.nextSibling = children[i + 1];
        each.parent = this;
      }

      const firstChild = children[0];
      const lastChild = children[children.length - 1];

      firstChild.previousSibling = previousSibling;
      if (previousSibling != null) {
        previousSibling.nextSibling = firstChild;
      }
      lastChild.nextSibling = referenceSibling;
      if (referenceSibling != null) {
        referenceSibling.previousSibling = lastChild;
      }

      if (!firstChild.previousSibling) {
        this.firstChild = firstChild;
      }
      if (!lastChild.nextSibling) {
        this.lastChild = lastChild;
      }

      if (!maintainIndentHack) {
        let left;
        const childIndent = (left = (previousSibling != null ? previousSibling.indent : undefined) != null ? (previousSibling != null ? previousSibling.indent : undefined) : (referenceSibling != null ? referenceSibling.indent : undefined)) != null ? left : 1;
        for (let j = children.length - 1; j >= 0; j--) {
          each = children[j];
          each.indent = childIndent;
        }
      }

      if (recordedUndoableChanges) {
        outline.undoManager.endUndoGrouping();
      }

      this.clearCachedBranchContentID();

      if (isInOutline) {
        for (each of Array.from(children)) {
          each.isInOutline = true;
        }
        outline.didChange(mutation);
        return outline.endChanges();
      }
    }

    // Public: Append the new children to this item's list of children.
    //
    // - `children` {Item} or {Array} of {Item}s to append.
    appendChildren(children) {
      return this.insertChildrenBefore(children, null);
    }

    // Public: Remove the children from this item's list of children. When an
    // item is removed its the parent's {::depth} is added to the removed item's
    // {::indent}, preserving the removed items depth if needed later.
    //
    // - `children` {Item} or {Array} of child {Item}s to remove.
    removeChildren(children) {
      let mutation;
      if (!Array.isArray(children)) {
        children = [children];
      }

      if (!children.length) {
        return;
      }

      const {
        recordedUndoableChanges
      } = this;
      const {
        isInOutline
      } = this;
      const {
        outline
      } = this;

      const firstChild = children[0];
      const lastChild = children[children.length - 1];
      const {
        previousSibling
      } = firstChild;
      const {
        nextSibling
      } = lastChild;

      if (isInOutline) {
        outline.beginChanges();
      }

      if (recordedUndoableChanges) {
        outline.undoManager.beginUndoGrouping();
      }

      if (isInOutline || recordedUndoableChanges) {
        mutation = Mutation.createChildrenMutation(this, [], children, previousSibling, nextSibling);
        if (isInOutline) {
          outline.willChange(mutation);
        }
        outline.recordChange(mutation);
      }

      if (previousSibling != null) {
        previousSibling.nextSibling = nextSibling;
      }
      if (nextSibling != null) {
        nextSibling.previousSibling = previousSibling;
      }

      if (firstChild === this.firstChild) {
        this.firstChild = nextSibling;
      }
      if (lastChild === this.lastChild) {
        this.lastChild = previousSibling;
      }

      const {
        depth
      } = this;
      for (let each of Array.from(children)) {
        assert(each.parent === this, 'removed items must be children of this item');
        const eachIndent = each.indent;
        each.isInOutline = false;
        each.nextSibling = null;
        each.previousSibling = null;
        each.parent = null;
        each.indent = eachIndent + depth;
      }

      if (recordedUndoableChanges) {
        outline.undoManager.endUndoGrouping();
      }

      this.clearCachedBranchContentID();

      if (isInOutline) {
        outline.didChange(mutation);
        return outline.endChanges();
      }
    }

    // Public: Remove this item from it's parent item if it has a parent.
    removeFromParent() {
      return (this.parent != null ? this.parent.removeChildren(this) : undefined);
    }

    // Public: Return {Boolean} `true` if this item has the given attribute.
    //
    // - `name` The {String} attribute name.
    hasAttribute(name) {
      return ((this.attributes != null ? this.attributes[name] : undefined) != null);
    }

    // Public: Return the value of the given attribute. If the attribute does not
    // exist will return `null`. Attribute values are always stored as {String}s.
    // Use the `class` and `array` parameters to parse the string values to other
    // types before returning.
    //
    // - `name` The {String} attribute name.
    // - `clazz` (optional) Class ({Number} or {Date}) to parse string values to objects of given class.
    // - `array` (optional) {Boolean} true if should split comma separated string value to create an array.
    //
    // Returns attribute value.
    getAttribute(name, clazz, array) {
      let value;
      if (value = this.attributes != null ? this.attributes[name] : undefined) {
        if (array && (typeof value === 'string')) {
          value = value.split(/\s*,\s*/);
          if (clazz) {
            value = (Array.from(value).map((each) => Item.attributeValueStringToObject(each, clazz)));
          }
        } else if (clazz && (typeof value === 'string')) {
          value = Item.attributeValueStringToObject(value, clazz);
        }
      }
      return value;
    }

    // Public: Adds a new attribute or changes the value of an existing
    // attribute. `id` is reserved and an exception is thrown if you try to set
    // it. Setting an attribute to `null` or `undefined` removes the attribute.
    // Generally all item attribute names should start with `data-` to avoid
    // conflict with built in attribute names.
    //
    // Attribute values are always stored as {String}s so they will stay
    // consistent through any serialization process. For example if you set an
    // attribute to the Number `1.0` when you {::getAttribute} the value is the
    // {String} `"1.0"`. See {::getAttribute} for options to automatically
    // convert the stored {String} back to a {Number} or {Date}.
    //
    // - `name` The {String} attribute name.
    // - `value` The new attribute value.
    setAttribute(name, value) {
      let mutation;
      assert(name !== 'id', 'id is reserved attribute name');

      if (value) {
        value = Item.objectToAttributeValueString(value);
      }

      const oldValue = this.getAttribute(name);

      if (value === oldValue) {
        return;
      }

      const {
        outline
      } = this;
      const {
        undoManager
      } = outline;
      const {
        recordedUndoableChanges
      } = this;
      const {
        isInOutline
      } = this;

      if (isInOutline) {
        outline.beginChanges();
      }

      if (isInOutline || recordedUndoableChanges) {
        mutation = Mutation.createAttributeMutation(this, name, oldValue);
        if (isInOutline) {
          outline.willChange(mutation);
        }
        outline.recordChange(mutation);
        undoManager.disableUndoRegistration();
      }

      if (value != null) {
        if (!this.attributes) {
          this.attributes = {};
        }
        this.attributes[name] = value;
      } else {
        if (this.attributes) {
          delete this.attributes[name];
        }
      }

      outline.itemDidChangeAttribute(this, name, value, oldValue);

      if (isInOutline) {
        outline.didChange(mutation);
        outline.endChanges();
      }

      if (isInOutline || recordedUndoableChanges) {
        return undoManager.enableUndoRegistration();
      }
    }

    // Public: Removes an item attribute.
    //
    // - `name` The {String} attribute name.
    removeAttribute(name) {
      if (this.hasAttribute(name)) {
        return this.setAttribute(name, null);
      }
    }

    static attributeValueStringToObject(value, clazz) {
      let left;
      switch (clazz) {
        case Number: case 'Number':
          return parseFloat(value);
        case Date: case 'Date':
          return (left = DateTime.parse(value)) != null ? left : '';
        default:
          return value;
      }
    }

    static objectToAttributeValueString(object) {
      switch (typeof object) {
        case 'string':
          return object;
        case 'number':
          return object.toString();
        case 'object':
          return object.toString();
        default:
          if (object instanceof Date) {
            return object.toISOString();
          } else if (Array.isArray(object)) {
            return (Array.from(object).map((each) => Item.objectToAttributeValueString(each))).join(',');
          } else if (object) {
            return object.toString();
          } else {
            return object;
          }
      }
    }

    bodyAttributedSubstringFromRange(location, length) {
      return this.bodyAttributedString.attributedSubstringFromRange(location, length);
    }

    // Public: Returns an {Object} with keys for each attribute at the given
    // character characterIndex, and by reference the range over which the
    // attributes apply.
    //
    // - `characterIndex` The character index.
    // - `effectiveRange` (optional) {Object} whose `location` and `length`
    //    properties are set to effective range of the attributes.
    // - `longestEffectiveRange` (optional) {Object} whose `location` and `length`
    //    properties are set to longest effective range of the attributes.
    getBodyAttributesAtIndex(characterIndex, effectiveRange, longestEffectiveRange) {
      return this.bodyAttributedString.getAttributesAtIndex(characterIndex, effectiveRange, longestEffectiveRange);
    }

    // Public: Returns the value for an attribute with a given name of the
    // character at a given characterIndex, and by reference the range over which
    // the attribute applies.
    //
    // - `attribute` Attribute {String} name.
    // - `characterIndex` The character index.
    // - `effectiveRange` (optional) {Object} whose `location` and `length`
    //    properties are set to effective range of the attribute.
    // - `longestEffectiveRange` (optional) {Object} whose `location` and `length`
    //    properties are set to longest effective range of the attribute.
    getBodyAttributeAtIndex(attribute, characterIndex, effectiveRange, longestEffectiveRange) {
      return this.bodyAttributedString.getAttributeAtIndex(attribute, characterIndex, effectiveRange, longestEffectiveRange);
    }

    // Sets the attributes for the characters in the given range to the
    // given attributes. Replacing any existing attributes in the range.
    //
    // - `attributes` {Object} with keys and values for each attribute
    // - `location` Start character index.
    // - `length` Range length.
    setBodyAttributesInRange(attributes, location, length) {
      this.bodyAttributedString.setAttributesInRange(attributes, location, length);
      const changedText = this.bodyAttributedSubstringFromRange(location, length);
      changedText.setAttributesInRange(attributes, location, length);
      return this.replaceBodyRange(location, length, changedText);
    }

    // Public: Adds an attribute to the characters in the given range.
    //
    // - `attribute` The {String} attribute name.
    // - `value` The attribute value.
    // - `location` Start character index.
    // - `length` Range length.
    addBodyAttributeInRange(attribute, value, location, length) {
      const attributes = {};
      attributes[attribute] = value;
      return this.addBodyAttributesInRange(attributes, location, length);
    }

    // Public: Adds attributes to the characters in the given range.
    //
    // - `attributes` {Object} with keys and values for each attribute
    // - `location` Start index.
    // - `length` Range length.
    addBodyAttributesInRange(attributes, location, length) {
      for (let eachTagName in attributes) {
        assert(eachTagName === eachTagName.toLowerCase(), 'Tag Names Must be Lowercase');
      }
      const changedText = this.bodyAttributedSubstringFromRange(location, length);
      changedText.addAttributesInRange(attributes, 0, length);
      return this.replaceBodyRange(location, length, changedText);
    }

    // Public: Removes the attribute from the given range.
    //
    // - `attribute` The {String} attribute name
    // - `location` Start character index.
    // - `length` Range length.
    removeBodyAttributeInRange(attribute, location, length) {
      return this.removeBodyAttributesInRange([attribute], location, length);
    }

    removeBodyAttributesInRange(attributes, location, length) {
      const changedText = this.bodyAttributedSubstringFromRange(location, length);
      for (let each of Array.from(attributes)) {
        changedText.removeAttributeInRange(each, 0, length);
      }
      return this.replaceBodyRange(location, length, changedText);
    }

    insertLineBreakInBody(index) {}

    insertImageInBody(index, image) {}

    // Public: Replace body text in the given range.
    //
    // - `location` Start character index.
    // - `length` Range length.
    // - `insertedText` {String} or {AttributedString}
    replaceBodyRange(location, length, insertedText) {
      let insertedString, mutation;
      if (this.isOutlineRoot) {
        return;
      }

      if (insertedText instanceof AttributedString) {
        insertedString = insertedText.string;
      } else {
        insertedString = insertedText;
      }

      if ((length === 0) && (insertedString.length === 0)) {
        return;
      }

      const {
        bodyAttributedString
      } = this;
      const oldBody = bodyAttributedString.getString();
      const {
        recordedUndoableChanges
      } = this;
      const {
        isInOutline
      } = this;

      const {
        outline
      } = this;
      const {
        undoManager
      } = outline;

      assert(insertedString.indexOf('\n') === -1, 'Item body text cannot contain newlines');
      assert((location + length) <= oldBody.length, 'Replace range end must not be greater then body text');

      if (isInOutline || recordedUndoableChanges) {
        const replacedText = bodyAttributedString.attributedSubstringFromRange(location, length);
        if ((replacedText.length === 0) && (insertedText.length === 0)) {
          return;
        }
        mutation = Mutation.createBodyMutation(this, location, insertedString.length, replacedText);
      }


      if (isInOutline) {
        outline.willChange(mutation);
        outline.beginChanges();
      }

      if (mutation) {
        outline.recordChange(mutation);
      }

      if (recordedUndoableChanges) {
        undoManager.disableUndoRegistration();
      }

      bodyAttributedString.replaceRange(location, length, insertedText);
      this.bodyHighlighted = null;
      outline.itemDidChangeBody(this, oldBody);

      this.clearCachedBranchContentID();

      if (isInOutline) {
        outline.didChange(mutation);
        outline.endChanges();
      }

      if (recordedUndoableChanges) {
        return undoManager.enableUndoRegistration();
      }
    }

    // Public: Append body text.
    //
    // - `text` {String} or {AttributedString}
    appendBody(text) {
      return this.replaceBodyRange(this.bodyString.length, 0, text);
    }

    addBodyHighlightAttributeInRange(attribute, value, index, length) {
      if (!this.bodyHighlighted) {
        this.bodyHighlighted = this.bodyAttributedString.clone();
      }
      return this.bodyHighlighted.addAttributeInRange(attribute, value, index, length);
    }

    addBodyHighlightAttributesInRange(attributes, index, length) {
      if (!this.bodyHighlighted) {
        this.bodyHighlighted = this.bodyAttributedString.clone();
      }
      return this.bodyHighlighted.addAttributesInRange(attributes, index, length);
    }

    /*
    Section: Debug
    */

    // Extended: Returns debug string for this item and it's descendants.
    branchToString(depthString) {
      if (depthString == null) { depthString = ''; }
      let {
        indent
      } = this;

      while (indent) {
        depthString += '  ';
        indent--;
      }

      const results = [this.toString(depthString)];
      for (let each of Array.from(this.children)) {
        results.push(each.branchToString(depthString));
      }
      return results.join('\n');
    }

    // Extended: Returns debug string for this item.
    toString(depthString) {
      return (depthString || '') + '(' + this.id + ') ' + this.body.toString();
    }
  };
  Item.initClass();
  return Item;
})());
