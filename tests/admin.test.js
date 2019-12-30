import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import Admin from '../src/models/admin';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import Config from '../src/models/config';
import { ConfigStrategy } from '../src/models/config-strategy';
import { 
    setupDatabase, 
    adminMasterAccountId, 
    adminMasterAccount, 
    adminAccountId, 
    adminAccount, 
    adminMasterAccountToken 
} from './fixtures/db_api';

afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

describe('Testing Admin insertion', () => {
    beforeAll(setupDatabase)

    test('ADMIN_SUITE - Should signup a new Master Admin', async () => {
        const response = await request(app)
            .post('/admin/signup')
            .send({
                name: 'Master Admin',
                email: 'master_test123@mail.com',
                password: '12312312312'
            }).expect(201)

        // DB validation - document created
        const admin = await Admin.findById(response.body.admin._id)
        expect(admin).not.toBeNull()

        // DB validation - master flag
        expect(admin.master).toBe(true)

        // Response validation
        expect(response.body).toMatchObject({
            admin: {
                name: 'Master Admin',
                email: 'master_test123@mail.com',
                master: true,
                active: true
            }
        })
    })

    test('ADMIN_SUITE - Should NOT signup - invalid email format', async () => {
        await request(app)
            .post('/admin/signup')
            .send({
                name: 'Master Admin',
                email: 'master_test123',
                password: '12312312312'
            }).expect(422)
    })

    test('ADMIN_SUITE - Should NOT create a new Admin - invalid email', async () => {
        await request(app)
            .post('/admin/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'Admin',
                email: 'admin_test123',
                password: '12312312312'
            }).expect(422)
    })

    test('ADMIN_SUITE - Should create a new Admin with Master credential', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        const response = await request(app)
            .post('/admin/create')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                name: 'Admin',
                email: 'admin_test123@mail.com',
                password: '12312312312'
            }).expect(201)

        // DB validation - document created
        const admin = await Admin.findById(response.body.admin._id)
        expect(admin).not.toBeNull()

        // DB validation - master flag
        expect(admin.master).toBe(false)

        // Response validation
        expect(response.body).toMatchObject({
            admin: {
                name: 'Admin',
                email: 'admin_test123@mail.com',
                master: false,
                active: true
            }
        })
    })

    test('ADMIN_SUITE - Should not create a new Admin without Master credential', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        await request(app).post('/admin/create')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                name: 'Admin',
                email: 'admin_test123@mail.com',
                password: '12312312312'
            }).expect(401)
    })

    test('ADMIN_SUITE - Should login Master Admin', async () => {
        const response = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        const admin = await Admin.findById(adminMasterAccountId)
        expect(response.body.token).not.toBeNull()
    })

    test('ADMIN_SUITE - Should get Operation not found', async () => {
        const response = await request(app)
            .get('/fake_uri')
            .send().expect(404)

        expect(response.body.error).toEqual('Operation not found')
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
        const tempToken = jwt.sign({ _id: adminMasterAccountId }, process.env.JWT_SECRET, { expiresIn: '0s' })

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
        expect(response.body.master).toBe(adminMasterAccount.master)
    })

    test('ADMIN_SUITE - Should not get profile for unauthenticated admin', async () => {
        await request(app)
            .get('/admin/me')
            .send()
            .expect(401)
    })

    test('ADMIN_SUITE - Should update/me valid admin field', async () => {
        // Validating Master credential
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

    test('ADMIN_SUITE - Should not update its own account by non-me patch URI', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        const response = await request(app)
            .patch('/admin/' + adminMasterAccountId)
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                name: 'Updated Name'
            })
            .expect(400)

        expect(response.body.error).toEqual('Unable to modify your own params')
    })

    test('ADMIN_SUITE - Should NOT update others account without Master Credential by non-me patch URI', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        const response = await request(app)
            .patch('/admin/' + adminMasterAccountId)
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                name: 'Updated Name'
            })
            .expect(401)

        expect(response.body.error).toEqual('Unable to update Admins without a Master Admin credential')
    })

    test('ADMIN_SUITE - Should NOT update by invalid account id', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        await request(app)
            .patch('/admin/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                name: 'Updated Name'
            })
            .expect(404)

        await request(app)
            .patch('/admin/INVALID_ID')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                name: 'Updated Name'
            })
            .expect(400)
    })

    test('ADMIN_SUITE - Should update valid admin by non-me patch URI', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        await request(app)
            .patch('/admin/' + adminAccountId)
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send({
                name: 'Updated Name'
            })
            .expect(200)

            const admin = await Admin.findById(adminAccountId)
            expect(admin.name).toEqual('Updated Name')
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

describe('Testing Domain logout', () => {
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

        // FIXME: It's working but need to be reviewed since build plans are messing with these validations.
        // DB validation - Verify deleted dependencies
        // const domain = await Domain.find({ owner: adminMasterAccountId })
        // expect(domain).toEqual([])

        // const group = await GroupConfig.find({ owner: adminMasterAccountId })
        // expect(group).toEqual([])

        // const config = await Config.find({ owner: adminMasterAccountId })
        // expect(config).toEqual([])

        // const configStrategy = await ConfigStrategy.find({ owner: adminMasterAccountId })
        // expect(configStrategy).toEqual([])
    })
})

describe('Testing Admin deletion', () => {
    beforeAll(setupDatabase)

    test('ADMIN_SUITE - Should not delete/id account', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        const response = await request(app)
            .delete('/admin/' + adminMasterAccountId)
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send()
            .expect(401)

            expect(response.body.error).toEqual('Unable to delete Admins without a Master Admin credential')

        await request(app)
            .delete('/admin/INVALID_ADMIN_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send()
            .expect(500)

        await request(app)
            .delete('/admin/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send()
            .expect(404)
    })

    test('ADMIN_SUITE - Should delete/id account', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        // DB validation Before deleting
        let domain = await Domain.find({ owner: adminMasterAccountId })
        expect(domain).not.toBeNull()

        let group = await GroupConfig.find({ owner: adminMasterAccountId })
        expect(group).not.toBeNull()

        let config = await Config.find({ owner: adminMasterAccountId })
        expect(config).not.toBeNull()

        let configStrategy = await ConfigStrategy.find({ owner: adminMasterAccountId })
        expect(configStrategy).not.toBeNull()

        await request(app)
            .delete('/admin/' + adminMasterAccountId)
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send()
            .expect(200)

        const admin = await Admin.findById(adminMasterAccountId)
        expect(admin).toBeNull()

        // FIXME: It's working but need to be reviewed since build plans are messing with these validations.
        // DB validation - Verify deleted dependencies
        // domain = await Domain.find({ owner: adminMasterAccountId })
        // expect(domain).toEqual([])

        // group = await GroupConfig.find({ owner: adminMasterAccountId })
        // expect(group).toEqual([])

        // config = await Config.find({ owner: adminMasterAccountId })
        // expect(config).toEqual([])

        // configStrategy = await ConfigStrategy.find({ owner: adminMasterAccountId })
        // expect(configStrategy).toEqual([])
    })
})