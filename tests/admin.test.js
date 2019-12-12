import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import Admin from '../src/models/admin';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import Config from '../src/models/config';
import { ConfigStrategy } from '../src/models/config-strategy';
import { setupDatabase, adminMasterAccountId, adminMasterAccount, adminAccountId, adminAccount } from './fixtures/db_api';

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
            },
            token: admin.tokens[0].token
        })
    })

    test('ADMIN_SUITE - Should create a new Admin with Master credential', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        const response = await request(app).post('/admin/create')
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
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
            },
            token: admin.tokens[0].token
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
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
            .send({
                name: 'Admin',
                email: 'admin_test123@mail.com',
                password: '12312312312'
            }).expect(400)
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
        expect(response.body.token).toBe(admin.tokens[1].token)
    })

    test('ADMIN_SUITE - Should not login non-existent admin', async () => {
        await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: 'wrongpassword'
            }).expect(400)
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
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
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
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
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
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
            .send({
                name: 'Updated Name'
            })
            .expect(200)
        admin = await Admin.findById(adminAccountId)
        expect(admin.name).toEqual('Updated Name')
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
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
            .send({
                name: 'Updated Name'
            })
            .expect(400)

        expect(response.body.error).toEqual('Unable to modify your own params')
    })

    test('ADMIN_SUITE - Should not update others account without Master Credential by non-me patch URI', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        const response = await request(app)
            .patch('/admin/' + adminMasterAccountId)
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
            .send({
                name: 'Updated Name'
            })
            .expect(400)

        expect(response.body.error).toEqual('Unable to update Admins without a Master Admin credential')
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
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
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
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
            .send()
            .expect(200)

        const admin = await Admin.findById(adminMasterAccountId)
        const expected = [ responseLogin.body.token ];
        expect(admin.tokens).toEqual(expect.not.arrayContaining(expected))
    })
})

describe('Testing Domain logout', () => {
    beforeAll(setupDatabase)

    test('ADMIN_SUITE - Should logout other sessions for a valid admin', async () => {
        const firstToken = adminMasterAccount.tokens[0].token

        await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        // DB validate - tokens per session generated logins
        const adminBefore = await Admin.findById(adminMasterAccountId).select('tokens.token')
        expect(adminBefore.tokens.length).toEqual(3)

        await request(app)
            .post('/admin/logoutOtherSessions')
            .set('Authorization', `Bearer ${firstToken}`)
            .send()
            .expect(200)

        const adminAfter = await Admin.findById(adminMasterAccountId)
        expect(adminAfter.tokens.length).toEqual(1)
    })

    test('ADMIN_SUITE - Should logout all sessions for a valid admin', async () => {
        const firstToken = adminMasterAccount.tokens[0].token

        await new Promise(resolve => setTimeout(resolve, 1000));
        await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        await new Promise(resolve => setTimeout(resolve, 1000));
        await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        // DB validate - tokens per session generated logins
        const adminBefore = await Admin.findById(adminMasterAccountId).select('tokens.token')
        expect(adminBefore.tokens.length).toEqual(3)

        await request(app)
            .post('/admin/logoutAll')
            .set('Authorization', `Bearer ${firstToken}`)
            .send()
            .expect(200)

        const adminAfter = await Admin.findById(adminMasterAccountId)
        expect(adminAfter.tokens.length).toEqual(0)
    })

    test('ADMIN_SUITE - Should delete/me account for admin', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        await request(app)
            .delete('/admin/me')
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
            .send()
            .expect(200)
        
        const admin = await Admin.findById(adminMasterAccountId)
        expect(admin).toBeNull()

        // DB validation - Verify deleted dependencies
        const domain = await Domain.find({ owner: adminMasterAccountId })
        expect(domain).toEqual([])

        const group = await GroupConfig.find({ owner: adminMasterAccountId })
        expect(group).toEqual([])

        const config = await Config.find({ owner: adminMasterAccountId })
        expect(config).toEqual([])

        const configStrategy = await ConfigStrategy.find({ owner: adminMasterAccountId })
        expect(configStrategy).toEqual([])
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
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
            .send()
            .expect(400)

            expect(response.body.error).toEqual('Unable to delete Admins without a Master Admin credential')

        await request(app)
            .delete('/admin/INVALID_ADMIN_ID')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
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
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
            .send()
            .expect(200)

        const admin = await Admin.findById(adminMasterAccountId)
        expect(admin).toBeNull()

        // DB validation - Verify deleted dependencies
        domain = await Domain.find({ owner: adminMasterAccountId })
        expect(domain).toEqual([])

        group = await GroupConfig.find({ owner: adminMasterAccountId })
        expect(group).toEqual([])

        config = await Config.find({ owner: adminMasterAccountId })
        expect(config).toEqual([])

        configStrategy = await ConfigStrategy.find({ owner: adminMasterAccountId })
        expect(configStrategy).toEqual([])
    })
})