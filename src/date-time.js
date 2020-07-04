/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let DateTime;
const DateTimeParser = require('./date-time-parser');
const moment = require('moment');

// Public: Date and time parsing and conversion.
module.exports =
(DateTime = class DateTime {

  // Public: Parse the given string and return associated {Date}.
  //
  // - `string` The date/time {String}.
  //
  // Returns {Date} or null.
  static parse(string) {
    try {
      return DateTimeParser.parse(string, {moment}).toDate();
    } catch (e) {
      const m = moment(string, moment.ISO_8601, true);
      if (m.isValid()) {
        return m.toDate();
      } else {
        return null;
      }
    }
  }

  // Public: Format the given date/time {String} or {Date} as a minimal absolute date/time {String}.
  //
  // - `dateOrString` The date/time {String} or {Date} to format.
  //
  // Returns {String}.
  static format(dateOrString, showMillisecondsIfNeeded, showSecondsIfNeeded) {
    let m;
    if (showMillisecondsIfNeeded == null) { showMillisecondsIfNeeded = true; }
    if (showSecondsIfNeeded == null) { showSecondsIfNeeded = true; }
    try {
      m = DateTimeParser.parse(dateOrString, {moment});
    } catch (e) {
      m = moment(dateOrString, moment.ISO_8601, true);
      if (!m.isValid()) {
        return 'invalid date';
      }
    }

    if (m.milliseconds() && showMillisecondsIfNeeded) {
      return m.format('YYYY-MM-DD HH:mm:ss:SSS');
    } else if (m.seconds() && showSecondsIfNeeded) {
      return m.format('YYYY-MM-DD HH:mm:ss');
    } else if (m.hours() || m.minutes()) {
      return m.format('YYYY-MM-DD HH:mm');
    } else {
      return m.format('YYYY-MM-DD');
    }
  }
});
