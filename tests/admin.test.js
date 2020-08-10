import mongoose from 'mongoose';
import axios from 'axios';
import sinon from 'sinon';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import Admin from '../src/models/admin';
import { 
    setupDatabase, 
    adminMasterAccountId, 
    adminMasterAccount, 
    adminAccountId, 
    adminAccount,
    teamId,
    domainId,
    team1Id
} from './fixtures/db_api';

afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

describe('Testing Admin insertion', () => {
    beforeAll(setupDatabase)

    let axiosPostStub;
    let axiosGetStub;

    test('ADMIN_SUITE - Should signup a new Admin', async () => {
        // mock
        axiosPostStub = sinon.stub(axios, 'post');

        // given
        const mockedRecaptchaResponse = { data: { success: true } };
        axiosPostStub.returns(Promise.resolve(mockedRecaptchaResponse));

        // test
        const response = await request(app)
            .post('/admin/signup')
            .send({
                name: 'New Admin',
                email: 'new_admin@mail.com',
                password: '12312312312',
                token: 'GOOGLE_RECAPTCHA_TOKEN'
            }).expect(201);

        // DB validation - document created
        const admin = await Admin.findById(response.body.admin._id);
        expect(admin).not.toBeNull();

        // Response validation
        expect(response.body).toMatchObject({
            admin: {
                name: 'New Admin',
                email: 'new_admin@mail.com',
                active: true
            }
        });

        // restore
        axiosPostStub.restore();
    })

    test('ADMIN_SUITE - Should NOT signup - Failed to validate reCaptcha', async () => {
        // mock
        axiosPostStub = sinon.stub(axios, 'post');

        // given
        const mockedRecaptchaResponse = { data: { success: false } };
        axiosPostStub.returns(Promise.resolve(mockedRecaptchaResponse));

        // test
        const response = await request(app)
            .post('/admin/signup')
            .send({
                name: 'New Admin',
                email: 'new_admin@mail.com',
                password: '12312312312',
                token: 'GOOGLE_RECAPTCHA_TOKEN'
            }).expect(400);

        expect(response.body.error).toEqual('Failed to validate capatcha');

        // restore
        axiosPostStub.restore();
    })

    test('ADMIN_SUITE - Should NO signup - No token provided', async () => {
        const response = await request(app)
            .post('/admin/signup')
            .send({
                name: 'New Admin',
                email: 'new_admin@mail.com',
                password: '12312312312'
            }).expect(400);

        expect(response.body.error).toEqual('Token is empty or invalid');
    })

    test('ADMIN_SUITE - Should signup a new Admin - From GitHub', async () => {
        // mock
        axiosPostStub = sinon.stub(axios, 'post');
        axiosGetStub = sinon.stub(axios, 'get');

        // given
        const mockedTokenData = { data: { access_token: 'MOCKED_TOKEN' } };
        const mockedUserData = { data: 
            { 
                id: 123456789,
                login: 'githubuser',
                name: 'Mocked GitHub User'
            } 
        };

        axiosPostStub.returns(Promise.resolve(mockedTokenData));
        axiosGetStub.returns(Promise.resolve(mockedUserData));

        // test
        const response = await request(app)
            .post('/admin/github/auth?code=GIT_CODE')
            .send().expect(201);

        // DB validation - document created
        const admin = await Admin.findById(response.body.admin._id);
        expect(admin).not.toBeNull();
        expect(admin._gitid).toEqual("123456789");

        // restore
        axiosPostStub.restore();
        axiosGetStub.restore();
    })

    test('ADMIN_SUITE - Should signup a new Admin - From BitBucket', async () => {
        // mock
        axiosPostStub = sinon.stub(axios, 'post');
        axiosGetStub = sinon.stub(axios, 'get');

        // given
        const mockedTokenData = { data: { access_token: 'MOCKED_TOKEN' } };
        const mockedUserData = { data: 
            { 
                account_id: 123456789,
                nickname: 'bitbucketuser',
                display_name: 'Mocked BitBucket User'
            } 
        };

        var bodyFormData = new URLSearchParams();
        bodyFormData.set('grant_type', 'authorization_code');
        bodyFormData.set('code', 'BITBUCKET_CODE');

        axiosPostStub.calledWith('data', bodyFormData)
        axiosPostStub.returns(Promise.resolve(mockedTokenData));
        axiosGetStub.returns(Promise.resolve(mockedUserData));

        // test
        const response = await request(app)
            .post('/admin/bitbucket/auth?code=BITBUCKET_CODE')
            .send().expect(201);

        // DB validation - document created
        const admin = await Admin.findById(response.body.admin._id);
        expect(admin).not.toBeNull();
        expect(admin._bitbucketid).toEqual("123456789");

        // restore
        axiosPostStub.restore();
        axiosGetStub.restore();
    })

    test('ADMIN_SUITE - Should NOT signup - invalid email format', async () => {
        await request(app)
            .post('/admin/signup')
            .send({
                name: 'Admin',
                email: 'admin@',
                password: '12312312312',
                token: 'GOOGLE_RECAPTCHA_TOKEN'
            }).expect(422);
    })

    test('ADMIN_SUITE - Should NOT signup - Access denied to GitHub User Info', async () => {
        // mock
        axiosPostStub = sinon.stub(axios, 'post');
        axiosGetStub = sinon.stub(axios, 'get');

        // given
        const mockedTokenData = { data: { access_token: 'MOCKED_TOKEN' } };
        
        axiosPostStub.returns(Promise.resolve(mockedTokenData));
        axiosGetStub.throwsException();

        // test
        const response = await request(app)
            .post('/admin/github/auth?code=GIT_CODE')
            .send().expect(401);

        expect(response.body.error).toEqual("Failed to get GitHub user info");

        // restore
        axiosPostStub.restore();
        axiosGetStub.restore();
    })

    test('ADMIN_SUITE - Should NOT signup - Access denied to GitHub Token', async () => {
        // mock
        axiosPostStub = sinon.stub(axios, 'post');

        // given
        axiosPostStub.throwsException();

        // test
        const response = await request(app)
            .post('/admin/github/auth?code=GIT_CODE')
            .send().expect(401);

        expect(response.body.error).toEqual("Failed to get GitHub access token");

        // restore
        axiosPostStub.restore();
        axiosGetStub.restore();
    })

    test('ADMIN_SUITE - Should NOT signup - Access denied to BitBucket User Info', async () => {
        // mock
        axiosPostStub = sinon.stub(axios, 'post');
        axiosGetStub = sinon.stub(axios, 'get');

        // given
        const mockedTokenData = { data: { access_token: 'MOCKED_TOKEN' } };
        const mockedUserData = { data: 
            { 
                account_id: 123456789,
                nickname: 'bitbucketuser',
                display_name: 'Mocked BitBucket User'
            } 
        };

        var bodyFormData = new URLSearchParams();
        bodyFormData.set('grant_type', 'authorization_code');
        bodyFormData.set('code', 'BITBUCKET_CODE');

        axiosPostStub.calledWith('data', bodyFormData)
        axiosPostStub.returns(Promise.resolve(mockedTokenData));
        axiosGetStub.throwsException();

        // test
        const response = await request(app)
            .post('/admin/bitbucket/auth?code=BITBUCKET_CODE')
            .send().expect(401);

        expect(response.body.error).toEqual("Failed to get BitBucket user info");

        // restore
        axiosPostStub.restore();
        axiosGetStub.restore();
    })

    test('ADMIN_SUITE - Should NOT signup - Access denied to BitBucket Token', async () => {
        // mock
        axiosPostStub = sinon.stub(axios, 'post');

        // given
        axiosPostStub.throwsException();

        // test
        const response = await request(app)
            .post('/admin/bitbucket/auth?code=BITBUCKET_CODE')
            .send().expect(401);

        expect(response.body.error).toEqual("Failed to get BitBucket access token");

        // restore
        axiosPostStub.restore();
        axiosGetStub.restore();
    })

    test('ADMIN_SUITE - Should login Master Admin', async () => {
        const response = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        expect(response.body.token).not.toBeNull()
    })

    test('ADMIN_SUITE - Should get Operation not found', async () => {
        const response = await request(app)
            .get('/fake_uri')
            .send().expect(404)

        expect(response.body.error).toEqual('Operation not found')
    })

    test('ADMIN_SUITE - Should get All Good', async () => {
        const response = await request(app)
            .get('/check')
            .send().expect(200)

        expect(response.body.message).toEqual('All good')
    })

    test('ADMIN_SUITE - Should renew access', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        const token = responseLogin.body.jwt.token
        const refreshToken = responseLogin.body.jwt.refreshToken

        expect(token).not.toBeNull()
        expect(refreshToken).not.toBeNull()

        //DB validation
        let admin = await Admin.findById(adminAccount._id)
        expect(admin.token).toEqual(refreshToken)

        await new Promise(resolve => setTimeout(resolve, 1000));
        const responseRefresh = await request(app)
            .post('/admin/refresh/me')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                refreshToken
            }).expect(200)

        expect(responseRefresh.body.token).not.toBeNull()
        expect(responseRefresh.body.refreshToken).not.toBeNull()
        expect(responseRefresh.body.token).not.toEqual(token)
        expect(responseRefresh.body.refreshToken).not.toEqual(refreshToken)

        //DB validation
        admin = await Admin.findById(adminAccount._id)
        expect(admin.token).toEqual(responseRefresh.body.refreshToken)
    })

    test('ADMIN_SUITE - Should NOT renew access - using the same refreshToken', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        const token = responseLogin.body.jwt.token
        const refreshToken = responseLogin.body.jwt.refreshToken

        expect(token).not.toBeNull()
        expect(refreshToken).not.toBeNull()

        let responseRefresh = await request(app)
            .post('/admin/refresh/me')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                refreshToken
            }).expect(200)

        responseRefresh = await request(app)
            .post('/admin/refresh/me')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                refreshToken
            }).expect(401)

        expect(responseRefresh.body.error).toEqual('Unable to refresh token.')
    })

    test('ADMIN_SUITE - Should lost credentials if logged multiple times', async () => {
        let responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)
        
        const firstToken = responseLogin.body.jwt.token;

        await request(app)
            .get('/admin/me')
            .set('Authorization', `Bearer ${firstToken}`)
            .send().expect(200)

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Logging again will make lost older sessions credentials
        responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        const secondRefreshToken = responseLogin.body.jwt.refreshToken;

        await request(app)
            .get('/admin/me')
            .set('Authorization', `Bearer ${firstToken}`)
            .send().expect(401)
        
        // Refreshing should not work as well
        await request(app)
            .post('/admin/refresh/me')
            .set('Authorization', `Bearer ${firstToken}`)
            .send({
                refreshToken: secondRefreshToken
            }).expect(401)
    })

    test('ADMIN_SUITE - Should NOT renew access - invalid Token', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        const refreshToken = responseLogin.body.jwt.refreshToken

        let responseRefresh = await request(app)
            .post('/admin/refresh/me')
            .set('Authorization', `Bearer INVALID_TOKEN`)
            .send({
                refreshToken
            }).expect(401)

        expect(responseRefresh.body.error).toEqual('Unable to refresh token.')
    })

    test('ADMIN_SUITE - Should return token expired', async () => {
        const tempToken = jwt.sign({ _id: adminMasterAccountId }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '0s' })

        let response = await request(app)
            .get('/admin/me')
            .set('Authorization', `Bearer ${tempToken}`)
            .send().expect(401)

        // After login, it should just renew
        response = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        await request(app)
            .get('/admin/me')
            .set('Authorization', `Bearer ${response.body.jwt.token}`)
            .send().expect(200)
    })
})

