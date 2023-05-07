import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import { Config } from '../src/models/config';
import { 
    setupDatabase,
    adminMasterAccountToken,
    domainId,
    configId1,
} from './fixtures/db_api';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing relay verification', () => {
    beforeAll(async () => {
        await setupDatabase();
        process.env.RELAY_BYPASS_HTTPS = false;
    });

    afterAll(() => {
        process.env.RELAY_BYPASS_HTTPS = true;
    });

    const bodyRelay = {
        type: 'VALIDATION',
        activated: {
            default: true
        },
        endpoint: {
            default: {}
        },
        method: 'POST'
    };

    test('CONFIG_RELAY_SUITE - Should NOT configure new Relay - Not HTTPS', async () => {
        // Given HTTP
        bodyRelay.endpoint.default = 'http://localhost:3001';

        // Test
        const response = await request(app)
            .patch(`/config/updateRelay/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay).expect(400);

        expect(response.body.error).toEqual('HTTPS required');
    });

    test('CONFIG_RELAY_SUITE - Should configure new Relay', async () => {
        // Given HTTPS
        bodyRelay.endpoint.default = 'https://localhost:3001';

        // Test
        await request(app)
            .patch(`/config/updateRelay/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay).expect(200);
    });

    test('CONFIG_RELAY_SUITE - Should configure new Relay - All capital HTTPS', async () => {
        // Given HTTPS
        bodyRelay.endpoint.default = 'HTTPS://localhost:3001';

        // Test
        await request(app)
            .patch(`/config/updateRelay/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay).expect(200);
    });

    test('CONFIG_RELAY_SUITE - Should reset Relay verified flag when changing endpoint', async () => {
        // Given HTTPS
        bodyRelay.endpoint.default = 'https://localhost:3001';

        // New Relay
        await request(app)
            .patch(`/config/updateRelay/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay).expect(200);

        // That
        // Config has a verified Relay
        let config = await Config.findById(configId1).exec();
        config.relay.verified = true;
        config.relay.verification_code = '123';
        await config.save();
        expect(config.relay.verified).toBe(true);

        // Test: change endpoint
        bodyRelay.endpoint.default = 'https://localhost:8080';

        // Update Relay
        await request(app)
            .patch(`/config/updateRelay/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay).expect(200);

        config = await Config.findById(configId1).exec();
        expect(config.relay.verified).toBe(false);
        expect(config.relay.verification_code).toBe(undefined);
    });

    test('CONFIG_RELAY_SUITE - Should NOT reset Relay verified flag when changing anything but endpoint', async () => {
        // Given HTTPS
        bodyRelay.endpoint.default = 'https://localhost:3001';

        // New Relay
        await request(app)
            .patch(`/config/updateRelay/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay).expect(200);

        // That
        // Config has a verified Relay
        let config = await Config.findById(configId1).exec();
        config.relay.verified = true;
        config.relay.verification_code = '123';
        await config.save();
        expect(config.relay.verified).toBe(true);

        // Test: change endpoint
        bodyRelay.method = 'GET';

        // Update Relay
        await request(app)
            .patch(`/config/updateRelay/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay).expect(200);

        config = await Config.findById(configId1).exec();
        expect(config.relay.verified).toBe(true);
        expect(config.relay.verification_code).toBe('123');
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

    test('CONFIG_RELAY_SUITE - Should configure new Relay', async () => {
        await request(app)
            .patch(`/config/updateRelay/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelayProd).expect(200);

        // DB validation - document updated
        const config = await Config.findById(configId1).lean().exec();
        expect(config.relay.verified).toEqual(false);
        expect(config.relay.verification_code).toEqual(undefined);
        expect(config.relay.activated['default']).toEqual(true);
        expect(config.relay.endpoint['default']).toBe('http://localhost:3001');
        expect(config.relay.auth_token['default']).toEqual('123');
    });

    test('CONFIG_RELAY_SUITE - Should NOT configure new Relay - Config not found', async () => {
        await request(app)
            .patch(`/config/updateRelay/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelayProd).expect(404);
    });

    test('CONFIG_RELAY_SUITE - Should NOT configure new Relay - Environment does not exist', async () => {
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

    test('CONFIG_RELAY_SUITE - Should NOT configure new Relay - Invalid TYPE', async () => {
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

    test('CONFIG_RELAY_SUITE - Should NOT configure new Relay - Invalid METHOD', async () => {
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

    test('CONFIG_RELAY_SUITE - Should configure new Relay on new environment', async () => {
        // Given
        // Creating development Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'development',
                domain: domainId
            }).expect(201);

        // Test
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
        const config = await Config.findById(configId1).lean().exec();
        expect(config.relay.type).toEqual('VALIDATION');
        expect(config.relay.activated['default']).toEqual(true);
        expect(config.relay.endpoint['default']).toBe('http://localhost:3001');
        expect(config.relay.auth_token['default']).toEqual('123');
        expect(config.relay.activated['development']).toEqual(true);
        expect(config.relay.endpoint['development']).toBe('http://localhost:7000');
        expect(config.relay.auth_token['development']).toEqual('abcd');
    });

    test('CONFIG_RELAY_SUITE - Should remove configured Relay when reseting environment', async () => {
        // Test
        await request(app)
            .patch('/config/removeStatus/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: 'development'
            }).expect(200);

        // DB validation - document updated
        const config = await Config.findById(configId1).lean().exec();
        expect(config.relay.type).toEqual('VALIDATION');
        expect(config.relay.activated['default']).toEqual(true);
        expect(config.relay.endpoint['default']).toBe('http://localhost:3001');
        expect(config.relay.auth_token['default']).toEqual('123');
        expect(config.relay.activated['development']).toBe(undefined);
        expect(config.relay.endpoint['development']).toBe(undefined);
        expect(config.relay.auth_token['development']).toBe(undefined);
    });

    test('CONFIG_RELAY_SUITE - Should remove Relay from an environment', async () => {
        // Given - adding development relay to be removed later on
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
        let config = await Config.findById(configId1).lean().exec();
        expect(config.relay.activated['development']).toEqual(true);
        expect(config.relay.endpoint['development']).toBe('http://localhost:7000');
        expect(config.relay.auth_token['development']).toEqual('abcd');

        // Test
        await request(app)
            .patch(`/config/removeRelay/${configId1}/development`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);
        
        config = await Config.findById(configId1).lean().exec();
        expect(config.relay.activated['development']).toBe(undefined);
        expect(config.relay.endpoint['development']).toBe(undefined);
        expect(config.relay.auth_token['development']).toBe(undefined);
    });

    test('CONFIG_RELAY_SUITE - Should NOT remove Relays - Config not found', async () => {
        await request(app)
            .patch(`/config/removeRelay/${new mongoose.Types.ObjectId()}/default`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('CONFIG_RELAY_SUITE - Should remove all Relays', async () => {
        await request(app)
            .patch(`/config/removeRelay/${configId1}/default`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);
        
        const config = await Config.findById(configId1).lean().exec();
        expect(config.relay).toEqual({});
    });

    test('CONFIG_RELAY_SUITE - Should get Relay specs', async () => {
        const response = await request(app)
            .get('/config/spec/relay')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);
        
        expect(response.body).toMatchObject({ methods: [ 'POST', 'GET' ], types: [ 'VALIDATION', 'NOTIFICATION' ] });
    });

    test('CONFIG_RELAY_SUITE - Should generate verification code', async () => {
        const response = await request(app)
            .patch(`/config/relay/verificationCode/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.code).not.toBe(undefined);
    });

    test('CONFIG_RELAY_SUITE - Should NOT generate verification code - Config not found', async () => {
        await request(app)
            .patch(`/config/relay/verificationCode/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelayProd).expect(404);
    });

    test('CONFIG_RELAY_SUITE - Should verify code', async () => {
        // Given
        // Request verification code
        let response = await request(app)
            .patch(`/config/relay/verificationCode/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        // Test
        response = await request(app)
            .patch(`/config/relay/verify/${configId1}?code=${response.body.code}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.status).toBe('verified');
    });

    test('CONFIG_RELAY_SUITE - Should NOT verify code - Config not found', async () => {
        // Given
        // Request verification code
        const response = await request(app)
            .patch(`/config/relay/verificationCode/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        // Test
        await request(app)
            .patch(`/config/relay/verify/${new mongoose.Types.ObjectId()}?code=${response.body.code}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('CONFIG_RELAY_SUITE - Should NOT verify code - Invalid code', async () => {
        await request(app)
            .patch(`/config/relay/verify/${configId1}?code=`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('CONFIG_RELAY_SUITE - Should NOT verify code - Relay already verified', async () => {
        // Given
        // Request verification code
        let response = await request(app)
            .patch(`/config/relay/verificationCode/${configId1}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        // That
        // Is already verified
        await request(app)
            .patch(`/config/relay/verify/${configId1}?code=${response.body.code}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        // Test
        response = await request(app)
            .patch(`/config/relay/verify/${configId1}?code=${response.body.code}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.status).toBe('failed');
    });

});