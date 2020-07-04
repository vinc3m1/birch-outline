/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const DateTimeParser = require('../src/date-time-parser');
const should = require('chai').should();
const moment = require('moment');

describe('DateTimeParser', function() {
  let currentMoment = null;

  beforeEach(() => currentMoment = moment());

  it('should parse full examples', function() {
    DateTimeParser.parse('1976-11-27 at 2pm +2s -1sec +2s', {moment}).format().should.equal(moment([1976, 10, 27]).hour(14).second(3).format());
    return DateTimeParser.parse('1976-11-27 2pm +2s -1sec +2s', {moment}).format().should.equal(moment([1976, 10, 27]).hour(14).second(3).format());
  });

  describe('Absolute Dates', function() {

    it('1976-11-27', () => DateTimeParser.parse('1976-11-27', {moment}).format().should.equal(moment([1976, 10, 27]).format()));

    it('1976-11', () => DateTimeParser.parse('1976-11', {moment}).format().should.equal(moment([1976, 10, 1]).format()));

    return it('2012', () => DateTimeParser.parse('2012', {moment}).format().should.equal(moment([2012]).format()));
  });

  describe('Relative Dates', function() {

    it('today', () => DateTimeParser.parse('today', {moment}).format().should.equal(moment().startOf('day').format()));

    it('yesterday', () => DateTimeParser.parse('yesterday', {moment}).format().should.equal(moment().startOf('day').subtract(1, 'day').format()));

    it('tomorrow', () => DateTimeParser.parse('tomorrow', {moment}).format().should.equal(moment().startOf('day').add(1, 'day').format()));

    it('last unit', function() {
      DateTimeParser.parse('last year', {moment}).format().should.equal(moment().subtract(1, 'year').startOf('year').format());
      DateTimeParser.parse('last quarter', {moment}).format().should.equal(moment().subtract(1, 'quarter').startOf('quarter').format());
      DateTimeParser.parse('last month', {moment}).format().should.equal(moment().subtract(1, 'month').startOf('month').format());
      DateTimeParser.parse('last week', {moment}).format().should.equal(moment().subtract(1, 'week').startOf('week').format());
      return DateTimeParser.parse('last day', {moment}).format().should.equal(moment().subtract(1, 'day').startOf('day').format());
    });

    it('this unit', function() {
      DateTimeParser.parse('this year', {moment}).format().should.equal(moment().startOf('year').format());
      DateTimeParser.parse('this quarter', {moment}).format().should.equal(moment().startOf('quarter').format());
      DateTimeParser.parse('this month', {moment}).format().should.equal(moment().startOf('month').format());
      DateTimeParser.parse('this week', {moment}).format().should.equal(moment().startOf('week').format());
      return DateTimeParser.parse('this day', {moment}).format().should.equal(moment().startOf('day').format());
    });

    it('next unit', function() {
      DateTimeParser.parse('next year', {moment}).format().should.equal(moment().add(1, 'year').startOf('year').format());
      DateTimeParser.parse('next quarter', {moment}).format().should.equal(moment().add(1, 'quarter').startOf('quarter').format());
      DateTimeParser.parse('next month', {moment}).format().should.equal(moment().add(1, 'month').startOf('month').format());
      DateTimeParser.parse('next Month', {moment}).format().should.equal(moment().add(1, 'month').startOf('month').format());
      DateTimeParser.parse('next week', {moment}).format().should.equal(moment().add(1, 'week').startOf('week').format());
      DateTimeParser.parse('next isoweek', {moment}).format().should.equal(moment().add(1, 'isoweek').startOf('isoweek').format());
      return DateTimeParser.parse('next day', {moment}).format().should.equal(moment().add(1, 'day').startOf('day').format());
    });

    it('named month', function() {
      DateTimeParser.parse('jul 7', {moment}).format().should.equal(moment().startOf('year').month('july').date(7).format());
      DateTimeParser.parse('july 7', {moment}).format().should.equal(moment().startOf('year').month('july').date(7).format());
      DateTimeParser.parse('JuLy 7', {moment}).format().should.equal(moment().startOf('year').month('july').date(7).format());
      DateTimeParser.parse('next JuLy 7', {moment}).format().should.equal(moment().startOf('year').month('july').date(7).add(1, 'year').format());
      return DateTimeParser.parse('last JuLy 7', {moment}).format().should.equal(moment().startOf('year').month('july').date(7).subtract(1, 'year').format());
    });

    return it('named day', function() {
      DateTimeParser.parse('monday', {moment}).format().should.equal(moment().startOf('day').day('monday').format());
      DateTimeParser.parse('mon', {moment}).format().should.equal(moment().startOf('day').day('monday').format());
      DateTimeParser.parse('next mon', {moment}).format().should.equal(moment().startOf('day').day('monday').add(1, 'week').format());
      return DateTimeParser.parse('last mon', {moment}).format().should.equal(moment().startOf('day').day('monday').subtract(1, 'week').format());
    });
  });

  describe('Time', function() {
    it('2:15:32', () => DateTimeParser.parse('2:15:32', {startRule:'Time', moment}).toISOString().should.equal('PT2H15M32S'));

    it('2:15:32(am/pm)', function() {
      DateTimeParser.parse('2:15:32am', {startRule:'Time', moment}).toISOString().should.equal('PT2H15M32S');
      return DateTimeParser.parse('2:15:32 PM', {startRule:'Time', moment}).toISOString().should.equal('PT14H15M32S');
    });

    it('2:15', function() {
      DateTimeParser.parse('2:15', {startRule:'Time', moment}).toISOString().should.equal('PT2H15M');
      return DateTimeParser.parse('2:15', {moment}).minute().should.equal(15);
    });

    it('2(am/pm)', function() {
      DateTimeParser.parse('2 Am', {startRule:'Time', moment}).toISOString().should.equal('PT2H');
      DateTimeParser.parse('2pm', {startRule:'Time', moment}).toISOString().should.equal('PT14H');
      DateTimeParser.parse('2 am', {moment}).hour().should.equal(2);
      return DateTimeParser.parse('2pm', {moment}).hour().should.equal(14);
    });

    return it('2 should throw', () => ((() => DateTimeParser.parse('2', {startRule:'Time'}))).should.throw());
  });

  return describe('Durations', function() {

    it('milliseconds', function() {
      DateTimeParser.parse('3 milliseconds', {startRule:'Duration', moment}).toISOString().should.equal('PT0.003S');
      DateTimeParser.parse('3 millisecond', {startRule:'Duration', moment}).toISOString().should.equal('PT0.003S');
      DateTimeParser.parse('3 ms', {startRule:'Duration', moment}).toISOString().should.equal('PT0.003S');
      return DateTimeParser.parse('3 ms', {currentMoment, moment}).unix().should.equal(currentMoment.unix());
    });

    it('seconds', function() {
      DateTimeParser.parse('3 seconds', {startRule:'Duration', moment}).toISOString().should.equal('PT3S');
      DateTimeParser.parse('3 second', {startRule:'Duration', moment}).toISOString().should.equal('PT3S');
      DateTimeParser.parse('3 sec', {startRule:'Duration', moment}).toISOString().should.equal('PT3S');
      DateTimeParser.parse('3 s', {startRule:'Duration', moment}).toISOString().should.equal('PT3S');
      return DateTimeParser.parse('3 s', {currentMoment, moment}).unix().should.equal(currentMoment.unix() + 3);
    });

    it('minutes', function() {
      DateTimeParser.parse('10 minuTes', {startRule:'Duration', moment}).toISOString().should.equal('PT10M');
      DateTimeParser.parse('10 minuTe', {startRule:'Duration', moment}).toISOString().should.equal('PT10M');
      DateTimeParser.parse('10 min', {startRule:'Duration', moment}).toISOString().should.equal('PT10M');
      DateTimeParser.parse('10 m', {startRule:'Duration', moment}).toISOString().should.equal('PT10M');
      return DateTimeParser.parse('3 m', {currentMoment, moment}).unix().should.equal(currentMoment.unix() + (3 * 60));
    });

    it('hours', function() {
      DateTimeParser.parse('2 hours', {startRule:'Duration', moment}).toISOString().should.equal('PT2H');
      DateTimeParser.parse('2 hour', {startRule:'Duration', moment}).toISOString().should.equal('PT2H');
      DateTimeParser.parse('2h', {startRule:'Duration', moment}).toISOString().should.equal('PT2H');
      return DateTimeParser.parse('3 h', {currentMoment, moment}).unix().should.equal(currentMoment.unix() + (60 * 60 * 3));
    });

    it('days', function() {
      DateTimeParser.parse('2 days', {startRule:'Duration', moment}).toISOString().should.equal('P2D');
      DateTimeParser.parse('2 day', {startRule:'Duration', moment}).toISOString().should.equal('P2D');
      return DateTimeParser.parse('2d', {startRule:'Duration', moment}).toISOString().should.equal('P2D');
    });

    it('weeks', function() {
      DateTimeParser.parse('4 weeks', {startRule:'Duration', moment}).toISOString().should.equal('P28D');
      DateTimeParser.parse('4 week', {startRule:'Duration', moment}).toISOString().should.equal('P28D');
      DateTimeParser.parse('4 w', {startRule:'Duration', moment}).toISOString().should.equal('P28D');
      DateTimeParser.parse('4 w', {startRule:'Duration', moment}).asSeconds().should.equal(2419200);
      DateTimeParser.parse('1 w', {startRule:'Duration', moment}).asSeconds().should.equal(60 * 60 * 24 * 7);
      return DateTimeParser.parse('2 w', {startRule:'Duration', moment}).asSeconds().should.equal(60 * 60 * 24 * 7 * 2);
    });

    it('months', function() {
      DateTimeParser.parse('4 months', {startRule:'Duration', moment}).toISOString().should.equal('P4M');
      DateTimeParser.parse('4 month', {startRule:'Duration', moment}).toISOString().should.equal('P4M');
      return DateTimeParser.parse('4 o', {startRule:'Duration', moment}).toISOString().should.equal('P4M');
    });

    it('quarters', function() {
      DateTimeParser.parse('3 quarters', {startRule:'Duration', moment}).toISOString().should.equal('P9M');
      DateTimeParser.parse('3 quarter', {startRule:'Duration', moment}).toISOString().should.equal('P9M');
      return DateTimeParser.parse('3 q', {startRule:'Duration', moment}).toISOString().should.equal('P9M');
    });

    it('years', function() {
      DateTimeParser.parse('3 years', {startRule:'Duration', moment}).toISOString().should.equal('P3Y');
      DateTimeParser.parse('3 year', {startRule:'Duration', moment}).toISOString().should.equal('P3Y');
      return DateTimeParser.parse('3 y', {startRule:'Duration', moment}).toISOString().should.equal('P3Y');
    });

    it('+ & -', function() {
      DateTimeParser.parse('- 3 years', {startRule:'Duration', moment}).toISOString().should.equal('-P3Y');
      return DateTimeParser.parse('+3years', {startRule:'Duration', moment}).toISOString().should.equal('P3Y');
    });

    return it('should not conflict with years', function() {
      DateTimeParser.parse('2012 seconds', {currentMoment, moment}).unix().should.equal(currentMoment.unix() + 2012);
      return DateTimeParser.parse('2012s', {currentMoment, moment}).unix().should.equal(currentMoment.unix() + 2012);
    });
  });
});
