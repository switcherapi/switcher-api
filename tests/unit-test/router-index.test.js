import mongoose from 'mongoose';
import app from '../../src/app';
import { groupCount, groupByDate } from '../../src/routers/common/index';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

describe('Success tests', () => {

    const documentArray = ['DOC1', 'DOC1', 'DOC1', 'DOC2', 'DOC2', 'DOC3']
    const metricDocumentSnapshot = [
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object], [Object] ],
          result: false,
          reason: "Strategy 'NETWORK_VALIDATION' does not agree",
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-04T04:15:04.591Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object] ],
          result: true,
          reason: 'Success',
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-04T04:16:21.738Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object] ],
          result: false,
          reason: "Strategy 'NETWORK_VALIDATION' does not agree",
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-04T04:16:39.828Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object] ],
          result: true,
          reason: 'Success',
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-04T04:17:01.830Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object], [Object] ],
          result: true,
          reason: 'Success',
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-06T06:32:43.380Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object], [Object] ],
          result: false,
          reason: 'Config disabled',
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-06T06:33:04.234Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object], [Object] ],
          result: false,
          reason: 'Config disabled',
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-06T06:33:35.187Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object], [Object] ],
          result: false,
          reason: 'Config disabled',
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-06T06:34:26.840Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object], [Object] ],
          result: false,
          reason: 'Config disabled',
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-06T06:34:46.053Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object], [Object] ],
          result: false,
          reason: 'Config disabled',
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-06T06:34:48.303Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object], [Object] ],
          result: false,
          reason: 'Config disabled',
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-06T06:34:49.489Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object], [Object] ],
          result: false,
          reason: 'Config disabled',
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-06T06:34:50.567Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object], [Object] ],
          result: true,
          reason: 'Success',
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-06T06:35:07.857Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object], [Object] ],
          result: true,
          reason: 'Success',
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-06T06:35:09.697Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object], [Object] ],
          result: false,
          reason: 'Group disabled',
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-06T06:49:19.605Z'
        },
        {
          config: { key: 'FEATURE2020' },
          component: 'Android',
          entry: [ [Object], [Object] ],
          result: false,
          reason: 'Domain disabled',
          group: 'Project 2',
          environment: 'default',
          date: '2020-02-06T06:50:10.313Z'
        }
    ]

    test('UNIT_ROUTER_INDEX - Should group items from an array', () => {
        const resut = groupCount(documentArray, 'name')
        expect(resut).toMatchObject([
            { name: 'DOC1', total: 3 },
            { name: 'DOC2', total: 2 },
            { name: 'DOC3', total: 1 }
        ])
    })

    test('UNIT_ROUTER_INDEX - Should group items from the metric results by Switcher', () => {
        const result = groupByDate(metricDocumentSnapshot, ['config', 'key'], 'FEATURE2020', 'YYYY-MM-DD HH:mm');
        expect(result).toMatchObject([
            { date: '2020-02-03 20:15', positive: 0, negative: 1 },
            { date: '2020-02-03 20:16', positive: 1, negative: 1 },
            { date: '2020-02-03 20:17', positive: 1, negative: 0 },
            { date: '2020-02-05 22:32', positive: 1, negative: 0 },
            { date: '2020-02-05 22:33', positive: 0, negative: 2 },
            { date: '2020-02-05 22:34', positive: 0, negative: 5 },
            { date: '2020-02-05 22:35', positive: 2, negative: 0 },
            { date: '2020-02-05 22:49', positive: 0, negative: 1 },
            { date: '2020-02-05 22:50', positive: 0, negative: 1 }
        ])
    })

    test('UNIT_ROUTER_INDEX - Should group items from the metric results by Component', () => {
        const result = groupByDate(metricDocumentSnapshot, ['component'], 'Android', 'YYYY-MM-DD HH:mm');
        expect(result).toMatchObject([
            { date: '2020-02-03 20:15', positive: 0, negative: 1 },
            { date: '2020-02-03 20:16', positive: 1, negative: 1 },
            { date: '2020-02-03 20:17', positive: 1, negative: 0 },
            { date: '2020-02-05 22:32', positive: 1, negative: 0 },
            { date: '2020-02-05 22:33', positive: 0, negative: 2 },
            { date: '2020-02-05 22:34', positive: 0, negative: 5 },
            { date: '2020-02-05 22:35', positive: 2, negative: 0 },
            { date: '2020-02-05 22:49', positive: 0, negative: 1 },
            { date: '2020-02-05 22:50', positive: 0, negative: 1 }
        ])
    })
})