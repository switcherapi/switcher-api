import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import Admin from '../src/models/admin';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import { Config } from '../src/models/config';
import History from '../src/models/history';
import { EnvType } from '../src/models/environment';
import { ConfigStrategy } from '../src/models/config-strategy';
import { 
    setupDatabase,
    adminMasterAccountId,
    adminMasterAccountToken,
    domainId,
    groupConfigId,
    configId1,
    config1Document,
    configId2,
    configStrategyId
} from './fixtures/db_api';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing configuration insertion', () => {
    beforeAll(setupDatabase);

    test('CONFIG_SUITE - Should create a new Config', async () => {
        let response = await request(app)
            .post('/config/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                key: 'NEW_CONFIG',
                description: 'Description of my new Config',
                group: groupConfigId
            }).expect(201);

        // DB validation - document created
        const config = await Config.findById(response.body._id).lean();
        expect(config).not.toBeNull();

        // Response validation
        expect(response.body.key).toBe('NEW_CONFIG');

        // Should not create duplicated
        response = await request(app)
            .post('/config/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                key: 'NEW_CONFIG',
                description: 'Description of my new Config',
                group: groupConfigId
            }).expect(400);

        expect(response.body.error).toBe('Config NEW_CONFIG already exist');
    });

    test('CONFIG_SUITE - Should NOT create a new Config - with wrong group config Id', async () => {
        const response = await request(app)
            .post('/config/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                key: 'NEW_CONFIG',
                description: 'Description of my new Config',
                group: new mongoose.Types.ObjectId()
            }).expect(404);

        expect(response.body.error).toBe('Group Config not found');

        await request(app)
            .post('/config/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                key: 'NEW_CONFIG',
                description: 'Description of my new Config',
                group: 'INVALID_VALUE_ID'
            }).expect(422);
    });
});

describe('Testing fetch configuration info', () => {
    beforeAll(setupDatabase);

    test('CONFIG_SUITE - Should get Config information', async () => {
        let response = await request(app)
            .get('/config?group=' + groupConfigId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.length).toEqual(2);

        expect(String(response.body[0]._id)).toEqual(String(config1Document._id));
        expect(response.body[0].key).toEqual(config1Document.key);
        expect(String(response.body[0].owner)).toEqual(String(config1Document.owner));
        expect(response.body[0].activated[EnvType.DEFAULT]).toEqual(config1Document.activated.get(EnvType.DEFAULT));
    });

    test('CONFIG_SUITE - Should get Configs by sorting ascending and descending', async () => {
        // given a config that was sent to the past
        const configKey1 = await Config.findOne({ key: 'TEST_CONFIG_KEY_1' });
        let pastDate = new Date(configKey1.createdAt);
        pastDate.setDate(pastDate.getDate() - 2);
        configKey1.createdAt = pastDate;
        configKey1.updatedBy = adminMasterAccountId;
        await configKey1.save();

        // test descending
        let response = await request(app)
            .get('/config?group=' + groupConfigId + '&sortBy=createdAt:desc')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body[0].key).toEqual('TEST_CONFIG_KEY_2');
        expect(response.body[1].key).toEqual('TEST_CONFIG_KEY_1');

        // test ascending
        response = await request(app)
            .get('/config?group=' + groupConfigId + '&sortBy=createdAt:asc')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body[0].key).toEqual('TEST_CONFIG_KEY_1');
        expect(response.body[1].key).toEqual('TEST_CONFIG_KEY_2');
    });

    test('CONFIG_SUITE - Should NOT get Config information by invalid Group Id', async () => { 
        await request(app)
            .get('/config?group=' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);

        await request(app)
            .get('/config?group=INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('CONFIG_SUITE - Should get Config information by Id', async () => {
        let response = await request(app)
            .get('/config/' + configId1 + '?resolveComponents=true')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(String(response.body._id)).toEqual(String(config1Document._id));
        expect(response.body.key).toEqual(config1Document.key);
        expect(String(response.body.group)).toEqual(String(config1Document.group));
        expect(response.body.activated[EnvType.DEFAULT]).toEqual(config1Document.activated.get(EnvType.DEFAULT));

        // Adding new Config
        response = await request(app)
            .post('/config/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                key: 'NEW_CONFIG456',
                description: 'Description of my new Config',
                group: groupConfigId
            }).expect(201);

        await request(app)
            .get('/config/' + response.body._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);
    });

    test('CONFIG_SUITE - Should not found Config information by Id', async () => {
        await request(app)
            .get('/config/' + 'NOTEXIST')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);

        await request(app)
            .get('/config/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });
});

