import mongoose from 'mongoose';
import request from 'supertest';
import moment from 'moment';
import app from '../src/app';
import {
    setupDatabase,
    adminMasterAccountToken,
    domainId,
    configId1
} from './fixtures/db_metrics';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

describe('Fetch metrics', () => {
    beforeAll(setupDatabase)

    test('METRIC_SUITE - Should fetch all records from a specific Domain', async () => {
        const response = await request(app)
            .get('/metric/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        // Response validation
        expect(response.body).not.toBeNull()
    })

    test('METRIC_SUITE - Should NOT fetch records from a unknown Domain - Not Domain Id', async () => {
        const response = await request(app)
            .get('/metric/UNKNOWN')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422)
    })

    test('METRIC_SUITE - Should fetch records by KEY', async () => {
        const args = `?key=KEY_2`
        const response = await request(app)
            .get('/metric/' + domainId + args)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(e.config.key).toEqual('KEY_2')
        })
    })

    test('METRIC_SUITE - Should fetch records by Environment', async () => {
        const args = `?environment=QA`
        const response = await request(app)
            .get('/metric/' + domainId + args)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(e.config.key).toEqual('KEY_2')
        })
    })

    test('METRIC_SUITE - Should NOT fetch records by unknown KEY', async () => {
        const args = `?key=UNKNOWN_KEY_2`
        const response = await request(app)
            .get('/metric/' + domainId + args)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body).toEqual({})
    })

    test('METRIC_SUITE - Should fetch records by COMPONENT', async () => {
        const args = `?component=Component 1`
        const response = await request(app)
            .get('/metric/' + domainId + args)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(e.component).toEqual('Component 1')
        })
    })

    test('METRIC_SUITE - Should fetch records by RESULT', async () => {
        const args = `?result=true`
        const response = await request(app)
            .get('/metric/' + domainId + args)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(e.result).toEqual(true)
        })
    })

    test('METRIC_SUITE - Should fetch records by GROUP', async () => {
        const args = `?group=GROUP 1`
        const response = await request(app)
            .get('/metric/' + domainId + args)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(e.group).toEqual('GROUP 1')
        })
    })

    test('METRIC_SUITE - Should fetch records by DATE AFTER', async () => {
        const args = `?dateAfter=2019-12-14 17:30:00`
        const response = await request(app)
            .get('/metric/' + domainId + args)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(moment(e.date).isSameOrAfter('2019-12-14 17:30:00')).toEqual(true)
        })
    })

    test('METRIC_SUITE - Should fetch records by DATE BEFORE', async () => {
        const args = `?dateBefore=2019-12-14 17:30:00`
        const response = await request(app)
            .get('/metric/' + domainId + args)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(moment(e.date).isSameOrBefore('2019-12-14 17:30:00')).toEqual(true)
        })
    })

    test('METRIC_SUITE - Should fetch records by DATE AFTER/BEFORE', async () => {
        const args = `?dateAfter=2019-12-14 16:00:00&dateBefore=2019-12-14 17:30:00`
        const response = await request(app)
            .get('/metric/' + domainId + args)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(moment(e.date).isSameOrBefore('2019-12-14 17:00:00')).toEqual(true)
        })
    })

    test('METRIC_SUITE - Should fetch records with limit of 1', async () => {
        const args = `?limit=1`
        const response = await request(app)
            .get('/metric/' + domainId + args)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(response.body.data.length).toEqual(1)
        })
    })

    test('METRIC_SUITE - Should fetch records skiping', async () => {
        const responseCount = await request(app)
            .get('/metric/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        // Response validation
        expect(responseCount.body.data).not.toBeNull()
        const count = responseCount.body.data.length

        const args = `?skip=1`
        const response = await request(app)
            .get('/metric/' + domainId + args)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(response.body.data.length).toEqual(count-1)
        })
    })

})

describe('Delete metrics', () => {
    beforeAll(setupDatabase)

    test('METRIC_SUITE - Should NOT delete metrics - Not found ID', async () => {
        await request(app)
            .delete('/metric/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)
    })

    test('METRIC_SUITE - Should NOT delete metrics - Invalid ID', async () => {
        await request(app)
            .delete('/metric/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(500)
    })

    test('METRIC_SUITE - Should delete metrics', async () => {
        const args = `?key=KEY_1`
        let response = await request(app)
            .get('/metric/' + domainId + args)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).not.toBeNull()
        response.body.data.forEach(e => {
            expect(e.config.key).toEqual('KEY_1')
        })

        await request(app)
            .delete('/metric/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        response = await request(app)
            .get('/metric/' + domainId + args)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
            
        // Response validation
        expect(response.body.data).toEqual([])
    })

})
