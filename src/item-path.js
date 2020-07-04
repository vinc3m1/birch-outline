/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let ItemPath;
const ItemPathParser = require('./item-path-parser');
const DateTime = require('./date-time');
const _ = require('underscore-plus');
const Item = require('./item');

module.exports=
(ItemPath = class ItemPath {

  static parse(path, startRule, types) {
    let parsedPath;
    if (startRule == null) { startRule = 'ItemPathExpression'; }
    if (types == null) { types = {}; }
    let exception = null;
    let keywords = [];
    parsedPath;

    try {
      parsedPath = ItemPathParser.parse(path, {
        startRule,
        types
      }
      );
    } catch (e) {
      exception = e;
    }

    if (parsedPath) {
      ({
        keywords
      } = parsedPath);
    }

    return {
      parsedPath,
      keywords,
      error: exception
    };
  }

  static evaluate(itemPath, contextItem, options) {
    if (options == null) { options = {}; }
    if (typeof itemPath === 'string') {
      itemPath = new ItemPath(itemPath, options);
    }
    itemPath.options = options;
    const results = itemPath.evaluate(contextItem);
    itemPath.options = options;
    return results;
  }

  constructor(pathExpressionString, options) {
    this.pathExpressionString = pathExpressionString;
    this.options = options;
    if (this.options == null) { this.options = {}; }
    this.itemToRowMap = new Map;
    const parsed = this.constructor.parse(this.pathExpressionString, undefined, this.options.types);
    this.pathExpressionAST = parsed.parsedPath;
    this.pathExpressionKeywords = parsed.keywords;
    this.pathExpressionError = parsed.error;
  }

  /*
  Section: Evaluation
  */

  evaluate(item) {
    let result;
    this.now = new Date;
    this.itemToRowMap.clear();
    if (this.pathExpressionAST) {
      result = this.evaluatePathExpression(this.pathExpressionAST, item);
    } else {
      result = [];
    }
    this.itemToRowMap.clear();
    return result;
  }

  evaluatePathExpression(pathExpressionAST, item) {
    let results;
    const {
      union
    } = pathExpressionAST;
    const {
      intersect
    } = pathExpressionAST;
    const {
      except
    } = pathExpressionAST;
    results;

    if (union) {
      results = this.evaluateUnion(union, item);
    } else if (intersect) {
      results = this.evaluateIntersect(intersect, item);
    } else if (except) {
      results = this.evaluateExcept(except, item);
    } else {
      results = this.evaluatePath(pathExpressionAST, item);
    }

    this.sliceResultsFrom(pathExpressionAST.slice, results, 0);

    return results;
  }

  rowForItem(item) {
    if (this.itemToRowMap.size === 0) {
      const {
        root
      } = item.outline;
      this.itemToRowMap.set(root.id, -1);
      let each = root.firstChild;
      let row = 0;
      while (each) {
        this.itemToRowMap.set(each.id, row);
        each = each.nextItem;
        row++;
      }
    }
    return this.itemToRowMap.get(item.id);
  }

  unionOutlineOrderedResults(results1, results2, outline) {
    const results = [];
    let i = 0;
    let j = 0;

    while (true) {
      var each;
      const r1 = results1[i];
      const r2 = results2[j];
      if (!r1) {
        if (r2) {
          for (each of Array.from(results2.slice(j))) {
            results.push(each);
          }
        }
        return results;
      } else if (!r2) {
        if (r1) {
          for (each of Array.from(results1.slice(i))) {
            results.push(each);
          }
        }
        return results;
      } else if (r1 === r2) {
        results.push(r2);
        i++;
        j++;
      } else {
        if (this.rowForItem(r1) < this.rowForItem(r2)) {
          results.push(r1);
          i++;
        } else {
          results.push(r2);
          j++;
        }
      }
    }
  }

  evaluateUnion(pathsAST, item) {
    const results1 = this.evaluatePathExpression(pathsAST[0], item);
    const results2 = this.evaluatePathExpression(pathsAST[1], item);
    return this.unionOutlineOrderedResults(results1, results2, item.outline);
  }

  evaluateIntersect(pathsAST, item) {
    const results1 = this.evaluatePathExpression(pathsAST[0], item);
    const results2 = this.evaluatePathExpression(pathsAST[1], item);
    const results = [];
    let i = 0;
    let j = 0;

    while (true) {
      const r1 = results1[i];
      const r2 = results2[j];

      if (!r1) {
        return results;
      } else if (!r2) {
        return results;
      } else if (r1 === r2) {
        results.push(r2);
        i++;
        j++;
      } else {
        if (this.rowForItem(r1) < this.rowForItem(r2)) {
          i++;
        } else {
          j++;
        }
      }
    }
  }

  evaluateExcept(pathsAST, item) {
    const results1 = this.evaluatePathExpression(pathsAST[0], item);
    const results2 = this.evaluatePathExpression(pathsAST[1], item);
    const results = [];
    let i = 0;
    let j = 0;

    while (true) {
      var r1Index;
      const r1 = results1[i];
      let r2 = results2[j];

      if (r1 && r2) {
        const r1Row = this.rowForItem(r1);
        while (r2 && (r1Row > this.rowForItem(r2))) {
          j++;
          r2 = results2[j];
        }
      }

      if (!r1) {
        return results;
      } else if (!r2) {
        for (let each of Array.from(results1.slice(i))) {
          results.push(each);
        }
        return results;
      } else if (r1 === r2) {
        r1Index = -1;
        const r2Index = -1;
        i++;
        j++;
      } else {
        results.push(r1);
        r1Index = -1;
        i++;
      }
    }
  }

  evaluatePath(pathAST, item) {
    let results;
    const {
      outline
    } = item;
    let contexts = [];
    results;

    if (pathAST.absolute) {
      item = this.options.root || item.localRoot;
    }

    contexts.push(item);

    for (let step of Array.from(pathAST.steps)) {
      results = [];
      for (let context of Array.from(contexts)) {
        if (results.length) {
          // If evaluating from multiple contexts and we have some results
          // already merge the new set of context results in with the existing.
          const contextResults = [];
          this.evaluateStep(step, context, contextResults);
          results = this.unionOutlineOrderedResults(results, contextResults, outline);
        } else {
          this.evaluateStep(step, context, results);
        }
      }
      contexts = results;
    }
    return results;
  }

  evaluateStep(step, item, results) {
    const {
      predicate
    } = step;
    const from = results.length;
    const {
      type
    } = step;

    switch (step.axis) {
      case 'ancestor-or-self':
        var each = item;
        while (each) {
          if (this.evaluatePredicate(type, predicate, each)) {
            results.splice(from, 0, each);
          }
          each = each.parent;
        }
        break;

      case 'ancestor':
        each = item.parent;
        while (each) {
          if (this.evaluatePredicate(type, predicate, each)) {
            results.splice(from, 0, each);
          }
          each = each.parent;
        }
        break;

      case 'child':
        each = item.firstChild;
        while (each) {
          if (this.evaluatePredicate(type, predicate, each)) {
            results.push(each);
          }
          each = each.nextSibling;
        }
        break;

      case 'descendant-or-self':
        var end = item.nextBranch;
        each = item;
        while (each && (each !== end)) {
          if (this.evaluatePredicate(type, predicate, each)) {
            results.push(each);
          }
          each = each.nextItem;
        }
        break;

      case 'descendant':
        end = item.nextBranch;
        each = item.firstChild;
        while (each && (each !== end)) {
          if (this.evaluatePredicate(type, predicate, each)) {
            results.push(each);
          }
          each = each.nextItem;
        }
        break;

      case 'following-sibling':
        each = item.nextSibling;
        while (each) {
          if (this.evaluatePredicate(type, predicate, each)) {
            results.push(each);
          }
          each = each.nextSibling;
        }
        break;

      case 'following':
        each = item.nextItem;
        while (each) {
          if (this.evaluatePredicate(type, predicate, each)) {
            results.push(each);
          }
          each = each.nextItem;
        }
        break;

      case 'parent':
        each = item.parent;
        if (each && this.evaluatePredicate(type, predicate, each)) {
          results.push(each);
        }
        break;

      case 'preceding-sibling':
        each = item.previousSibling;
        while (each) {
          if (this.evaluatePredicate(type, predicate, each)) {
            results.splice(from, 0, each);
          }
          each = each.previousSibling;
        }
        break;

      case 'preceding':
        each = item.previousItem;
        while (each) {
          if (this.evaluatePredicate(type, predicate, each)) {
            results.splice(from, 0, each);
          }
          each = each.previousItem;
        }
        break;

      case 'self':
        if (this.evaluatePredicate(type, predicate, item)) {
          results.push(item);
        }
        break;
    }

    return this.sliceResultsFrom(step.slice, results, from);
  }

  evaluatePredicate(type, predicate, item) {
    let andP, notP, orP;
    if ((type !== '*') && (type !== item.getAttribute('data-type'))) {
      return false;
    } else if (predicate === '*') {
      return true;
    } else if ((andP = predicate.and)) {
      return this.evaluatePredicate('*', andP[0], item) && this.evaluatePredicate('*', andP[1], item);
    } else if ((orP = predicate.or)) {
      return this.evaluatePredicate('*', orP[0], item) || this.evaluatePredicate('*', orP[1], item);
    } else if ((notP = predicate.not)) {
      return !this.evaluatePredicate('*', notP, item);
    } else {
      return this.evaluateComparisonPredicate(predicate, item);
    }
  }

  evaluateComparisonPredicate(predicate, item) {
    const leftValue = this.evaluateValue(predicate, 'leftValue', item);
    if (!predicate.rightValue) {
      return (leftValue != null);
    } else {
      const {
        relation
      } = predicate;
      const rightValue = this.evaluateValue(predicate, 'rightValue', item);
      return this.evaluateRelation(leftValue, relation, rightValue, predicate);
    }
  }

  evaluateValue(predicate, name, item) {
    let cacheName;
    const value = predicate[name];

    if (!value) {
      return;
    }

    if (name === 'leftValue') {
      cacheName = 'leftValueCache';
    } else {
      cacheName = 'rightValueCache';
    }

    let evaluatedValue = predicate[cacheName];
    if (!evaluatedValue) {
      if (Array.isArray(value)) {
        evaluatedValue = this.evaluateFunction(value, item);
        cacheName = null;
      } else {
        evaluatedValue = value;
      }
      if (evaluatedValue) {
        evaluatedValue = this.convertValueForModifier(evaluatedValue, predicate.modifier);
      }
      if (cacheName) {
        predicate[cacheName] = evaluatedValue;
      }
    }
    return evaluatedValue;
  }

  evaluateFunction(valueFunction, item) {
    const functionName = valueFunction[0];
    switch (functionName) {
      case 'getAttribute':
        return this.evaluteGetAttributeFunction(valueFunction, item);
      case 'count':
        return this.evaluateCountFunction(valueFunction[1], item);
    }
  }

  evaluteGetAttributeFunction(attributePath, item) {
    let value;
    let attributeName = attributePath[1];
    attributeName = (this.options.attributeShortcuts != null ? this.options.attributeShortcuts[attributeName] : undefined) || attributeName;
    switch (attributeName) {
      case 'id':
        return item.id;
      case 'text':
        return item.bodyString;
      default:
        if ((value = item.getAttribute(attributeName))) {
          return value;
        } else {
          return item.getAttribute('data-' + attributeName);
        }
    }
  }

  evaluateCountFunction(pathExpressionAST, item) {
    return '' + this.evaluatePathExpression(pathExpressionAST, item).length;
  }

  convertValueForModifier(value, modifier) {
    if (modifier === 'i') {
      return value.toLowerCase();
    } else if (modifier === 'n') {
      return parseFloat(value);
    } else if (modifier === 'd') {
      return __guard__(DateTime.parse(value), x => x.getTime());
    } else if (modifier === 's') {
      return value;
    } else {
      throw new Error('Unexpected Modifier: ' + modifier);
    }
  }

  evaluateRelation(left, relation, right, predicate) {
    switch (relation) {
      case '=':
        return left === right;
      case '!=':
        return left !== right;
      case '<':
        if (left != null) {
          return left < right;
        } else {
          return false;
        }
      case '>':
        if (left != null) {
          return left > right;
        } else {
          return false;
        }
      case '<=':
        if (left != null) {
          return left <= right;
        } else {
          return false;
        }
      case '>=':
        if (left != null) {
          return left >= right;
        } else {
          return false;
        }
      case 'beginswith':
        if ((left != null ? left.startsWith : undefined)) {
          return left.startsWith(right);
        } else {
          return false;
        }
      case 'contains':
        if ((left != null ? left.indexOf : undefined)) {
          return left.indexOf(right) !== -1;
        } else {
          return false;
        }
      case 'endswith':
        if (left.endsWith) {
          return left.endsWith(right);
        } else {
          return false;
        }
      case 'matches':
        if (left != null) {
          let {
            joinedValueRegexCache
          } = predicate;
          if (joinedValueRegexCache === undefined) {
            try {
              joinedValueRegexCache = new RegExp(right.toString());
            } catch (error) {
              joinedValueRegexCache = null;
            }
            predicate.joinedValueRegexCache = joinedValueRegexCache;
          }

          if (joinedValueRegexCache) {
            return left.toString().match(joinedValueRegexCache);
          } else {
            return false;
          }
        } else {
          return false;
        }
    }
  }

  sliceResultsFrom(slice, results, from) {
    if (slice) {
      const length = results.length - from;
      let {
        start
      } = slice;
      let {
        end
      } = slice;

      if (length === 0) {
        return;
      }

      if (end > length) {
        end = length;
      }

      if ((start !== 0) || (end !== length)) {
        let sliced;
        sliced;
        if (start < 0) {
          start += length;
          if (start < 0) {
            start = 0;
          }
        }
        if (start > (length - 1)) {
          start = length - 1;
        }
        if (end === null) {
          sliced = results[from + start];
        } else {
          if (end < 0) { end += length; }
          if (end < start) { end = start; }
          sliced = results.slice(from).slice(start, end);
        }
        return Array.prototype.splice.apply(results, [from, results.length - from].concat(sliced));
      }
    }
  }

  /*
  Section: Path to Item
  */

  static lastSegmentToItem(item) {
    let candidateSegment;
    const targetBodyString = item.bodyString.replace(/^\s+|\s+$/g, '');
    let nextCandidateSegmentLength = Math.min(4, targetBodyString.length);

    while (nextCandidateSegmentLength <= targetBodyString.length) {
      candidateSegment = targetBodyString.substr(0, nextCandidateSegmentLength).replace(/^\s+|\s+$/g, '');
      const candidateSegmentLower = candidateSegment.toLowerCase();
      let each = item.parent.firstChild;
      while (each) {
        if ((each !== item) && (each.bodyString.toLowerCase().indexOf(candidateSegmentLower) !== -1)) {
          nextCandidateSegmentLength++;
          candidateSegment = null;
          break;
        }
        each = each.nextSibling;
      }
      if (candidateSegment) {
        break;
      }
    }

    if (candidateSegment) {
      candidateSegment = candidateSegment.replace(/\"/g, '\\"'); // escape quotes
      try {
        ItemPathParser.parse(candidateSegment, {startRule: 'StringValue'});
      } catch (e) {
        candidateSegment = `\"${candidateSegment}\"`;
      }
      return candidateSegment;
    } else {
      return `@id = ${item.id}`;
    }
  }

  static pathToItem(item, hoistedItem) {
    if (hoistedItem == null) { hoistedItem = item.localRoot; }
    const segments = [];
    while (item !== hoistedItem) {
      segments.push(this.lastSegmentToItem(item));
      item = item.parent;
    }
    return '/' + segments.reverse().join('/');
  }

  /*
  Section: AST To String
  */

  predicateToString(predicate, group) {
    if (predicate === '*') {
      return '*';
    } else {
      let andAST, notAST, orAST;
      const openGroup = group ? '(' : '';
      const closeGroup = group ? ')' : '';

      if (andAST = predicate.and) {
        return openGroup + this.predicateToString(andAST[0], true) + ' and ' + this.predicateToString(andAST[1], true) + closeGroup;
      } else if (orAST = predicate.or) {
        return openGroup + this.predicateToString(orAST[0], true) + ' or ' + this.predicateToString(orAST[1], true) + closeGroup;
      } else if (notAST = predicate.not) {
        return 'not ' + this.predicateToString(notAST, true);
      } else {
        let modifier, relation, rightValue;
        const result = [];

        let {
          leftValue
        } = predicate;
        if (leftValue && !((leftValue[0] === 'getAttribute') && (leftValue[1] === 'text'))) { // default
          leftValue = this.valueToString(predicate.leftValue);
          if (leftValue) {
            result.push(leftValue);
          }
        }

        if (relation = predicate.relation) {
          if (relation !== 'contains') { //default
            result.push(relation);
          }
        }

        if (modifier = predicate.modifier) {
          if (modifier !== 'i') { //default
            result.push('[' + modifier + ']');
          }
        }

        if (rightValue = this.valueToString(predicate.rightValue)) {
          result.push(rightValue);
        }

        return result.join(' ');
      }
    }
  }

  valueToString(value) {
    if (!value) { return; }

    if (Array.isArray(value)) {
      const functionName = value[0];
      if (functionName === 'getAttribute') {
        return '@' + value.slice(1).join(':');
      } else if (functionName === 'count') {
        return 'count(' + this.pathExpressionToString(value[1]) + ')';
      }
    } else {
      try {
        ItemPathParser.parse(value,
          {startRule: 'StringValue'});
      } catch (error) {
        value = '"' + value + '"';
      }
      return value;
    }
  }

  stepToString(step, first) {
    const predicate = this.predicateToString(step.predicate);
    switch (step.axis) {
      case 'child':
        return predicate;
      case 'descendant':
        if (first) {
          return predicate; // default
        } else {
          return '/' + predicate;
        }
      case 'descendant-or-self':
        return '//' + predicate;
      case 'parent':
        return '..' + predicate;
      default:
        return step.axis + '::' + predicate;
    }
  }

  pathToString(pathAST) {
    const stepStrings = [];
    let firstStep = null;
    const first = true;
    for (let step of Array.from(pathAST.steps)) {
      if (!firstStep) {
        firstStep = step;
        stepStrings.push(this.stepToString(step, true));
      } else {
        stepStrings.push(this.stepToString(step));
      }
    }
    if (pathAST.absolute && !(firstStep.axis === 'descendant')) {
      return '/' + stepStrings.join('/');
    } else {
      return stepStrings.join('/');
    }
  }

  pathExpressionToString(itemPath, group) {
    let except, intersect, union;
    const openGroup = group ? '(' : '';
    const closeGroup = group ? ')' : '';
    if ((union = itemPath.union)) {
      return openGroup + this.pathExpressionToString(union[0], true) + ' union ' + this.pathExpressionToString(union[1], true) + closeGroup;
    } else if ((intersect = itemPath.intersect)) {
      return openGroup + this.pathExpressionToString(intersect[0], true) + ' intersect ' + this.pathExpressionToString(intersect[1], true) + closeGroup;
    } else if ((except = itemPath.except)) {
      return openGroup + this.pathExpressionToString(except[0], true) + ' except ' + this.pathExpressionToString(except[1], true) + closeGroup;
    } else {
      return this.pathToString(itemPath);
    }
  }

  toString() {
    return this.pathExpressionToString(this.pathExpressionAST);
  }
});

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}