describe('Testing configuration deletion', () => {
    beforeAll(setupDatabase);

    test('CONFIG_SUITE - Should NOT delete Config - Wrong and bad Id', async () => {
        await request(app)
            .delete('/config/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);

        await request(app)
            .delete('/config/WRONG_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('CONFIG_SUITE - Should delete Config', async () => {
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

        await request(app)
            .delete('/config/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        const admin = await Admin.findById(adminMasterAccountId).lean();
        expect(admin).not.toBeNull();

        // DB validation After - Verify deleted dependencies
        domain = await Domain.findById(domainId).lean();
        expect(domain).not.toBeNull();

        group = await GroupConfig.findById(groupConfigId).lean();
        expect(group).not.toBeNull();

        config1 = await Config.findById(configId1).lean();
        expect(config1).toBeNull();

        config2 = await Config.findById(configId2).lean();
        expect(config2).not.toBeNull();

        configStrategy = await ConfigStrategy.findById(configStrategyId).lean();
        expect(configStrategy).toBeNull();
    });
});

describe('Testing update info', () => {
    beforeAll(setupDatabase);

    test('CONFIG_SUITE - Should update Config info', async () => {

        let config = await Config.findById(configId1).lean();
        expect(config).not.toBeNull();

        await request(app)
            .patch('/config/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                key: 'NEWKEY',
                description: 'New description'
            }).expect(200);
        
        // DB validation - verify flag updated
        config = await Config.findById(configId1).lean();
        expect(config).not.toBeNull();
        expect(config.key).toEqual('NEWKEY');
        expect(config.description).toEqual('New description');

        // Should not update - same key
        const response = await request(app)
            .patch('/config/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({ key: 'NEWKEY' }).expect(400);

        expect(response.body.error).toEqual('Config NEWKEY already exist');
    });

    test('CONFIG_SUITE - Should NOT update Config info', async () => {
        await request(app)
            .patch('/config/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                activated: false,
                owner: 'I_SHOULD_NOT_UPDATE_THIS'
            }).expect(400);

        await request(app)
            .patch('/config/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'New description'
            }).expect(404);

        await request(app)
            .patch('/config/WRONG_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'New description'
            }).expect(422);
    });

    test('CONFIG_SUITE - Should update Config environment status - default', async () => {
        expect(config1Document.activated.get(EnvType.DEFAULT)).toEqual(true);

        const response = await request(app)
            .patch('/config/updateStatus/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(200);

        expect(response.body.activated[EnvType.DEFAULT]).toEqual(false);

        // DB validation - verify status updated
        const config = await Config.findById(configId1).lean();
        expect(config.activated[EnvType.DEFAULT]).toEqual(false);
    });
});

describe('Testing Environment status change', () => {
    beforeAll(setupDatabase);

    test('CONFIG_SUITE - Should update Config environment status - QA', async () => {
        // QA Environment still does not exist
        expect(config1Document.activated.get('QA')).toEqual(undefined);

        // Creating QA Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(201);

        const response = await request(app)
            .patch('/config/updateStatus/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA: true
            }).expect(200);

        expect(response.body.activated['QA']).toEqual(true);

        // DB validation - verify status updated
        let config = await Config.findById(configId1).lean();
        expect(config.activated[EnvType.DEFAULT]).toEqual(true);
        expect(config.activated['QA']).toEqual(true);

        // Inactivating QA. Default environment should stay activated
        await request(app)
            .patch('/config/updateStatus/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA: false
            }).expect(200);

        config = await Config.findById(configId1).lean();
        expect(config.activated[EnvType.DEFAULT]).toEqual(true);
        expect(config.activated['QA']).toEqual(false);
    });

    test('CONFIG_SUITE - Should NOT update Config environment status - Config not fould', async () => {
        await request(app)
            .patch('/config/updateStatus/FAKE_CONFIG')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(422);

        await request(app)
            .patch('/config/updateStatus/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(404);
    });

    test('CONFIG_SUITE - Should NOT update Config environment status - Unknown environment name', async () => {
        const response = await request(app)
            .patch('/config/updateStatus/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                UNKNOWN_ENVIRONMENT: false
            }).expect(400);
            
        expect(response.body.error).toEqual('Invalid updates');
    });

    test('CONFIG_SUITE - Should remove Config environment status', async () => {
        // Creating QA1 Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA1',
                domain: domainId
            }).expect(201);
        
        await request(app)
            .patch('/config/updateStatus/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA1: true
            }).expect(200);

        let config = await Config.findById(configId1).lean();
        expect(config.activated['QA1']).toEqual(true);

        await request(app)
            .patch('/config/removeStatus/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: 'QA1'
            }).expect(200);

        // DB validation - verify status updated
        config = await Config.findById(configId1).lean();
        expect(config.activated['QA1']).toEqual(undefined);
    });

    test('CONFIG_SUITE - Should record changes on history collection', async () => {
        let response = await request(app)
            .post('/config/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                key: 'TEST_HIST_RECORD',
                description: 'Description of my new Config',
                group: groupConfigId
            }).expect(201);
        
        const configId = response.body._id;
        response = await request(app)
                .get('/config/history/' + configId)
                .set('Authorization', `Bearer ${adminMasterAccountToken}`)
                .send().expect(200);
        
        expect(response.body).toEqual([]);

        await request(app)
            .patch('/config/' + configId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'New description'
            }).expect(200);

        response = await request(app)
            .get('/config/history/' + configId + '?sortBy=createdAt:desc')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body).not.toEqual([]);

        // DB validation
        let history = await History.find({ elementId: configId }).lean();
        expect(history[0].oldValue['description']).toEqual('Description of my new Config');
        expect(history[0].newValue['description']).toEqual('New description');

        await request(app)
            .patch('/config/updateStatus/' + configId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(200);
        
        // DB validation
        history = await History.find({ elementId: configId }).lean();
        expect(history.length).toEqual(2);
    });

    test('CONFIG_SUITE - Should NOT list changes by invalid Config Id', async () => {
        await request(app)
            .get('/config/history/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);

        await request(app)
            .get('/config/history/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('CONFIG_SUITE - Should NOT delete history by invalid Config Id', async () => {
        await request(app)
            .delete('/config/history/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);

        await request(app)
            .delete('/config/history/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('CONFIG_SUITE - Should delete history from a Config element', async () => {
        let history = await History.find({ elementId: configId1 }).lean();
        expect(history.length > 0).toEqual(true);

        await request(app)
            .delete('/config/history/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        history = await History.find({ elementId: configId1 }).lean();
        expect(history.length > 0).toEqual(false);
    });

    test('CONFIG_SUITE - Should NOT remove Config environment status', async () => {
        // Creating QA3 Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA3',
                domain: domainId
            }).expect(201);

        await request(app)
            .patch('/config/updateStatus/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA3: true
            }).expect(200);

        // default environment cannot be removed
        await request(app)
            .patch('/config/removeStatus/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: EnvType.DEFAULT
            }).expect(400);

        // Invalid config Id
        await request(app)
            .patch('/config/removeStatus/FAKE_CONFIG')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: 'QA3'
            }).expect(422);

        // Config does not exist
        await request(app)
            .patch('/config/removeStatus/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: 'QA3'
            }).expect(404);

        const config = await Config.findById(configId1).lean();
        expect(config.activated[EnvType.DEFAULT]).toEqual(true);
        expect(config.activated['QA3']).toEqual(true);
    });
});

