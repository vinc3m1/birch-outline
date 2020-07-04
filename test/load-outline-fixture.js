/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Outline = require('../src/outline');

// one
//   two
//     three @t
//     fo<b>u</b>r @t
//   five
//     six @t(23)

module.exports = function(type) {

  const outline = new Outline(type);

  const one = outline.createItem('one', '1');

  const two = outline.createItem('two', '2');
  one.appendChildren(two);

  const three = outline.createItem('three', '3');
  three.setAttribute('data-t', '');
  two.appendChildren(three);

  const four = outline.createItem('four', '4');
  four.setAttribute('data-t', '');
  four.addBodyAttributeInRange('b', {}, 2, 1);

  two.appendChildren(four);

  const five = outline.createItem('five', '5');
  one.appendChildren(five);

  const six = outline.createItem('six', '6');
  six.setAttribute('data-t', '23');
  five.appendChildren(six);

  outline.root.appendChildren(one);
  outline.changeCount = 0;
  outline.undoManager.removeAllActions();
  Outline.addOutline(outline);

  return {
      outline,
      root: outline.root,
      one: outline.getItemForID('1'),
      two: outline.getItemForID('2'),
      three: outline.getItemForID('3'),
      four: outline.getItemForID('4'),
      five: outline.getItemForID('5'),
      six: outline.getItemForID('6')
  };
};
