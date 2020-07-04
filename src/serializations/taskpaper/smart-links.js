/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const emailRegex = /\b[A-Z0-9\._%+\-]+@[A-Z0-9\.\-]+\.[A-Z]{2,4}\b/gi;
const pathRegex = /(?:^|\s)(\.?\/(?:\\\s|[^\0 ])+)/gi;
// Original source gruber I think. Modifications that I remember:
// 1. Added "." to start character set for text after : so that can support path:./myfile
const webRegex = /\b(?:([a-z][\w\-]+:(?:\/{1,3}|[a-z0-9%.])|www\d{0,3}[.])(?:[^\s()<>]+|\([^\s()<>]+\))+(?:\([^\s()<>]+\)|[^`!()\[\]{};:'".,<>?«»“”‘’\s]))/gi;

const highlightLinks = function(item) {
  let linkIndex, linkText, match;
  const {
    bodyString
  } = item;

  // Email
  if (bodyString.indexOf('@') !== -1) {
    while ((match = emailRegex.exec(bodyString))) {
      linkIndex = match.index;
      linkText = bodyString.substring(linkIndex, linkIndex + match[0].length);
      // Skip if scheme, will be caught by URL parse
      if (bodyString[linkIndex - 1] !== ':') {
        item.addBodyHighlightAttributesInRange({link: 'mailto:' + linkText}, linkIndex, linkText.length);
      }
    }
  }

  // Path
  if (bodyString.indexOf('/') !== -1) {
    while ((match = pathRegex.exec(bodyString))) {
      linkIndex = match.index;
      linkText = match[1];
      linkIndex += match[0].length - match[1].length;
      item.addBodyHighlightAttributesInRange({link: 'path:' + linkText.replace(/\\ /g, ' ')}, linkIndex, linkText.length);
    }
  }

  // URLS
  return (() => {
    const result = [];
    while ((match = webRegex.exec(bodyString))) {
      linkIndex = match.index;
      linkText = bodyString.substring(linkIndex, linkIndex + match[0].length);
      let linkTarget = linkText;
      if (linkText.indexOf('www') === 0) {
        linkTarget = 'http://' + linkText;
      }
      result.push(item.addBodyHighlightAttributesInRange({link: linkTarget}, linkIndex, linkText.length));
    }
    return result;
  })();
};

module.exports =
  {highlightLinks};
