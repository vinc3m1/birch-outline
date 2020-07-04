/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let UndoManager;
const {Emitter} = require('event-kit');
const { assert } = require('./util');

module.exports =
(UndoManager = class UndoManager {

  constructor() {
    this.groupingLevel = 0;
    this.disabledLevel = 0;
    this.isRedoing = false;
    this.isUndoing = false;
    this.undoStack = [];
    this.redoStack = [];
    this.currentGroup = null;
    this.emitter = new Emitter();
    this.removeAllActions();
  }

  /*
  Section: Event Subscription
  */

  onWillUndo(callback) {
    return this.emitter.on('will-undo', callback);
  }

  onDidUndo(callback) {
    return this.emitter.on('did-undo', callback);
  }

  onWillRedo(callback) {
    return this.emitter.on('will-redo', callback);
  }

  onDidRedo(callback) {
    return this.emitter.on('did-redo', callback);
  }

  onDidOpenUndoGroup(callback) {
    return this.emitter.on('did-open-undo-group', callback);
  }

  onDidCloseUndoGroup(callback) {
    return this.emitter.on('did-close-undo-group', callback);
  }

  /*
  Section: Undo Grouping
  */

  beginUndoGrouping(metadata) {
    this.groupingLevel++;
    if (this.groupingLevel === 1) {
      this.currentGroup = [];
      this.currentGroup.metadata = metadata || {};
      return this.emitter.emit('did-open-undo-group', this.currentGroup);
    }
  }

  endUndoGrouping() {
    if (this.groupingLevel > 0) {
      this.groupingLevel--;
      if (this.groupingLevel === 0) {
        if (this.currentGroup.length > 0) {

          if (this.isUndoing) {
            this.redoStack.push(this.currentGroup);
          } else if (this.isRedoing) {
            this.undoStack.push(this.currentGroup);
          } else {
            this.undoStack.push(this.currentGroup);
            this.redoStack = [];
          }
        }

        this.emitter.emit('did-close-undo-group', this.currentGroup);
        return this.currentGroup = null;
      }
    }
  }

  /*
  Section: Undo Registration
  */

  isUndoRegistrationEnabled() { return this.disabledLevel === 0; }

  disableUndoRegistration() { return this.disabledLevel++; }

  enableUndoRegistration() { return this.disabledLevel--; }

  registerUndoOperation(operation) {
    if (!this.isUndoRegistrationEnabled()) { return; }

    this.beginUndoGrouping();
    this.currentGroup.unshift(operation);
    return this.endUndoGrouping();
  }

  setActionName(actionName) {
    return this.setUndoGroupMetadata('actionName', actionName.toLocaleString());
  }

  setUndoGroupMetadata(key, value) {
    const {
      undoStack
    } = this;
    const lastOrCurrentGoup = this.currentGroup || undoStack[undoStack.length - 1];
    return (lastOrCurrentGoup != null ? lastOrCurrentGoup.metadata[key] = value : undefined);
  }

  /*
  Section: Undo / Redo
  */

  canUndo() {
    return !this.isUndoing && !this.isRedoing && (this.undoStack.length > 0);
  }

  canRedo() {
    return !this.isUndoing && !this.isRedoing && (this.redoStack.length > 0);
  }

  undo(context) {
    assert(this.groupingLevel === 0, 'Unclosed grouping');
    assert(this.disabledLevel === 0, 'Unclosed disable');

    if (!this.canUndo()) { return; }

    this.endUndoGrouping();

    this.emitter.emit('will-undo');
    this.isUndoing = true;
    this.beginUndoGrouping(this.getUndoGroupMetadata());

    this.undoStack.pop().forEach(function(each) {
      if (each.performUndoOperation) {
        return each.performUndoOperation(context);
      } else {
        return each(context);
      }
    });

    this.endUndoGrouping();
    this.isUndoing = false;
    return this.emitter.emit('did-undo', this.getRedoGroupMetadata());
  }

  redo(context) {
    assert(this.groupingLevel === 0, 'Unclosed grouping');
    assert(this.disabledLevel === 0, 'Unclosed disable');

    if (!this.canRedo()) { return; }

    this.emitter.emit('will-redo');
    this.isRedoing = true;
    this.beginUndoGrouping(this.getRedoGroupMetadata());

    this.redoStack.pop().forEach(function(each) {
      if (each.performUndoOperation) {
        return each.performUndoOperation(context);
      } else {
        return each(context);
      }
    });

    this.endUndoGrouping();
    this.isRedoing = false;
    return this.emitter.emit('did-redo', this.getUndoGroupMetadata());
  }

  getUndoGroupMetadata() {
    return __guard__(this.undoStack[this.undoStack.length - 1], x => x.metadata);
  }

  getRedoGroupMetadata() {
    return __guard__(this.redoStack[this.redoStack.length - 1], x => x.metadata);
  }

  removeAllActions() {
    assert(this.groupingLevel === 0, 'Unclosed grouping');
    assert(this.disabledLevel === 0, 'Unclosed disable');
    this.undoStack = [];
    return this.redoStack = [];
  }
});

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}