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
const _ = require('underscore-plus');

// Public: A class for serializing and deserializing {Item}s.
class ItemSerializer {
  static initClass() {
  
    /*
    Section: Format Constants
    */
  
    // Public: Outline and item ID JSON for the pasteboard.
    this.ItemReferencesType = 'application/json+item-ids';
  
    // Public: BML type constant.
    //
    // - HTML subset for representing outlines in HTML.
    this.BMLType = 'text/bml+html';
    this.BMLMimeType = this.BMLType;
  
    // Public: OPML type constant.
    //
    // - See https://en.wikipedia.org/wiki/OPML
    this.OPMLType = 'text/opml+xml';
    this.OPMLMimeType = this.OPMLType;
  
    // Public: TaskPaper text type constant.
    //
    // - Encode item structure with tabs.
    // - Encode item `data-*` attributes with `tag(value)` pattern.
    this.TaskPaperType = 'text/taskpaper';
    this.TaskPaperMimeType = this.TaskPaperType;
  
    // Public: Plain text type constant.
    //
    // - Encode item structure with tabs.
    this.TEXTType = 'text/plain';
    this.TEXTMimeType = this.TEXTType;
  
    this.UTIToTypeMap = {
      'public.plain-text': this.TEXTType,
      'public.utf8-plain-text': this.TEXTType,
      'com.hogbaysoftware.ItemReferencePboardType': this.ItemReferencesType,
      'com.hogbaysoftware.BirchMarkupLanguagePboardType': this.BMLType
    };
  
    this.serializations = [];
  }

  constructor() {
    throw new Error('This is a static class');
  }

  static registerSerialization(serialization) {
    if (serialization.priority == null) { serialization.priority = Number.Infinity; }
    this.serializations.push(serialization);
    return this.serializations.sort((a, b) => a.priority - b.priority);
  }

  static getSerializationsForType(type) {
    if (this.UTIToTypeMap[type]) {
      type = this.UTIToTypeMap[type];
    }
    let results = (Array.from(this.serializations).filter((each) => Array.from(each.types).includes(type)).map((each) => each.serialization));
    if (results.length === 0) {
      // Fall back to plain text serializer if nothing else is found
      results = this.getSerializationsForType(ItemSerializer.TEXTType);
    }
    return results;
  }

  static getSerializationsForExtension(extension) {
    if (extension == null) { extension = ''; }
    extension = extension.toLowerCase();
    let results = (Array.from(this.serializations).filter((each) => Array.from(each.extensions).includes(extension)).map((each) => each.serialization));
    if (results.length === 0) {
      // Fall back to plain text serializer if nothing else is found
      results = this.getSerializationsForType(ItemSerializer.TEXTType);
    }
    return results;
  }

  /*
  Section: Serialize & Deserialize Items
  */

