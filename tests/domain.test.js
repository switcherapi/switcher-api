import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import Admin from '../src/models/admin';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import { Config } from '../src/models/config';
import History from '../src/models/history';
import { ConfigStrategy } from '../src/models/config-strategy';
import { EnvType, Environment } from '../src/models/environment';
import { 
    setupDatabase,
    adminMasterAccountId,
    adminMasterAccountToken,
    adminMasterAccount,
    adminAccountToken,
    domainDocument,
    domainId,
    groupConfigId,
    configId1,
    configId2,
    configStrategyId,
    environment1Id,
    adminAccountId,
    component1Id,
    teamId
} from './fixtures/db_api';
import Component from '../src/models/component';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing Domain insertion', () => {
    beforeAll(setupDatabase);

    test('DOMAIN_SUITE - Should create a new Domain', async () => {
        const response = await request(app)
            .post('/domain/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'New Domain',
                description: 'Description of my new Domain'
            }).expect(201);

        // DB validation - document created
        const domain = await Domain.findById(response.body._id).lean();
        expect(domain).not.toBeNull();

        // Response validation
        expect(response.body.name).toBe('New Domain');
    });

    test('DOMAIN_SUITE - Should NOT create a new Domain - Missing required params', async () => {
        await request(app)
            .post('/domain/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Domain'
            }).expect(422);
    });

    test('DOMAIN_SUITE - Should NOT create a new Domain - Already exists', async () => {
        const response = await request(app)
            .post('/domain/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'New Domain',
                description: 'Description of my new Domain'
            }).expect(400);

        // Response validation
        expect(response.body.error).toBe('The domain name is already in use.');
    });
});

