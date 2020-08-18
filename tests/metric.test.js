import mongoose from 'mongoose';
import request from 'supertest';
import moment from 'moment';
import app from '../src/app';
import {
    setupDatabase,
    adminMasterAccountToken,
    domainId,
    configId1,
    config1Document,
    adminAccountToken
} from './fixtures/db_metrics';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})
describe('Fetch overall statistics', () => {
    beforeAll(setupDatabase)

    test('METRIC_SUITE - Should return statistics from a given Domain', async () => {
        const response = await request(app)
            .get(`/metric/statistics?domainid=${domainId}&statistics=all`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        // Response validation
        expect(response.body).not.toBeNull();
    })

    test('METRIC_SUITE - Should return only switcher statistics from a given Domain', async () => {
        const response = await request(app)
            .get(`/metric/statistics?domainid=${domainId}&statistics=switchers`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        // Response validation
        expect(response.body).not.toBeNull();
        expect(response.body?.switchers.length > 0).toEqual(true);
        expect(response.body?.components).toEqual(undefined);
        expect(response.body?.reasons).toEqual(undefined);
    })

    test('METRIC_SUITE - Should return only component statistics from a given Domain', async () => {
        const response = await request(app)
            .get(`/metric/statistics?domainid=${domainId}&statistics=components`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        // Response validation
        expect(response.body).not.toBeNull();
        expect(response.body?.components.length > 0).toEqual(true);
        expect(response.body?.switchers).toEqual(undefined);
        expect(response.body?.reasons).toEqual(undefined);
    })

    test('METRIC_SUITE - Should return statistics filtered by Switcher KEY', async () => {
        const response = await request(app)
            .get(`/metric/statistics?domainid=${domainId}&key=KEY_1&statistics=all`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        // Response validation
        expect(response.body).not.toBeNull();
        expect(response.body.switchers[0].switcher).toEqual('KEY_1');
    })

    test('METRIC_SUITE - Should return statistics filtered by Result', async () => {
        const response = await request(app)
            .get(`/metric/statistics?domainid=${domainId}&statistics=all&result=true`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        // Response validation
        expect(response.body).not.toBeNull();
        expect(response.body.switchers[0].negative).toEqual(0);
        expect(response.body.switchers[0].positive).toEqual(1);
    })

    test('METRIC_SUITE - Should NOT return statistics filtered unknown Switcher KEY', async () => {
        const response = await request(app)
            .get(`/metric/statistics?domainid=${domainId}&key=UNKNOWN&statistics=all`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        // Response validation
        expect(response.body).not.toBeNull();
        expect(response.body).toEqual({});
    })

    test('METRIC_SUITE - Should NOT return statistics when no Domain is provided', async () => {
        await request(app)
            .get(`/metric/statistics?statistics=all`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    })
})

describe('Fetch metrics', () => {
    beforeAll(setupDatabase)

    test('METRIC_SUITE - Should fetch all records from a specific Domain', async () => {
        const response = await request(app)
            .get(`/metric/data?domainid=${domainId}&page=1`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        // Response validation
        expect(response.body).not.toBeNull()
    })

    test('METRIC_SUITE - Should NOT fetch records from a unknown Domain - Not Domain Id', async () => {
        const response = await request(app)
            .get('/metric/data?domainid=UNKNOWN&page=1')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422)
    })

    test('METRIC_SUITE - Should NOT fetch records - Invalid attribute for page', async () => {
        const response = await request(app)
            .get(`/metric/data?domainid=${domainId}&page=test`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(500)
    })

    test('METRIC_SUITE - Should fetch records by KEY', async () => {
        const args = `&page=1&key=KEY_2`
        const response = await request(app)
            .get(`/metric/data?domainid=${domainId}${args}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(e.config.key).toEqual('KEY_2')
        })
    })

    test('METRIC_SUITE - Should fetch records by Environment', async () => {
        const args = `&page=1&environment=QA`
        const response = await request(app)
            .get(`/metric/data?domainid=${domainId}${args}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(e.config.key).toEqual('KEY_2')
        })
    })

    test('METRIC_SUITE - Should NOT fetch records by unknown KEY', async () => {
        const args = `&page=1&key=UNKNOWN_KEY_2`
        const response = await request(app)
            .get(`/metric/data?domainid=${domainId}${args}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body).toEqual({})
    })

    test('METRIC_SUITE - Should fetch records by COMPONENT', async () => {
        const args = `&page=1&component=Component 1`
        const response = await request(app)
            .get(`/metric/data?domainid=${domainId}${args}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(e.component).toEqual('Component 1')
        })
    })

    test('METRIC_SUITE - Should fetch records by RESULT', async () => {
        const args = `&page=1&result=true`
        const response = await request(app)
            .get(`/metric/data?domainid=${domainId}${args}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(e.result).toEqual(true)
        })
    })

    test('METRIC_SUITE - Should fetch records by GROUP', async () => {
        const args = `&page=1&group=GROUP 1`
        const response = await request(app)
            .get(`/metric/data?domainid=${domainId}${args}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(e.group).toEqual('GROUP 1')
        })
    })

    test('METRIC_SUITE - Should fetch records by DATE AFTER', async () => {
        const args = `&page=1&dateAfter=2019-12-14 17:30:00`
        const response = await request(app)
            .get(`/metric/data?domainid=${domainId}${args}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(moment(e.date).isSameOrAfter('2019-12-14 17:30:00')).toEqual(true)
        })
    })

    test('METRIC_SUITE - Should fetch records by DATE BEFORE', async () => {
        const args = `&page=1&dateBefore=2019-12-14 17:30:00`
        const response = await request(app)
            .get(`/metric/data?domainid=${domainId}${args}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(moment(e.date).isSameOrBefore('2019-12-14 17:30:00')).toEqual(true)
        })
    })

    test('METRIC_SUITE - Should fetch records by DATE AFTER/BEFORE', async () => {
        const args = `&page=1&dateAfter=2019-12-14 16:00:00&dateBefore=2019-12-14 17:30:00`
        const response = await request(app)
            .get(`/metric/data?domainid=${domainId}${args}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(moment(e.date).isSameOrBefore('2019-12-14 17:00:00')).toEqual(true)
        })
    })

})

describe('Delete metrics', () => {
    beforeAll(setupDatabase)

    test('METRIC_SUITE - Should NOT delete metrics - Invalid ID', async () => {
        await request(app)
            .delete(`/metric?domainid=${domainId}&key=INVALID_ID`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)
    })

    test('METRIC_SUITE - Should NOT delete metrics - Domain ID not provided', async () => {
        await request(app)
            .delete(`/metric?key=INVALID_ID`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422)
    })

    test('METRIC_SUITE - Should NOT delete metrics - Permission denied', async () => {
        await request(app)
            .delete(`/metric?domainid=${domainId}&key=KEY_1`)
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send().expect(401)
    })

    test('METRIC_SUITE - Should delete metrics', async () => {
        const args = `&page=1&key=KEY_1`
        let response = await request(app)
            .get(`/metric/data?domainid=${domainId}${args}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(e.config.key).toEqual('KEY_1')
        })

        await request(app)
            .delete(`/metric?domainid=${domainId}&key=${config1Document.key}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        response = await request(app)
            .get(`/metric/data?domainid=${domainId}${args}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).toEqual([])
    })

})