describe('Testing component association', () => {
    beforeAll(async () => {
        await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'my-web-app-for-my-config',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(201);
    });

    test('CONFIG_SUITE - Should associate component to a config', async () => {
        const responseComponent = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'NewComponent',
                description: 'Description of my component',
                domain: domainId
            }).expect(201);

        await request(app)
            .patch('/config/addComponent/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                component: responseComponent.body.component._id
            }).expect(200);

        // DB validation - document updated
        const config = await Config.findById(configId1);
        expect(config.components.includes(responseComponent.body.component._id)).toBe(true);
    });

    test('CONFIG_SUITE - Should associate multiple components to a config', async () => {
        const responseComponent1 = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'NewComponent1',
                description: 'Description of my component 1',
                domain: domainId
            }).expect(201);

        const responseComponent2 = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'NewComponent2',
                description: 'Description of my component 2',
                domain: domainId
            }).expect(201);

        await request(app)
            .patch('/config/updateComponents/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                components: [
                    responseComponent1.body.component._id,
                    responseComponent2.body.component._id
                ]
            }).expect(200);

        // DB validation - document updated
        const config = await Config.findById(configId1).lean();
        expect(config.components.length >= 2).toBe(true);
    });

    test('CONFIG_SUITE - Should NOT associate multiple components to a config - One does not exist', async () => {
        const responseComponent1 = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'LonelyComponent',
                description: 'Description of my component',
                domain: domainId
            }).expect(201);

        const responseUpdate = await request(app)
            .patch('/config/updateComponents/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                components: [
                    responseComponent1.body._id,
                    new mongoose.Types.ObjectId()
                ]
            }).expect(404);

        expect(responseUpdate.body.error).toEqual('One or more component was not found');
    });

    test('CONFIG_SUITE - Should NOT associate multiple components to a config - Wrong Config Id', async () => {
        await request(app)
            .patch('/config/updateComponents/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                components: [ new mongoose.Types.ObjectId() ]
            }).expect(404);
    });

    test('CONFIG_SUITE - Should NOT associate component to a config - Component not found', async () => {
        const response = await request(app)
            .patch('/config/addComponent/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                component: new mongoose.Types.ObjectId()
            }).expect(404);
        
        expect(response.body.error).toBe('Component not found');
    });

    test('CONFIG_SUITE - Should NOT associate component to a config - Component already exists', async () => {
        const responseComponent = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'NewComponent-Added-2x',
                description: 'Description of my component',
                domain: domainId
            }).expect(201);

        await request(app)
            .patch('/config/addComponent/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                component: responseComponent.body.component._id
            }).expect(200);

        const responseAdd = await request(app)
            .patch('/config/addComponent/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                component: responseComponent.body.component._id
            }).expect(400);
        
        expect(responseAdd.body.error).toBe('Component NewComponent-Added-2x already exists');
    });

    test('CONFIG_SUITE - Should NOT associate component to a config - Config not found', async () => {
        await request(app)
            .patch('/config/addComponent/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                component: new mongoose.Types.ObjectId()
            }).expect(422);

        await request(app)
            .patch('/config/addComponent/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                component: new mongoose.Types.ObjectId()
            }).expect(404);
    });

    test('CONFIG_SUITE - Should NOT desassociate component from a config - Component not found', async () => {
        await request(app)
            .patch('/config/removeComponent/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                component: new mongoose.Types.ObjectId()
            }).expect(404);
    });

    test('CONFIG_SUITE - Should NOT desassociate component from a config - Config not found', async () => {
        await request(app)
            .patch('/config/removeComponent/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                component: new mongoose.Types.ObjectId()
            }).expect(422);

        await request(app)
            .patch('/config/removeComponent/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                component: new mongoose.Types.ObjectId()
            }).expect(404);
    });

    test('CONFIG_SUITE - Should desassociate component from a config', async () => {
        const responseComponent = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'Will_be_removed_later',
                description: 'Will be removed later',
                domain: domainId
            }).expect(201);

        await request(app)
            .patch('/config/addComponent/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                component: responseComponent.body.component._id
            }).expect(200);

        await request(app)
            .patch('/config/removeComponent/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                component: responseComponent.body.component._id
            }).expect(200);

        // DB validation - document updated
        const config = await Config.findById(configId1).lean();
        expect(config.components.includes(responseComponent.body.component._id)).toEqual(false);
    });

    test('CONFIG_SUITE - Should remove records from history after deleting element', async () => {
        let history = await History.find({ elementId: configId1 }).lean();
        expect(history.length > 0).toEqual(true);
        await request(app)
            .delete('/config/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        history = await History.find({ elementId: configId1 });
        expect(history.length).toEqual(0);
    });
});