describe('Testing fetch Domain info', () => {
    beforeAll(setupDatabase);

    test('DOMAIN_SUITE - Should get Domain information', async () => {
        let response = await request(app)
            .get('/domain')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.length).toEqual(1);
        expect(response.body[0].activated[EnvType.DEFAULT]).toEqual(true);
        expect(String(response.body[0]._id)).toEqual(String(domainDocument._id));
        expect(response.body[0].name).toEqual(domainDocument.name);
        expect(String(response.body[0].owner)).toEqual(String(domainDocument.owner));
        expect(response.body[0].admin.name).toBe(adminMasterAccount.name);

        // Adding new Domain
        response = await request(app)
            .post('/domain/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My New Domain',
                description: 'Description of my new Domain'
            }).expect(201);

        // DB validation - document created
        const domain = await Domain.findById(response.body._id).lean();
        expect(domain).not.toBeNull();

        response = await request(app)
            .get('/domain?sortBy=createdAt:desc')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.length).toEqual(2);

        response = await request(app)
            .get('/domain?limit=1')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.length).toEqual(1);
    });

    test('DOMAIN_SUITE - Should read domains in which a user is collaborating', async () => {
        await request(app)
            .patch('/team/member/add/' + teamId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminMasterAccountId
            }).expect(200);
            
        let response = await request(app)
            .get('/domain/collaboration')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send()
            .expect(200);

        expect(response.body.length).toEqual(1);
        expect(response.body[0].name).toEqual(domainDocument.name);
        expect(response.body[0].admin.name).toEqual(adminMasterAccount.name);
    });

    test('DOMAIN_SUITE - Should get Domain information by Id', async () => {
        let response = await request(app)
            .get('/domain/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(String(response.body._id)).toEqual(String(domainDocument._id));
        expect(response.body.name).toEqual(domainDocument.name);
        expect(String(response.body.owner)).toEqual(String(domainDocument.owner));
        expect(response.body.admin.name).toBe(adminMasterAccount.name);
    });

    test('DOMAIN_SUITE - Should NOT return Domain information by Id', async () => {
        await request(app)
            .get('/domain/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);

        await request(app)
            .get(`/domain/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('DOMAIN_SUITE - Should delete Domain', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200);

        // DB validation Before deleting
        let domain = await Domain.findById(domainId).lean();
        expect(domain).not.toBeNull();

        let group = await GroupConfig.findById(groupConfigId).lean();
        expect(group).not.toBeNull();

        let config1 = await Config.findById(configId1).lean();
        expect(config1).not.toBeNull();

        let config2 = await Config.findById(configId2).lean();
        expect(config2).not.toBeNull();

        let configStrategy = await ConfigStrategy.findById(configStrategyId).lean();
        expect(configStrategy).not.toBeNull();

        let environment = await Environment.findById(environment1Id).lean();
        expect(environment).not.toBeNull();

        let component = await Component.findById(component1Id).lean();
        expect(component).not.toBeNull();
        
        await request(app)
            .delete('/domain/' + domainId)
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send().expect(200);

        const admin = await Admin.findById(adminMasterAccountId).lean();
        expect(admin).not.toBeNull();

        // DB validation After - Verify deleted dependencies
        domain = await Domain.findById(domainId).lean();
        expect(domain).toBeNull();

        group = await GroupConfig.findById(groupConfigId).lean();
        expect(group).toBeNull();

        config1 = await Config.findById(configId1).lean();
        expect(config1).toBeNull();

        config2 = await Config.findById(configId2).lean();
        expect(config2).toBeNull();

        configStrategy = await ConfigStrategy.findById(configStrategyId).lean();
        expect(configStrategy).toBeNull();

        environment = await Environment.findById(environment1Id).lean();
        expect(environment).toBeNull();

        component = await Component.findById(component1Id).lean();
        expect(component).toBeNull();
    });

    test('DOMAIN_SUITE - Should NOT delete Domain', async () => {
        let responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200);

        await request(app)
            .delete(`/domain/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send().expect(404);

        await request(app)
            .delete('/domain/INVALID_DOMAIN_ID')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send().expect(422);
    });
});

describe('Testing update Domain info', () => {
    beforeAll(setupDatabase);

    test('DOMAIN_SUITE - Should update Domain info', async () => {
        const oldQuery = await Domain.findById(domainId).select('description').lean();

        let history = await History.find({ elementId: domainId }).lean();
        expect(history.length).toEqual(0);

        await request(app)
            .patch('/domain/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description updated'
            }).expect(200);
        
        // DB validation - verify description updated
        const newQuery = await Domain.findById(domainId).select('description').lean();
        expect(oldQuery).not.toEqual(newQuery);
        expect(newQuery.description).toEqual('Description updated');

        // DB validation - verify history record added
        history = await History.find({ elementId: domainId }).lean();
        expect(history.length > 0).toEqual(true);
    });

    test('DOMAIN_SUITE - Should NOT update Domain info', async () => {
        await request(app)
            .patch('/domain/UNKNOWN_DOMAIN_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description updated'
            }).expect(422);

        await request(app)
            .patch(`/domain/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description updated'
            }).expect(404);
    });

    test('DOMAIN_SUITE - Should NOT update Domain name', async () => {
        await request(app)
            .patch('/domain/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'New Domain name'
            }).expect(400);
    });

    test('DOMAIN_SUITE - Should update Domain environment status - default', async () => {
        expect(domainDocument.activated.get(EnvType.DEFAULT)).toEqual(true);

        const response = await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(200);

        expect(response.body.activated[EnvType.DEFAULT]).toEqual(false);

        // DB validation - verify status updated
        const domain = await Domain.findById(domainId).lean();
        expect(domain.activated[EnvType.DEFAULT]).toEqual(false);
    });

    test('DOMAIN_SUITE - Should NOT update environment status given an unknown Domain ID ', async () => {
        await request(app)
            .patch('/domain/updateStatus/UNKNOWN_DOMAIN_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(422);

        await request(app)
            .patch(`/domain/updateStatus/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(404);
    });

    test('DOMAIN_SUITE - Should NOT update environment status given an unknown environment name', async () => {
        const response = await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                UNKNWON_ENV_NAME: false
            }).expect(400);
        
        expect(response.body.error).toEqual('Invalid updates');
    });

    test('DOMAIN_SUITE - Should NOT read changes on history collection - Invalid Domain Id', async () => {
        await request(app)
            .get('/domain/history/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('DOMAIN_SUITE - Should NOT read changes on history collection - Domain not found', async () => {
        await request(app)
            .get(`/domain/history/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('DOMAIN_SUITE - Should NOT delete history by invalid Domain Id', async () => {
        await request(app)
            .delete(`/domain/history/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);

        await request(app)
            .delete('/domain/history/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('DOMAIN_SUITE - Should delete history from a Domain element', async () => {
        let history = await History.find({ elementId: domainId }).lean();
        expect(history.length > 0).toEqual(true);

        await request(app)
            .delete('/domain/history/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        history = await History.find({ elementId: domainId }).lean();
        expect(history.length > 0).toEqual(false);
    });

    test('DOMAIN_SUITE - Should record changes on history collection', async () => {
        let response = await request(app)
            .post('/domain/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'New Domain Record',
                description: 'Description of my new Domain'
            }).expect(201);
            
        const id = response.body._id;
        response = await request(app)
                .get('/domain/history/' + id)
                .set('Authorization', `Bearer ${adminMasterAccountToken}`)
                .send().expect(200);
        
        expect(response.body).toEqual([]);

        await request(app)
            .patch('/domain/' + id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'New description'
            }).expect(200);

        response = await request(app)
            .get('/domain/history/' + id + '?sortBy=createdAt:desc')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body).not.toEqual([]);

        // DB validation
        let history = await History.find({ elementId: id }).lean();
        expect(history[0].oldValue['description']).toEqual('Description of my new Domain');
        expect(history[0].newValue['description']).toEqual('New description');

        await request(app)
            .patch('/domain/updateStatus/' + id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(200);
        
        // DB validation
        history = await History.find({ elementId: id }).lean();
        expect(history.length).toEqual(2);
    });
});