describe('Testing Admin login and fetch', () => {
    beforeAll(setupDatabase)

    test('ADMIN_SUITE - Should login Admin', async () => {
        const response = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        const admin = await Admin.findById(adminAccountId)
        expect(response.body.jwt.refreshToken).toBe(admin.token)
    })

    test('ADMIN_SUITE - Should not login non-existent admin', async () => {
        await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: 'wrongpassword'
            }).expect(401)
    })

    test('ADMIN_SUITE - Should not login with wrong email format', async () => {
        await request(app)
            .post('/admin/login')
            .send({
                email: 'notemail',
                password: 'password'
            }).expect(422)
    })

    test('ADMIN_SUITE - Should get profile for admin', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        const response = await request(app)
            .get('/admin/me')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send()
            .expect(200)

        // Response validation
        expect(response.body.name).toBe(adminMasterAccount.name)
        expect(response.body.email).toBe(adminMasterAccount.email)
    })

    test('ADMIN_SUITE - Should get admin profile given an Admin ID', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        const response = await request(app)
            .get('/admin/' + adminAccountId)
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send()
            .expect(200)

        // Response validation
        expect(response.body.name).toBe(adminAccount.name)
        expect(response.body.email).toBe(adminAccount.email)
    })

    test('ADMIN_SUITE - Should NOT get admin profile given an wrong Admin ID', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        await request(app)
            .get('/admin/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send()
            .expect(404)
    })

    test('ADMIN_SUITE - Should NOT get admin profile given an invalid Admin ID', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        await request(app)
            .get('/admin/INVALID_ID')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send()
            .expect(400)
    })

    test('ADMIN_SUITE - Should not get profile for unauthenticated admin', async () => {
        await request(app)
            .get('/admin/me')
            .send()
            .expect(401)
    })

    test('ADMIN_SUITE - Should update/me valid admin field', async () => {
        let responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        await request(app)
            .patch('/admin/me')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                name: 'Updated Name'
            })
            .expect(200)
        let admin = await Admin.findById(adminMasterAccountId)
        expect(admin.name).toEqual('Updated Name')

        // Validating regular Admin credential
        responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        await request(app)
            .patch('/admin/me')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                name: 'Updated Name'
            })
            .expect(200)

        admin = await Admin.findById(adminAccountId)
        expect(admin.name).toEqual('Updated Name')
    })

    test('ADMIN_SUITE - Should NOT update/me admin fields', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        await request(app)
            .patch('/admin/me')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                _id: new mongoose.Types.ObjectId()
            })
            .expect(400)
    })

    test('ADMIN_SUITE - Should logout valid admin', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        await request(app)
            .post('/admin/logout')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send()
            .expect(200)

        const admin = await Admin.findById(adminMasterAccountId)
        expect(admin.token).toBeNull()
    })
})