describe('Testing relay association', () => {
    beforeAll(setupDatabase);

    const bodyRelayProd = {
        type: 'VALIDATION',
        description: 'Validate input via external API',
        activated: {
            default: true
        },
        endpoint: {
            default: 'http://localhost:3001'
        },
        method: 'GET',
        auth_prefix: 'Bearer',
        auth_token: {
            default: '123'
        }
    };

    test('CONFIG_SUITE - Should configure new Relay', async () => {
        await request(app)
            .patch(`/config/updateRelay/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelayProd).expect(200);

        // DB validation - document updated
        const config = await Config.findById(configId1).lean();
        expect(config.relay.activated['default']).toEqual(true);
        expect(config.relay.endpoint['default']).toBe('http://localhost:3001');
        expect(config.relay.auth_token['default']).toEqual('123');
    });

    test('CONFIG_SUITE - Should NOT configure new Relay - Config not found', async () => {
        await request(app)
            .patch(`/config/updateRelay/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelayProd).expect(404);
    });

    test('CONFIG_SUITE - Should NOT configure new Relay - Environment does not exist', async () => {
        const response = await request(app)
            .patch(`/config/updateRelay/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                type: 'VALIDATION',
                description: 'Validate input via external API',
                activated: {
                    DOES_NOT_EXIST: true
                },
                endpoint: {
                    DOES_NOT_EXIST: 'http://localhost:3001'
                },
                method: 'GET'
            }).expect(400);
        
        expect(response.body.error).toBe('Invalid updates');
    });

    test('CONFIG_SUITE - Should NOT configure new Relay - Invalid TYPE', async () => {
        await request(app)
            .patch(`/config/updateRelay/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                type: 'INVALID_TYPE',
                description: 'Validate input via external API',
                activated: {
                    default: true
                },
                endpoint: {
                    default: 'http://localhost:3001'
                },
                method: 'GET'
            }).expect(400);
    });

    test('CONFIG_SUITE - Should NOT configure new Relay - Invalid METHOD', async () => {
        await request(app)
            .patch(`/config/updateRelay/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                type: 'NOTIFICATION',
                description: 'Notify external API',
                activated: {
                    default: true
                },
                endpoint: {
                    default: 'http://localhost:3001'
                },
                method: 'PATCH'
            }).expect(400);
    });

    test('CONFIG_SUITE - Should configure new Relay on new envrironment', async () => {
        //given
        // Creating development Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'development',
                domain: domainId
            }).expect(201);

        //test
        await request(app)
            .patch(`/config/updateRelay/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                activated: {
                    development: true
                },
                endpoint: {
                    development: 'http://localhost:7000'
                },
                auth_token: {
                    development: 'abcd'
                }
            }).expect(200);

        // DB validation - document updated
        const config = await Config.findById(configId1).lean();
        expect(config.relay.type).toEqual('VALIDATION');
        expect(config.relay.activated['default']).toEqual(true);
        expect(config.relay.endpoint['default']).toBe('http://localhost:3001');
        expect(config.relay.auth_token['default']).toEqual('123');
        expect(config.relay.activated['development']).toEqual(true);
        expect(config.relay.endpoint['development']).toBe('http://localhost:7000');
        expect(config.relay.auth_token['development']).toEqual('abcd');
    });

    test('CONFIG_SUITE - Should remove configured Relay when reseting environment', async () => {
        //test
        await request(app)
            .patch('/config/removeStatus/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: 'development'
            }).expect(200);

        // DB validation - document updated
        const config = await Config.findById(configId1).lean();
        expect(config.relay.type).toEqual('VALIDATION');
        expect(config.relay.activated['default']).toEqual(true);
        expect(config.relay.endpoint['default']).toBe('http://localhost:3001');
        expect(config.relay.auth_token['default']).toEqual('123');
        expect(config.relay.activated['development']).toBe(undefined);
        expect(config.relay.endpoint['development']).toBe(undefined);
        expect(config.relay.auth_token['development']).toBe(undefined);
    });

    test('CONFIG_SUITE - Should remove Relay from an environment', async () => {
        //given - adding development relay to be removed later on
        await request(app)
            .patch(`/config/updateRelay/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                activated: {
                    development: true
                },
                endpoint: {
                    development: 'http://localhost:7000'
                },
                auth_token: {
                    development: 'abcd'
                }
            }).expect(200);

        // DB validation - document updated
        let config = await Config.findById(configId1).lean();
        expect(config.relay.activated['development']).toEqual(true);
        expect(config.relay.endpoint['development']).toBe('http://localhost:7000');
        expect(config.relay.auth_token['development']).toEqual('abcd');

        //test
        await request(app)
            .patch(`/config/removeRelay/${configId1}/development`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);
        
        config = await Config.findById(configId1).lean();
        expect(config.relay.activated['development']).toBe(undefined);
        expect(config.relay.endpoint['development']).toBe(undefined);
        expect(config.relay.auth_token['development']).toBe(undefined);
    });

    test('CONFIG_SUITE - Should NOT remove Relays - Config not found', async () => {
        await request(app)
            .patch(`/config/removeRelay/${new mongoose.Types.ObjectId()}/default`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('CONFIG_SUITE - Should remove all Relays', async () => {
        await request(app)
            .patch(`/config/removeRelay/${configId1}/default`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);
        
        const config = await Config.findById(configId1).lean();
        expect(config.relay).toEqual({});
    });

    test('CONFIG_SUITE - Should get Relay specs', async () => {
        const response = await request(app)
            .get('/config/spec/relay')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);
        
        expect(response.body).toMatchObject({ methods: [ 'POST', 'GET' ], types: [ 'VALIDATION', 'NOTIFICATION' ] });
    });

});

describe('Testing disable metrics', () => {

    test('CONFIG_SUITE - Should disable metrics for production environment', async () => {
        await request(app)
            .patch(`/config/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                disable_metrics: {
                    default: true
                }
            }).expect(200);

        // DB validation - document updated
        const config = await Config.findById(configId1).lean();
        expect(config.disable_metrics['default']).toEqual(true);
    });

    test('CONFIG_SUITE - Should NOT disable metrics for an unknown environment', async () => {
        const response = await request(app)
            .patch(`/config/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                disable_metrics: {
                    unknown: true
                }
            }).expect(400);

        expect(response.body.error).toEqual('Invalid updates');
    });

    test('CONFIG_SUITE - Should reset disabled metric flag when reseting environment', async () => {
        //given
        await request(app)
            .patch(`/config/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                disable_metrics: {
                    development: true
                }
            }).expect(200);

        // DB validation - document updated
        let config = await Config.findById(configId1).lean();
        expect(config.disable_metrics['development']).toEqual(true);

        //test
        await request(app)
            .patch('/config/removeStatus/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: 'development'
            }).expect(200);

        // DB validation - document updated
        config = await Config.findById(configId1).lean();
        expect(config.disable_metrics['development']).toEqual(undefined);
    });

});