describe('Testing environment configurations', () => {
    beforeAll(setupDatabase);

    test('DOMAIN_SUITE - Should update Domain environment status - QA', async () => {
        // QA Environment still does not exist
        expect(domainDocument.activated.get('QA')).toEqual(undefined);

        // Creating QA Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(201);

        let history = await History.find({ elementId: domainId }).lean();
        expect(history.length).toEqual(0);

        const response = await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA: true
            }).expect(200);

        expect(response.body.activated['QA']).toEqual(true);

        // DB validation - verify status updated
        let domain = await Domain.findById(domainId).lean();
        expect(domain.activated[EnvType.DEFAULT]).toEqual(true);
        expect(domain.activated['QA']).toEqual(true);

        // DB validation - verify history record added
        history = await History.find({ elementId: domainId }).lean();
        expect(history[0].oldValue['activated/QA']).toEqual('');
        expect(history[0].newValue['activated/QA']).toEqual('true');

        // Inactivating QA. Default environment should stay activated
        await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA: false
            }).expect(200);

        domain = await Domain.findById(domainId).lean();
        expect(domain.activated[EnvType.DEFAULT]).toEqual(true);
        expect(domain.activated['QA']).toEqual(false);
    });

    test('DOMAIN_SUITE - Should remove Domain environment status', async () => {
        // Creating QA Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA1',
                domain: domainId
            }).expect(201);
        
        await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA1: true
            }).expect(200);

        let domain = await Domain.findById(domainId).lean();
        expect(domain.activated['QA1']).toEqual(true);

        await request(app)
            .patch('/domain/removeStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: 'QA1'
            }).expect(200);

        // DB validation - verify status updated
        domain = await Domain.findById(domainId).lean();
        expect(domain.activated['QA1']).toEqual(undefined);
    });

    test('DOMAIN_SUITE - Should NOT remove Domain environment status', async () => {
        // Creating QA3 Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA3',
                domain: domainId
            }).expect(201);

        await request(app)
            .patch(`/domain/updateStatus/${domainId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA3: true
            }).expect(200);

        // default environment cannot be removed
        await request(app)
            .patch(`/domain/removeStatus/${domainId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: EnvType.DEFAULT
            }).expect(400);

        // Invalid Domain Id
        await request(app)
            .patch('/domain/removeStatus/FAKE_DOMAIN')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: 'QA3'
            }).expect(422);

        // Domain does not exist
        await request(app)
            .patch(`/domain/removeStatus/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: 'QA3'
            }).expect(404);

        const domain = await Domain.findById(domainId).lean();
        expect(domain.activated[EnvType.DEFAULT]).toEqual(true);
        expect(domain.activated['QA3']).toEqual(true);
    });
});

describe('Testing transfer Domain', () => {
    beforeAll(setupDatabase);

    test('DOMAIN_SUITE - Should NOT request Domain to transfer - Domain not found', async () => {
        await request(app)
            .patch('/domain/transfer/request')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: new mongoose.Types.ObjectId()
            }).expect(404);
    });

    test('DOMAIN_SUITE - Should NOT request Domain to transfer - Invalid Domain ID', async () => {
        await request(app)
            .patch('/domain/transfer/request')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: 'NOT_VALID_ID'
            }).expect(422);
    });

    test('DOMAIN_SUITE - Should NOT request Domain to transfer - Admin is not owner', async () => {
        await request(app)
            .patch('/domain/transfer/request')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send({
                domain: domainId
            }).expect(404);
    });

    test('DOMAIN_SUITE - Should request/cancel Domain to transfer', async () => {
        await request(app)
            .patch('/domain/transfer/request')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: domainId
            }).expect(200);

        //Verify transfer flag to be true
        let domain = await Domain.findById(domainId).lean();
        expect(domain.transfer).toBe(true);

        //Calling again make it transfer flag to be null
        await request(app)
            .patch('/domain/transfer/request')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: domainId
            }).expect(200);

        //Verify transfer flag to be true
        domain = await Domain.findById(domainId).lean();
        expect(domain.transfer).toBe(null);
    });

    test('DOMAIN_SUITE - Should NOT accept Domain to transfer - Domain not found', async () => {
        await request(app)
            .patch('/domain/transfer/accept')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send({
                domain: new mongoose.Types.ObjectId()
            }).expect(404);
    });

    test('DOMAIN_SUITE - Should NOT accept Domain to transfer - Invalid Domain ID', async () => {
        await request(app)
            .patch('/domain/transfer/accept')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send({
                domain: 'NOT_VALID_ID'
            }).expect(422);
    });

    test('DOMAIN_SUITE - Should NOT accept Domain to transfer - Domain not flagged to be transfered', async () => {
        await request(app)
            .patch('/domain/transfer/accept')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send({
                domain: domainId
            }).expect(404);
    });

    test('DOMAIN_SUITE - Should accept Domain to transfer', async () => {
        //given 'domainId' to be transfered
        await request(app)
            .patch('/domain/transfer/request')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: domainId
            }).expect(200);

        //Verify transfer flag to be true
        let domain = await Domain.findById(domainId).lean();
        expect(domain.transfer).toBe(true);
        expect(domain.owner).toMatchObject(adminMasterAccountId);

        let groups, configs, strategies, environment;
        ({ groups, configs, strategies, environment } = await countDocuments(domain, adminMasterAccountId));

        expect(groups > 0).toBe(true);
        expect(configs > 0).toBe(true);
        expect(strategies > 0).toBe(true);
        expect(environment > 0).toBe(true);

        //test
        await request(app)
            .patch('/domain/transfer/accept')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send({
                domain: domainId
            }).expect(200);

        //Verify if transfer has been done
        domain = await Domain.findById(domainId).lean();
        expect(domain.owner).toMatchObject(adminAccountId);
        
        ({ groups, configs, strategies, environment } = await countDocuments(domain, adminAccountId));

        expect(groups > 0).toBe(true);
        expect(configs > 0).toBe(true);
        expect(strategies > 0).toBe(true);
        expect(environment > 0).toBe(true);
    });
});

async function countDocuments(domain, owner) {
    let groups, configs, strategies, environment;
    await Promise.all([
        GroupConfig.find({ domain: domain._id, owner }).countDocuments(),
        Config.find({ domain: domain._id, owner }).countDocuments(),
        ConfigStrategy.find({ domain: domain._id, owner }).countDocuments(),
        Environment.find({ domain: domain._id, owner }).countDocuments()
    ]).then(data => {
        groups = data[0];
        configs = data[1];
        strategies = data[2];
        environment = data[3];
    });

    return { groups, configs, strategies, environment };
}
