import mongoose from 'mongoose';
import request from 'supertest';
import sinon from 'sinon';
import axios from 'axios';
import app from '../src/app';
import { RelayMethods, RelayTypes } from '../src/models/config';
import { 
    setupDatabase,
    adminMasterAccountToken,
    apiKey,
    keyConfig,
    configId,
    domainDocument,
    component1,
    configStrategyUSERId,
    configStrategyCIDRId
} from './fixtures/db_client';
import { EnvType } from '../src/models/environment';
import { adminMasterAccountId } from './fixtures/db_api';
import { StrategiesType, ConfigStrategy } from '../src/models/config-strategy';

const changeStrategy = async (strategyId, newOperation, status, environment) => {
    const strategy = await ConfigStrategy.findById(strategyId);
    strategy.operation = newOperation ? newOperation : strategy.operation;
    strategy.activated.set(environment, status !== undefined ? status : strategy.activated.get(environment));
    strategy.updatedBy = adminMasterAccountId;
    await strategy.save();
};

beforeAll(setupDatabase);

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing Switcher Relay', () => {

    const bodyRelay = (method, type) => {
        return {
            type,
            description: 'Validate input via external API',
            activated: {
                default: true
            },
            endpoint: {
                default: 'http://localhost:3001'
            },
            method,
            auth_prefix: 'Bearer',
            auth_token: {
                default: '123'
            }
        };
    };

    let token;
    let axiosStub;

    beforeAll(async () => {
        const response = await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${apiKey}`)
            .send({
                domain: domainDocument.name,
                component: component1.name,
                environment: EnvType.DEFAULT
            }).expect(200);

        token = response.body.token;
    });

    afterAll(setupDatabase);

    test('RELAY_SUITE - Should return success when validating relay using GET method', async () => {
        //mock
        axiosStub = sinon.stub(axios, 'get');

        //given
        const mockRelayService = { data: { result: true, reason: 'Success' } };
        axiosStub.returns(Promise.resolve(mockRelayService));

        //setup Switcher
        await request(app)
            .patch(`/config/updateRelay/${configId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay(RelayMethods.GET, RelayTypes.VALIDATION)).expect(200);

        //test
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }
                ]});
            
        axiosStub.restore();
        expect(req.statusCode).toBe(200);
        expect(req.body.reason).toEqual('Success');
        expect(req.body.result).toBe(true);
    });

    test('RELAY_SUITE - Should return success when validating relay using POST method', async () => {
        //mock
        axiosStub = sinon.stub(axios, 'post');

        //given
        const mockRelayService = { data: { result: true, reason: 'Success' } };
        axiosStub.returns(Promise.resolve(mockRelayService));

        //setup Switcher
        await request(app)
            .patch(`/config/updateRelay/${configId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay(RelayMethods.POST, RelayTypes.VALIDATION)).expect(200);

        //test
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }
                ]});

        axiosStub.restore();
        expect(req.statusCode).toBe(200);
        expect(req.body.reason).toEqual('Success');
        expect(req.body.result).toBe(true);
    });

    test('RELAY_SUITE - Should return success when notifying relay using GET method', async () => {
        //mock
        axiosStub = sinon.stub(axios, 'get');

        //given - altough it's not considered after invoking the relay
        const mockRelayService = { data: { result: true, reason: 'Success' } };
        axiosStub.returns(Promise.resolve(mockRelayService));

        //setup Switcher
        await request(app)
            .patch(`/config/updateRelay/${configId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay(RelayMethods.GET, RelayTypes.NOTIFICATION)).expect(200);

        //test
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }
                ]});

        axiosStub.restore();
        expect(req.statusCode).toBe(200);
        expect(req.body.reason).toEqual('Success');
        expect(req.body.result).toBe(true);
    });

    test('RELAY_SUITE - Should return success when notifying relay using POST method', async () => {
        //mock
        axiosStub = sinon.stub(axios, 'post');

        //given - altough it's not considered after invoking the relay
        const mockRelayService = { data: { result: true, reason: 'Success' } };
        axiosStub.returns(Promise.resolve(mockRelayService));

        //setup Switcher
        await request(app)
            .patch(`/config/updateRelay/${configId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay(RelayMethods.POST, RelayTypes.NOTIFICATION)).expect(200);

        //test
       const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }
                ]});

        axiosStub.restore();
        expect(req.statusCode).toBe(200);
        expect(req.body.reason).toEqual('Success');
        expect(req.body.result).toBe(true);
    });

    test('RELAY_SUITE - Should return success when validating relay using GET method - no input', async () => {
        //mock
        axiosStub = sinon.stub(axios, 'get');

        //given
        const mockRelayService = { data: { result: true, reason: 'Success' } };
        axiosStub.returns(Promise.resolve(mockRelayService));

        //setup Switcher
        await request(app)
            .patch(`/config/updateRelay/${configId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay(RelayMethods.GET, RelayTypes.NOTIFICATION)).expect(200);

        //disabling strategy to proceed calling with no input
        await changeStrategy(configStrategyUSERId, undefined, false, EnvType.DEFAULT);
        await changeStrategy(configStrategyCIDRId, undefined, false, EnvType.DEFAULT);

        //test
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send();

        axiosStub.restore();
        expect(req.statusCode).toBe(200);
        expect(req.body.reason).toEqual('Success');
        expect(req.body.result).toBe(true);
    });

    test('RELAY_SUITE - Should return success when validating relay using POST method - no input', async () => {
        //mock
        axiosStub = sinon.stub(axios, 'post');

        //given
        const mockRelayService = { data: { result: true, reason: 'Success' } };
        axiosStub.returns(Promise.resolve(mockRelayService));

        //setup Switcher
        await request(app)
            .patch(`/config/updateRelay/${configId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay(RelayMethods.POST, RelayTypes.NOTIFICATION)).expect(200);

        //disabling strategy to proceed calling with no input
        await changeStrategy(configStrategyUSERId, undefined, false, EnvType.DEFAULT);
        await changeStrategy(configStrategyCIDRId, undefined, false, EnvType.DEFAULT);

        //test
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send();

        axiosStub.restore();
        expect(req.statusCode).toBe(200);
        expect(req.body.reason).toEqual('Success');
        expect(req.body.result).toBe(true);
    });

    test('RELAY_SUITE - Should NOT return success when validating relay using GET method - Service exception', async () => {
        //mock
        axiosStub = sinon.stub(axios, 'get');
        axiosStub.throwsException();

        //setup Switcher
        await request(app)
            .patch(`/config/updateRelay/${configId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay(RelayMethods.GET, RelayTypes.VALIDATION)).expect(200);

        //test
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send();

        axiosStub.restore();
        expect(req.statusCode).toBe(200);
        expect(req.body.reason).toEqual('Relay service could not be reached');
        expect(req.body.message).toEqual('Failed to reach http://localhost:3001 via GET');
        expect(req.body.result).toBe(false);
    });

    test('RELAY_SUITE - Should NOT return success when validating relay using POST method - Service exception', async () => {
        //mock
        axiosStub = sinon.stub(axios, 'post');
        axiosStub.throwsException();

        //setup Switcher
        await request(app)
            .patch(`/config/updateRelay/${configId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(bodyRelay(RelayMethods.POST, RelayTypes.VALIDATION)).expect(200);

        //test
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send();

        axiosStub.restore();
        expect(req.statusCode).toBe(200);
        expect(req.body.reason).toEqual('Relay service could not be reached');
        expect(req.body.message).toEqual('Failed to reach http://localhost:3001 via POST');
        expect(req.body.result).toBe(false);
    });

});