/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const AttributedString = require('./attributed-string');
const bmlTags = require('./attributed-string-bml-tags');
const ElementType = require('domelementtype');
const htmlparser = require('htmlparser2');
const { assert } = require('./util');
const dom = require('./dom');

AttributedString.fromInlineBMLString = function(inlineBMLString) {
  let result = null;
  const handler = new htmlparser.DomHandler((error, dom) => {
    if (error) {
      return console.log(error);
    } else {
      return result = this.fromInlineBML(dom);
    }
  });
  const parser = new htmlparser.Parser(handler, {
    decodeEntities: true,
    lowerCaseTags: true
  }
  );
  parser.write(inlineBMLString);
  parser.done();
  return result;
};

AttributedString.fromInlineBML = function(domArray) {
  if (domArray.length === 0) {
    new AttributedString();
  }
  if ((domArray.length === 1) && (domArray[0].type === ElementType.Text)) {
    return new AttributedString(domArray[0].data);
  } else {
    const attributedString = new AttributedString();
    for (let each of Array.from(domArray)) {
      addDOMNodeToAttributedString(each, attributedString);
    }
    return attributedString;
  }
};

AttributedString.validateInlineBML = function(inlineBMLContainer) {
  const end = dom.nodeNextBranch(inlineBMLContainer);
  let each = dom.nextNode(inlineBMLContainer);
  return (() => {
    const result = [];
    while (each !== end) {
      var tagName;
      if (tagName = each.name) {
        assert(bmlTags[tagName], `Unexpected tagName '${tagName}' in 'P'`);
      }
      result.push(each = dom.nextNode(each));
    }
    return result;
  })();
};

var addDOMNodeToAttributedString = function(node, attributedString) {
  const {
    type
  } = node;

  if (type === ElementType.Text) {
    return attributedString.appendText(new AttributedString(node.data.replace(/(\r\n|\n|\r)/gm,'')));
  } else if (type === ElementType.Tag) {
    const tagStart = attributedString.getLength();
    let each = dom.firstChild(node);

    if (each) {
      while (each) {
        addDOMNodeToAttributedString(each, attributedString);
        each = each.next;
      }
      if (bmlTags[node.name]) {
        return attributedString.addAttributeInRange(node.name, node.attribs, tagStart, attributedString.getLength() - tagStart);
      }
    } else if (bmlTags[node.name]) {
      if (node.name === 'br') {
        const lineBreak = new AttributedString(AttributedString.LineSeparatorCharacter);
        lineBreak.addAttributeInRange('br', node.attribs, 0, 1);
        return attributedString.appendText(lineBreak);
      } else if (node.name === 'img') {
        const image = new AttributedString(AttributedString.ObjectReplacementCharacter);
        image.addAttributeInRange('img', node.attribs, 0, 1);
        return attributedString.appendText(image);
      }
    }
  }
};

AttributedString.inlineBMLToText = function(inlineBMLContainer) {
  if (inlineBMLContainer) {
    const end = dom.nodeNextBranch(inlineBMLContainer);
    let each = dom.nextNode(inlineBMLContainer);
    const text = [];

    while (each !== end) {
      const {
        type
      } = each;

      if (type === ElementType.Text) {
        text.push(each.data);
      } else if ((type === ElementType.Tag) && !dom.firstChild(each)) {
        const tagName = each.name;

        if (tagName === 'br') {
          text.push(AttributedString.LineSeparatorCharacter);
        } else if (tagName === 'img') {
          text.push(AttributedString.ObjectReplacementCharacter);
        }
      }
      each = dom.nextNode(each);
    }
    return text.join('');
  } else {
    return '';
  }
};

module.exports = AttributedString;