  // Public: Serialize items into a supported format.
  //
  // - `items` {Item} {Array} to serialize.
  // - `options` (optional) Serialization options.
  //   * `type` (optional) {String} (default: ItemSerializer.BMLType)
  //   * `startOffset` (optional) {Number} (default: 0) Offset into first into to start at.
  //   * `endOffset` (optional) {Number} (default: lastItem.bodyString.length) Offset from end of last item to end at.
  //   * `expandedItems` (optional) {Item} {Array} of expanded items
  static serializeItems(items, options, legacyOptions) {
    let each;
    if (options == null) { options = {}; }
    if (typeof legacyOptions === 'string') {
      options = {type: legacyOptions};
    }

    const firstItem = items[0];
    let lastItem = items[items.length - 1];

    if (options.type == null) { options.type = (items[0] != null ? items[0].outline.type : undefined) != null ? (items[0] != null ? items[0].outline.type : undefined) : ItemSerializer.BMLType; }
    if (options.startOffset == null) { options.startOffset = 0; }
    if (options.endOffset == null) { options.endOffset = (lastItem != null ? lastItem.bodyString.length : undefined) != null ? (lastItem != null ? lastItem.bodyString.length : undefined) : 0; }
    if (options.baseDepth == null) { options.baseDepth = Number.MAX_VALUE; }

    const serialization = ((() => {
      const result = [];
      for (each of Array.from(this.getSerializationsForType(options['type']))) {         if (each.beginSerialization) {
          result.push(each);
        }
      }
      return result;
    })())[0];

    const {
      startOffset
    } = options;
    let {
      endOffset
    } = options;
    let emptyEncodeLastItem = false;
    const context = {};

    if ((items.length > 1) && (endOffset === 0)) {
      items.pop();
      lastItem = items[items.length - 1];
      endOffset = lastItem.bodyString.length;
      emptyEncodeLastItem = true;
    }

    for (each of Array.from(items)) {
      if (each.depth < options.baseDepth) {
        options.baseDepth = each.depth;
      }
    }

    serialization.beginSerialization(items, options, context);

    if (items.length === 1) {
      serialization.beginSerializeItem(items[0], options, context);
      serialization.serializeItemBody(items[0], items[0].bodyAttributedSubstringFromRange(startOffset, endOffset - startOffset), options, context);
      serialization.endSerializeItem(items[0], options, context);
    } else {
      const itemStack = [];
      for (each of Array.from(items)) {
        while (__guard__(itemStack[itemStack.length - 1], x => x.depth) >= each.depth) {
          serialization.endSerializeItem(itemStack.pop(), options, context);
        }

        itemStack.push(each);
        serialization.beginSerializeItem(each, options, context);
        let itemBody = each.bodyAttributedString;

        if (each === firstItem) {
          itemBody = itemBody.attributedSubstringFromRange(startOffset, itemBody.length - startOffset);
        } else if (each === lastItem) {
          itemBody = itemBody.attributedSubstringFromRange(0, endOffset);
        }
        serialization.serializeItemBody(each, itemBody, options, context);
      }

      while (itemStack.length) {
        serialization.endSerializeItem(itemStack.pop(), options, context);
      }
    }

    if (emptyEncodeLastItem) {
      if (typeof serialization.emptyEncodeLastItem === 'function') {
        serialization.emptyEncodeLastItem(options, context);
      }
    }

    return serialization.endSerialization(options, context);
  }

  // Public: Deserialize items from a supported format.
  //
  // - `itemsData` {String} to deserialize.
  // - `outline` {Outline} to use when creating deserialized items.
  // - `options` Deserialization options.
  //   * `type` (optional) {String} (default: ItemSerializer.TEXTType)
  //
  // Returns {Array} of {Item}s.
  static deserializeItems(serializedItems, outline, options) {
    if (options == null) { options = {}; }
    if (typeof options === 'string') {
      options = {type: options};
    }
    if (options['type'] == null) { options['type'] = outline.type != null ? outline.type : ItemSerializer.BMLType; }
    const serialization = (Array.from(this.getSerializationsForType(options['type'])).filter((each) => each.deserializeItems))[0];
    return serialization.deserializeItems(serializedItems, outline, options);
  }
}
ItemSerializer.initClass();

ItemSerializer.registerSerialization({
  priority: 0,
  extensions: [],
  types: [ItemSerializer.ItemReferencesType],
  serialization: require('./serializations/item-references')
});

ItemSerializer.registerSerialization({
  priority: 1,
  extensions: ['bml'],
  types: [ItemSerializer.BMLType],
  serialization: require('./serializations/bml')
});

ItemSerializer.registerSerialization({
  priority: 2,
  extensions: ['opml'],
  types: [ItemSerializer.OPMLType],
  serialization: require('./serializations/opml')
});

ItemSerializer.registerSerialization({
  priority: 3,
  extensions: ['taskpaper'],
  types: [ItemSerializer.TaskPaperType],
  serialization: require('./serializations/taskpaper')
});

ItemSerializer.registerSerialization({
  priority: 4,
  extensions: [],
  types: ['NSFilenamesPboardType'],
  serialization: require('./serializations/paths')
});

ItemSerializer.registerSerialization({
  priority: 5,
  extensions: [],
  types: [ItemSerializer.TEXTType],
  serialization: require('./serializations/text')
});

module.exports = ItemSerializer;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}