describe('Testing Admin logout', () => {
    beforeAll(setupDatabase)

    test('ADMIN_SUITE - Should delete/me account for admin', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        await request(app)
            .delete('/admin/me')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send()
            .expect(200)

        const admin = await Admin.findById(adminMasterAccountId)
        expect(admin).toBeNull()
    })
})


describe('Testing Admin collaboration endpoint', () => {
    beforeAll(setupDatabase)

    test('ADMIN_SUITE - Should read domains in which a user is collaborating', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        await request(app)
            .patch('/team/member/add/' + teamId)
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                member: adminMasterAccountId
            }).expect(200)
            
        let response = await request(app)
            .get('/admin/collaboration')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send()
            .expect(200)

        expect(response.body.length).toEqual(1);

        await request(app)
            .patch('/team/member/remove/' + teamId)
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                member: adminMasterAccountId
            }).expect(200)

        response = await request(app)
            .get('/admin/collaboration')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send()
            .expect(200)

        expect(response.body.length).toEqual(0);
    })

    test('ADMIN_SUITE - Should read credentials from an user', async () => {
        let responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        await request(app)
            .patch('/team/member/add/' + team1Id)
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                member: adminAccountId
            }).expect(200)

        responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        const response = await request(app)
            .post('/admin/collaboration/permission')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                domain: domainId,
                action: ['READ', 'UPDATE', 'CREATE'],
                router: 'GROUP',
                element: {
                    name: 'Optional Group Name Here'
                }
            })
            .expect(200)

        expect(response.body.length > 0).toEqual(true);

        const read = response.body.filter(credential => credential.action === 'READ');
        expect(read[0].result).toEqual('ok');
        const update = response.body.filter(credential => credential.action === 'UPDATE');
        expect(update[0].result).toEqual('nok');
        const create = response.body.filter(credential => credential.action === 'CREATE');
        expect(create[0].result).toEqual('nok');
    })
})