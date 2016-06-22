{Emitter, Disposable, CompositeDisposable} = require 'event-kit'
AttributedString = require './attributed-string'
ItemSerializer = require './item-serializer'
UndoManager = require './undo-manager'
ItemPath = require './item-path'
Mutation = require './mutation'
urls = require './urls'
shortid = require './shortid'
_ = require 'underscore-plus'
assert = require 'assert'
Birch = require './birch'
Item = require './item'

# Public: A mutable outline of {Item}s.
#
# Use outlines to create new items, find existing items, watch for changes
# in items, and add/remove items.
#
# When you add/remove items using the outline's methods the items children are
# left in place. For example if you remove an item, it's chilren stay in the
# outline and are reasigned to a new parent item.
#
# ## Examples
#
  # Group multiple changes:
#
# ```javascript
# outline.groupUndoAndChanges(function() {
#   root = outline.root;
#   root.appendChildren(outline.createItem());
#   root.appendChildren(outline.createItem());
#   root.firstChild.bodyString = 'first';
#   root.lastChild.bodyString = 'last';
# });
# ```
#
# Watch for outline changes:
#
# ```javascript
# disposable = outline.onDidChange(function(mutation) {
#   switch(mutation.type) {
#     case Mutation.ATTRIBUTE_CHANGED:
#       console.log(mutation.attributeName);
#       break;
#     case Mutation.BODY_CHANGED:
#       console.log(mutation.target.bodyString);
#       break;
#     case Mutation.CHILDREN_CHANGED:
#       console.log(mutation.addedItems);
#       console.log(mutation.removedItems);
#       break;
#   }
# });
# ...
# disposable.dispose()
# ```
class Outline

  type: null
  idsToItems: null
  refcount: 0
  changes: null
  changeCount: 0
  undoSubscriptions: null
  changingCount: 0
  changesCallbacks: null
  coalescingMutation: null
  stoppedChangingDelay: 300
  stoppedChangingTimeout: null

  ###
  Section: Construction
  ###

  # Public: Create a new outline.
  #
  # - `type` (optional) {String} outline type. Default to {ItemSerializer.TEXTType}.
  # - `serialization` (optional) {String} Serialized outline content of `type` to load.
  constructor: (type, serialization) ->
    @id = shortid()
    @idsToItems = new Map()
    @type = type ? ItemSerializer.TEXTType
    @root = @createItem '', Birch.RootID
    @root.isInOutline = true
    @changeDelegateProcessing = 0
    @changeDelegate = ItemSerializer.getSerializationsForMimeType(@type)[0]?.changeDelegate

    @undoManager = undoManager = new UndoManager
    @emitter = new Emitter

    @undoSubscriptions = new CompositeDisposable
    @undoSubscriptions.add undoManager.onDidCloseUndoGroup (group) =>
      if not undoManager.isUndoing and not undoManager.isRedoing and group.length > 0
        @updateChangeCount(Outline.ChangeDone)
        @scheduleModifiedEvents()
    @undoSubscriptions.add undoManager.onWillUndo =>
      @breakUndoCoalescing()
    @undoSubscriptions.add undoManager.onDidUndo =>
      @updateChangeCount(Outline.ChangeUndone)
      @breakUndoCoalescing()
      @scheduleModifiedEvents()
    @undoSubscriptions.add undoManager.onWillRedo =>
      @breakUndoCoalescing()
    @undoSubscriptions.add undoManager.onDidRedo =>
      @updateChangeCount(Outline.ChangeRedone)
      @breakUndoCoalescing()
      @scheduleModifiedEvents()

    @reloadSerialization(serialization)

  # Public: Returns a TaskPaper {Outline}.
  #
  # The outline is configured to handle TaskPaper content at runtime. For
  # example when you set attributes through the {Item} API they are encoded in
  # the item body text as @tags. And when you modify the body text @tags are
  # parsed out and stored as attributes.
  #
  # - `content` {String} (optional) outline content in TaskPaper format.
  @createTaskPaperOutline: (content) ->
    new Outline(ItemSerializer.TaskPaperType, content)

  destroy: ->
    unless @destroyed
      Outline.removeOutline(this)
      @cancelStoppedChangingTimeout()
      @undoSubscriptions?.dispose()
      @destroyed = true
      @emitter.emit 'did-destroy'

  ###
  Section: Finding Outlines
  ###

  # Public: Read-only unique (not persistent) {String} outline ID.
  id: null

  @outlines = []

  # Public: Retrieves all open {Outline}s.
  #
  # Returns an {Array} of {Outline}s.
  @getOutlines: ->
    @outlines.slice()

  # Public: Returns existing {Outline} with the given outline id.
  #
  # - `id` {String} outline id.
  @getOutlineForID: (id) ->
    for each in @outlines
      if each.id is id
        return each

  @addOutline: (outline, options={}) ->
    @addOutlineAtIndex(outline, @outlines.length, options)

  @addOutlineAtIndex: (outline, index, options={}) ->
    @outlines.splice(index, 0, outline)
    @subscribeToOutline(outline)
    outline

  @removeOutline: (outline) ->
    index = @outlines.indexOf(outline)
    @removeOutlineAtIndex(index) unless index is -1

  @removeOutlineAtIndex: (index, options={}) ->
    [outline] = @outlines.splice(index, 1)
    outline?.destroy()

  @subscribeToOutline: (outline) ->
    outline.onDidDestroy =>
      @removeOutline(outline)

  ###
  Section: Events
  ###

  # Public: Invoke the given callback when the outline begins a series of
  # changes.
  #
  # * `callback` {Function} to be called when the outline begins updating.
  #
  # Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  onDidBeginChanges: (callback) ->
    @emitter.on 'did-begin-changes', callback

  # Public: Invoke the given callback _before_ the outline changes.
  #
  # * `callback` {Function} to be called when the outline will change.
  #   * `mutation` {Mutation} describing the change.
  #
  # Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  onWillChange: (callback) ->
    @emitter.on 'will-change', callback

  # Public: Invoke the given callback when the outline changes.
  #
  # See {Outline} Examples for an example of subscribing to this event.
  #
  # - `callback` {Function} to be called when the outline changes.
  #   - `mutation` {Mutation} describing the changes.
  #
  # Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  onDidChange: (callback) ->
    @emitter.on 'did-change', callback

  # Public: Invoke the given callback when the outline ends a series of
  # changes.
  #
  # * `callback` {Function} to be called when the outline ends updating.
  #   - `changes` {Array} of {Mutation}s.
  #
  # Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  onDidEndChanges: (callback) ->
    @emitter.on 'did-end-changes', callback

  # Public: Invoke the given callback when the value of {::isModified} changes.
  #
  # - `callback` {Function} to be called when {::isModified} changes.
  #   - `modified` {Boolean} indicating whether the outline is modified.
  #
  # Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  onDidChangeModified: (callback) ->
    @emitter.on 'did-change-modified', callback

  # Public: Invoke the given callback when the outline is destroyed.
  #
  # - `callback` {Function} to be called when the outline is destroyed.
  #
  # Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  onDidDestroy: (callback) ->
    @emitter.on 'did-destroy', callback

  getStoppedChangingDelay: -> @stoppedChangingDelay

  ###
  Section: Reading Items
  ###

  # Public: Read-only root {Item} in the outline.
  root: null

  isEmpty: null
  Object.defineProperty @::, 'isEmpty',
    get: ->
      firstChild = @root.firstChild
      not firstChild or
          (not firstChild.nextItem and
          firstChild.bodyString.length is 0)

  # Public: Read-only {Array} {Item}s in the outline (except the root).
  items: null
  Object.defineProperty @::, 'items',
    get: -> @root.descendants

  # Public: Returns {Item} for given id.
  #
  # - `id` {String} id.
  getItemForID: (id) ->
    @idsToItems.get(id)

  getItemsForIDs: (ids) ->
    return [] unless ids

    items = []
    for each in ids
      each = @getItemForID each
      if each
        items.push each
    items

  getAttributeNames: (autoIncludeNames=[]) ->
    attributes = new Set()

    for each in autoIncludeNames
      attributes.add(each)

    for each in @root.descendants
      for eachAttributeName in Object.keys(each.attributes)
        attributes.add(eachAttributeName)

    attributesArray = []
    attributes.forEach (each) ->
      attributesArray.push(each)
    attributesArray.sort()
    attributesArray

  # Public: Evaluate the item path starting from this outline's {Outline.root}
  # item or from the passed in `contextItem` if present.
  #
  # - `itemPath` {String} itempath expression.
  # - `contextItem` (optional) defaults to {Outline.root}.
  #
  # Returns an {Array} of matching {Item}s.
  evaluateItemPath: (itemPath, contextItem, options) ->
    options ?= {}
    options.root ?= @root
    contextItem ?= @root
    ItemPath.evaluate itemPath, contextItem, options

  ###
  Section: Creating Items
  ###

  # Public: Create a new item. The new item is owned by this outline, but is
  # not yet inserted into it so it won't be visible until you insert it.
  #
  # - `text` (optional) {String} or {AttributedString}.
  createItem: (text, id, remapIDCallback) ->
    new Item(@, text, id, remapIDCallback)

  # Public: The cloned item is owned by this outline, but is not yet inserted
  # into it so it won't be visible until you insert it.
  #
  # - `item` {Item} to clone.
  # - `deep` (optional) defaults to true.
  #
  # Returns Clone of the given {Item}.
  cloneItem: (item, deep=true, remapIDCallback) ->
    assert.ok(not item.isOutlineRoot, 'Can not clone root')
    assert.ok(item.outline is @, 'Item must be owned by this outline')

    clonedItem = @createItem(item.bodyAttributedString.clone())

    if item.attributes
      clonedItem.attributes = _.clone(item.attributes)
    if item.userData
      clonedItem.userData = _.clone(item.userData)

    clonedItem.indent = item.depth

    if deep and eachChild = item.firstChild
      clonedChildren = []
      while eachChild
        clonedChild = @cloneItem(eachChild, deep)
        clonedChild.indent = eachChild.indent
        clonedChildren.push(clonedChild)
        eachChild = eachChild.nextSibling
      clonedItem.insertChildrenBefore(clonedChildren, null, true)

    remapIDCallback?(item.id, clonedItem.id, clonedItem)
    clonedItem

  cloneItems: (items, deep=true, remapIDCallback) ->
    clones = []
    for each in items
      clones.push(@cloneItem(each, deep, remapIDCallback))
    clones


  # Public: Creates a clone of the given {Item} from an external outline that
  # can be inserted into the current outline.
  #
  # - `item` {Item} to import.
  # - `deep` (optional) defaults to true.
  #
  # Returns {Item} clone.
  importItem: (item, deep=true, remapIDCallback) ->
    assert.ok(not item.isOutlineRoot, 'Can not import root item')
    assert.ok(item.outline isnt @, 'Item must not be owned by this outline')

    importedItem = @createItem(item.bodyAttributedString.clone(), item.id, remapIDCallback)

    if item.attributes
      importedItem.attributes = _.clone(item.attributes)
    if item.userData
      importedItem.userData = _.clone(item.userData)

    if deep and eachChild = item.firstChild
      children = []
      while eachChild
        children.push(@importItem(eachChild, deep))
        eachChild = eachChild.nextSibling
      importedItem.appendChildren(children)

    importedItem

  ###
  Section: Insert & Remove Items
  ###

  # Public: Insert the items before the given `referenceItem`. If the
  # reference item isn't defined insert at the end of this outline.
  #
  # Unlike {Item::insertChildrenBefore} this method uses {Item::indent} to
  # determine where in the outline structure to insert the items. Depending on
  # the indent value these items may become referenceItem's parent, previous
  # sibling, or unrelated.
  #
  # - `items` {Item} or {Array} of {Item}s to insert.
  # - `referenceItem` Reference {Item} to insert before.
  insertItemsBefore: (items, referenceItem) ->
    unless _.isArray(items)
      items = [items]

    unless items.length
      return

    @groupUndoAndChanges =>
      # 1. Group items into hiearhcies while saving roots.
      roots = Item.buildItemHiearchy(items)

      # 1.1 Validate reference item.
      if referenceItem
        assert.ok(referenceItem.isInOutline, 'reference item must be in outline if defined')
        assert.ok(referenceItem.outline is @, 'reference item outline must be this outline if defined')

      # 2. Make sure each root has indent of at least 1 so that they will always
      # insert as children of outline.root.
      for each in roots
        if each.indent < 1
          each.indent = 1

      # 3. Group roots by indentation level so they can all be inseted in a
      # single mutation instent of one by one.
      rootGroups = []
      currentDepth = undefined
      for each in roots
        if each.depth is currentDepth
          current.push(each)
        else
          current = [each]
          rootGroups.push(current)
          currentDepth = each.depth

      # 4. Insert root groups where appropriate in the outline.
      for eachGroup in rootGroups
        eachGroupDepth = eachGroup[0].depth
        # find insert point
        parent = referenceItem?.previousItemOrRoot or @root.lastBranchItem
        nextSibling = parent.firstChild
        parentDepth = parent.depth
        nextBranch = referenceItem
        while parentDepth >= eachGroupDepth
          nextSibling = parent.nextSibling
          parent = parent.parent
          parentDepth = parent.depth
        # restore indents and insert
        for each in eachGroup
          each.indent = eachGroupDepth - parent.depth
        parent.insertChildrenBefore(eachGroup, nextSibling, true)

      # 5. Reparent covered trailing branches to last inserted root.
      lastRoot = roots[roots.length - 1]
      ancestorStack = []
      each = lastRoot
      while each
        ancestorStack.push(each)
        each = each.lastChild

      trailingBranches = []
      while referenceItem and (referenceItem.depth > lastRoot.depth)
        trailingBranches.push(referenceItem)
        referenceItem = referenceItem.nextBranch

      Item.buildItemHiearchy(trailingBranches, ancestorStack)

  # Public: Remove the items but leave their child items in the outline and
  # give them new parents.
  #
  # - `items` {Item} or {Item} {Array} to remove.
  removeItems: (items) ->
    unless _.isArray(items)
      items = [items]

    unless items.length > 0
      return

    # Group items into contiguous ranges so they are easier to reason about
    # when grouping the removes for efficiency.
    contiguousItemRanges = []
    previousItem = undefined
    for each in items
      if previousItem and previousItem is each.previousItem
        currentRange.push(each)
      else
        currentRange = [each]
        contiguousItemRanges.push(currentRange)
      previousItem = each

    @groupUndoAndChanges =>
      for each in contiguousItemRanges
        @_removeContiguousItems(each)

  _removeContiguousItems: (items) ->
    # 1. Collect all items to remove together with their children. Only
    # some of these items are to be removed, the others will be reinserted.
    coveredItems = []
    commonAncestors = Item.getCommonAncestors(items)
    end = commonAncestors[commonAncestors.length - 1].nextBranch
    each = items[0]
    while each isnt end
      coveredItems.push(each)
      each = each.nextItem

    # 2. Save item that reinserted items should be reinserted before.
    insertBefore = coveredItems[coveredItems.length - 1].nextBranch

    # 3. Figure out which items should be reinserted and save there depths.
    removeItemsSet = new Set()
    for each in items
      removeItemsSet.add(each)
    reinsertChildren = []
    for each in coveredItems
      unless removeItemsSet.has(each)
        reinsertChildren.push(each)

    # 4. Remove items to reinsert before removing items. This way undo will
    # work. since the parents are still in the tree.
    Item.removeItemsFromParents(reinsertChildren)

    # 5. Remove the items that are actually meant to be removed.
    Item.removeItemsFromParents(items)

    # 6. Reinsert!
    @insertItemsBefore(reinsertChildren, insertBefore)

  ###
  Section: Changes
  ###

  # Public: Read-only {Boolean} true if outline is changing.
  isChanging: null
  Object.defineProperty @::, 'isChanging',
    get: -> @startItem is @endItem and @startOffset is @endOffset

  # Public: Group changes to the outline for better performance.
  #
  # - `callback` Callback that contains code to change {Item}s in this {Outline}.
  groupChanges: (callback) ->
    @beginChanges()
    callback()
    @endChanges()

  willChange: (mutation) ->
    @emitter.emit 'will-change', mutation

  beginChanges: ->
    @changingCount++
    if @changingCount is 1
      @changes = []
      @changesCallbacks = []
      @emitter.emit('did-begin-changes')

  itemDidChangeBody: (item, oldBody) ->
    return unless @changeDelegate
    @changeDelegateProcessing++
    @changeDelegate.processItemDidChangeBody(item, oldBody)
    @changeDelegateProcessing--

  itemDidChangeAttribute: (item, name, value, oldValue) ->
    if not @changeDelegateProcessing and @changeDelegate
      @changeDelegate.processItemDidChangeAttribute(item, name, value, oldValue)

  recordChange: (mutation) ->
    unless @undoManager.isUndoRegistrationEnabled()
      return

    if @undoManager.isUndoing or @undoManager.isUndoing
      @breakUndoCoalescing()

    if @coalescingMutation and @coalescingMutation.coalesce(mutation)
      metadata = @undoManager.getUndoGroupMetadata()
      undoSelection = metadata.undoSelection
      if undoSelection and @coalescingMutation.type is Mutation.BODY_CHANGED
        # Update the undo selection to match coalescingMutation
        undoSelection.anchorOffset = @coalescingMutation.insertedTextLocation
        undoSelection.startOffset = @coalescingMutation.insertedTextLocation
        undoSelection.headOffset = @coalescingMutation.insertedTextLocation + @coalescingMutation.replacedText.length
        undoSelection.endOffset = @coalescingMutation.insertedTextLocation + @coalescingMutation.replacedText.length
    else
      @undoManager.registerUndoOperation mutation
      @coalescingMutation = mutation

  didChange: (mutation) ->
    @changes.push(mutation)
    @emitter.emit 'did-change', mutation

  endChanges: (callback) ->
    @changesCallbacks.push(callback) if callback
    @changingCount--
    if @changingCount is 0
      @conflict = false if @conflict and not @isModified()
      @emitter.emit('did-end-changes', @changes)
      @scheduleModifiedEvents()

      changesCallbacks = @changesCallbacks
      @changesCallbacks = null
      for each in changesCallbacks
        each(@changes)
      @changes = null

  breakUndoCoalescing: ->
    @coalescingMutation = null

  # Public: Group multiple changes into a single undo group.
  #
  # - `callback` Callback that contains code to change {Item}s in this {Outline}.
  groupUndo: (callback) ->
    @beginUndoGrouping()
    callback()
    @endUndoGrouping()

  # Public: Group multiple changes into a single undo and change
  # group. This is a shortcut for:
  #
  # ```javascript
  # outline.groupUndo(function() {
  #   outline.groupChanges(function() {
  #     console.log('all grouped up!');
  #   });
  # });
  # ```
  #
  # - `callback` Callback that contains code to change {Item}s in this {Outline}.
  groupUndoAndChanges: (callback) ->
    @beginUndoGrouping()
    @beginChanges()
    callback()
    @endChanges()
    @endUndoGrouping()

  beginUndoGrouping: (metadata) ->
    @undoManager.beginUndoGrouping(metadata)

  endUndoGrouping: ->
    @undoManager.endUndoGrouping()

  # Public: Undo the last undo group.
  undo: ->
    @undoManager.undo()

  # Public: Redo the last undo group.
  redo: ->
    @undoManager.redo()

  ###
  Section: Serialization
  ###

  # Public: Return a serialized {String} version of this Outline's content.
  #
  # - `type` (optional) Defaults to {outline.type}
  serialize: (type) ->
    ItemSerializer.serializeItems(@root.descendants, type ? @type)

  # Public: Load {String}
  #
  # - `type` (optional) {String} format to serialize as. Defaults to {outline.type}
  reloadSerialization: (serialization, type) ->
    if serialization
      @emitter.emit 'will-reload'
      @groupChanges =>
        items = ItemSerializer.deserializeItems(serialization, @, type ? @type)
        @root.removeChildren(@root.children)
        @root.appendChildren(items)
      @updateChangeCount(Outline.ChangeCleared)
      @emitModifiedStatusChanged(false)
      @emitter.emit 'did-reload'

  ###
  Section: Debug
  ###

  # Extended: Returns debug string for this item.
  toString: ->
    this.root.branchToString()

  ###
  Section: Private Utility Methods
  ###

  nextOutlineUniqueItemID: (candidateID) ->
    loadingLIUsedIDs = @loadingLIUsedIDs
    while true
      id = candidateID or shortid()
      if loadingLIUsedIDs and not loadingLIUsedIDs[id]
        loadingLIUsedIDs[id] = true
        return id
      else if not @idsToItems.get(id)
        return id
      else
        candidateID = null

  isDestroyed: -> @destroyed

  isRetained: -> @refcount > 0

  # Public: Determine if the outline has changed since it was loaded.
  #
  # If the outline is unsaved, always returns `true` unless the outline is
  # empty.
  #
  # Returns a {Boolean}.
  isModified: ->
    @changeCount isnt 0

  updateChangeCount: (change) ->
    switch change
      when Outline.ChangeDone
        @changeCount++
      when Outline.ChangeUndone
        @changeCount--
      when Outline.ChangeCleared
        @changeCount = 0
      when Outline.ChangeRedone
        @changeCount++

  retain: ->
    @refcount++
    this

  release: (editorID) ->
    @refcount--
    for each in @items
      each.setUserData editorID, undefined
    @destroy() unless @isRetained()
    this

  cancelStoppedChangingTimeout: ->
    clearTimeout(@stoppedChangingTimeout) if @stoppedChangingTimeout

  scheduleModifiedEvents: ->
    @cancelStoppedChangingTimeout()
    stoppedChangingCallback = =>
      @stoppedChangingTimeout = null
      modifiedStatus = @isModified()
      @emitModifiedStatusChanged(modifiedStatus)
    @stoppedChangingTimeout = setTimeout(
      stoppedChangingCallback,
      @stoppedChangingDelay
    )

  emitModifiedStatusChanged: (modifiedStatus) ->
    return if modifiedStatus is @previousModifiedStatus
    @previousModifiedStatus = modifiedStatus
    @emitter.emit 'did-change-modified', modifiedStatus

Outline.ChangeDone = 0
Outline.ChangeUndone = 1
Outline.ChangeCleared = 2
Outline.ChangeReadOtherContents = 3
Outline.ChangeAutosaved = 4
Outline.ChangeRedone = 5
Outline.ChangeDiscardable = 256

module.exports = Outline