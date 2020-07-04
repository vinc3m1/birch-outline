/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Mutation;
let { assert } = require('./util');

({ assert } = require('./util'));

// Public: A record of a single change in an {Item}.
//
// A new mutation is created to record each attribute set, body text change,
// and child item update. Use {Outline::onDidChange} to receive this mutation
// record so you can track what changes as an outline is edited.
module.exports =
(Mutation = (function() {
  Mutation = class Mutation {
    static initClass() {
  
      /*
      Section: Constants
      */
  
      // Public: ATTRIBUTE_CHANGED Mutation type constant.
      this.ATTRIBUTE_CHANGED = 'attribute';
  
      // Public: BODY_CHANGED Mutation type constant.
      this.BODY_CHANGED = 'body';
  
      // Public: CHILDREN_CHANGED Mutation type constant.
      this.CHILDREN_CHANGED = 'children';
  
      /*
      Section: Attribute
      */
  
      // Public: Read-only {Item} target of the mutation.
      this.prototype.target = null;
  
      // Public: Read-only type of change. {Mutation.ATTRIBUTE_CHANGED},
      // {Mutation.BODY_CHANGED}, or {Mutation.CHILDREN_CHANGED}.
      this.prototype.type = null;
  
      // Public: Read-only name of changed attribute in the target {Item}, or null.
      this.prototype.attributeName = null;
  
      // Public: Read-only previous value of changed attribute in the target
      // {Item}, or null.
      this.prototype.attributeOldValue = null;
  
      // Public: Read-only value of the body text location where the insert started
      // in the target {Item}, or null.
      this.prototype.insertedTextLocation = null;
  
      // Public: Read-only value of length of the inserted body text in the target
      // {Item}, or null.
      this.prototype.insertedTextLength = null;
  
      // Public: Read-only {AttributedString} of replaced body text in the target
      // {Item}, or null.
      this.prototype.replacedText = null;
  
      // Public: Read-only {Array} of child {Item}s added to the target.
      this.prototype.addedItems = null;
  
      // Public: Read-only {Array} of child {Item}s removed from the target.
      this.prototype.removedItems = null;
  
      // Public: Read-only previous sibling {Item} of the added or removed Items,
      // or null.
      this.prototype.previousSibling = null;
  
      // Public: Read-only next sibling {Item} of the added or removed Items, or
      // null.
      this.prototype.nextSibling = null;
    }

    static createAttributeMutation(target, attributeName, attributeOldValue) {
      assert(attributeName, 'Expect valid attribute name');
      const mutation = new Mutation(target, Mutation.ATTRIBUTE_CHANGED);
      mutation.attributeName = attributeName;
      mutation.attributeOldValue = attributeOldValue;
      return mutation;
    }

    static createBodyMutation(target, insertedTextLocation, insertedTextLength, replacedText) {
      assert((insertedTextLocation != null), 'Expect valid insertedTextLocation');
      assert((insertedTextLength != null), 'Expect valid insertedTextLength');
      const mutation = new Mutation(target, Mutation.BODY_CHANGED);
      mutation.insertedTextLocation = insertedTextLocation;
      mutation.insertedTextLength = insertedTextLength;
      mutation.replacedText = replacedText;
      return mutation;
    }

    static createChildrenMutation(target, addedItems, removedItems, previousSibling, nextSibling) {
      assert((addedItems.length > 0) || (removedItems.length > 0), 'Children added or removed');
      const mutation = new Mutation(target, Mutation.CHILDREN_CHANGED);
      mutation.addedItems = (addedItems != null ? addedItems.slice() : undefined) || [];
      mutation.removedItems = (removedItems != null ? removedItems.slice() : undefined) || [];
      mutation.previousSibling = previousSibling;
      mutation.nextSibling = nextSibling;
      return mutation;
    }

    constructor(target, type) {
      this.target = target;
      this.type = type;
      this.flattendedAddedItems = null;
      this.flattenedRemovedItems = null;
    }

    copy() {
      const mutation = new Mutation(this.target, this.type);
      mutation.attributeName = this.attributeName;
      mutation.attributeNewValue = this.attributeNewValue;
      mutation.attributeOldValue = this.attributeOldValue;
      mutation.insertedTextLocation = this.insertedTextLocation;
      mutation.insertedTextLength = this.insertedTextLength;
      mutation.replacedText = this.replacedText != null ? this.replacedText.copy() : undefined;
      mutation.addedItems = this.addedItems;
      mutation.removedItems = this.removedItems;
      mutation.previousSibling = this.previousSibling;
      mutation.nextSibling = this.nextSibling;
      return mutation;
    }

    getFlattendedAddedItems() {
      if (!this.flattendedAddedItems) {
        this.flattendedAddedItems = [];
        for (let each of Array.from(this.addedItems)) {
          this.flattendedAddedItems.push(each);
          if (each.hasChildren) {
            for (let eachDescendant of Array.from(each.descendants)) {
              this.flattendedAddedItems.push(eachDescendant);
            }
          }
        }
      }
      return this.flattendedAddedItems;
    }

    getFlattendedAddedItemIDs() {
      return (Array.from(this.getFlattendedAddedItems()).map((each) => each.id));
    }

    getFlattendedRemovedItems() {
      if (!this.flattenedRemovedItems) {
        this.flattenedRemovedItems = [];
        for (let each of Array.from(this.removedItems)) {
          this.flattenedRemovedItems.push(each);
          if (each.hasChildren) {
            for (let eachDescendant of Array.from(each.descendants)) {
              this.flattenedRemovedItems.push(eachDescendant);
            }
          }
        }
      }
      return this.flattenedRemovedItems;
    }

    getFlattendedRemovedItemIDs() {
      return (Array.from(this.getFlattendedRemovedItems()).map((each) => each.id));
    }

    performUndoOperation() {
      switch (this.type) {
        case Mutation.ATTRIBUTE_CHANGED:
          return this.target.setAttribute(this.attributeName, this.attributeOldValue);

        case Mutation.BODY_CHANGED:
          return this.target.replaceBodyRange(this.insertedTextLocation, this.insertedTextLength, this.replacedText);

        case Mutation.CHILDREN_CHANGED:
          if (this.addedItems.length) {
            this.target.removeChildren(this.addedItems);
          }

          if (this.removedItems.length) {
            return this.target.insertChildrenBefore(this.removedItems, this.nextSibling, true);
          }
          break;
      }
    }

    coalesce(operation) {
      if (!(operation instanceof Mutation)) { return false; }
      if (this.target !== operation.target) { return false; }
      if (this.type !== operation.type) { return false; }
      if (this.type !== Mutation.BODY_CHANGED) { return false; }

      const thisInsertedTextLocation = this.insertedTextLocation;
      const thisInsertLength = this.insertedTextLength;
      let thisInsertEnd = thisInsertedTextLocation + thisInsertLength;
      thisInsertEnd = thisInsertedTextLocation + thisInsertLength;

      const newInsertedTextLocation = operation.insertedTextLocation;
      const newInsertedTextLength = operation.insertedTextLength;
      const newReplaceLength = operation.replacedText.length;
      const newReplaceEnd = newInsertedTextLocation + newReplaceLength;

      const singleInsertAtEnd = (newInsertedTextLocation === thisInsertEnd) && (newInsertedTextLength === 1) && (newReplaceLength === 0);
      const singleDeleteFromEnd = (newReplaceEnd === thisInsertEnd) && (newInsertedTextLength === 0) && (newReplaceLength === 1);

      if (singleInsertAtEnd) {
        this.insertedTextLength++;
        return true;
      } else if (singleDeleteFromEnd) {
        if (newInsertedTextLocation < thisInsertedTextLocation) {
          this.replacedText.insertText(0, operation.replacedText);
          this.insertedTextLocation--;
        } else {
          this.insertedTextLength--;
        }
        return true;
      } else {
        return false;
      }
    }
  };
  Mutation.initClass();
  return Mutation;
})());
