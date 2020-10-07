import moment from 'moment';
import { buildRangeDateFilter } from '../../src/routers/metric';

describe('Test metric date range filters', () => {

  const dateFormat = 'YYYY-MM-DD HH:mm:ss';

  let req = { query: {} };
  let args = {};
  let aggregatorFilter = { $match: { $expr: { $and: [] } } };

  test('UNIT_ROUTER_METRIC - Should build filter for YYYY-MM given date - Monthly', () => {
    //given
    req.query.dateAfter = '2020-07';
    req.query.dateBefore = '2020-07';
    req.query.dateGroupPattern = 'YYYY-MM';

    //test
    buildRangeDateFilter(req, args, aggregatorFilter);

    expect(aggregatorFilter.$match.$expr.$and.length > 0).toBe(true);
    expect(moment(args.date.$gte).format(dateFormat).toString()).toBe('2020-07-01 00:00:00');
    expect(moment(args.date.$lte).format(dateFormat).toString()).toBe('2020-08-01 00:00:00');
  });

  test('UNIT_ROUTER_METRIC - Should build filter for YYYY-MM-DD given date - Daily', () => {
    //given
    req.query.dateAfter = '2020-07-01';
    req.query.dateBefore = '2020-07-01';
    req.query.dateGroupPattern = 'YYYY-MM-DD';

    //test
    buildRangeDateFilter(req, args, aggregatorFilter);

    expect(aggregatorFilter.$match.$expr.$and.length > 0).toBe(true);
    expect(moment(args.date.$gte).format(dateFormat).toString()).toBe('2020-07-01 00:00:00');
    expect(moment(args.date.$lte).format(dateFormat).toString()).toBe('2020-07-02 00:00:00');
  });

  test('UNIT_ROUTER_METRIC - Should build filter for YYYY-MM-DD HH given date - Hourly', () => {
    //given
    req.query.dateAfter = '2020-07-01 10';
    req.query.dateBefore = '2020-07-01 10';
    req.query.dateGroupPattern = 'YYYY-MM-DD HH';

    //test
    buildRangeDateFilter(req, args, aggregatorFilter);

    expect(aggregatorFilter.$match.$expr.$and.length > 0).toBe(true);
    expect(moment(args.date.$gte).format(dateFormat).toString()).toBe('2020-07-01 10:00:00');
    expect(moment(args.date.$lte).format(dateFormat).toString()).toBe('2020-07-01 11:00:00');
  });

  test('UNIT_ROUTER_METRIC - Should build filter for YYYY-MM-DD HH:mm given date - Timely (minute)', () => {
    //given
    req.query.dateAfter = '2020-07-01 10:30';
    req.query.dateBefore = '2020-07-01 10:30';
    req.query.dateGroupPattern = 'YYYY-MM-DD HH:mm';

    //test
    buildRangeDateFilter(req, args, aggregatorFilter);

    expect(aggregatorFilter.$match.$expr.$and.length > 0).toBe(true);
    expect(moment(args.date.$gte).format(dateFormat).toString()).toBe('2020-07-01 10:30:00');
    expect(moment(args.date.$lte).format(dateFormat).toString()).toBe('2020-07-01 10:31:00');
  });

});