import request from 'supertest';
import mongoose from 'mongoose';
import passport from 'passport';
import app from '../src/app';
import { 
    adminAccountToken,
    adminSamlAccountToken,
    setupDatabase
} from './fixtures/db_api';

class TestSamlStrategy {
    constructor(name, _, verify) {
        this.name = name || 'test-saml';
        this._verify = verify;
        this._testResult = null;
    }
    
    setTestResult(result) {
        this._testResult = result;
    }
    
    authenticate(_) {
        if (this._testResult?.error) {
            return this.error(this._testResult.error);
        }
        
        if (this._testResult?.fail) {
            return this.fail(this._testResult.fail);
        }
        
        if (this._testResult?.user) {
            return this._verify(this._testResult.user, (err, user) => {
                if (err) return this.error(err);
                if (!user) return this.fail();
                this.success(user);
            });
        }

        this.fail();
    }
}

afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('SAML Authentication', () => {
    let testStrategy;
    let originalStrategy;

    beforeEach(setupDatabase);

    afterEach(() => {
        if (originalStrategy) {
            passport.use('saml', originalStrategy);
            originalStrategy = null;
        }
    });

    const setupTestStrategy = async () => {
        originalStrategy = passport.Strategy('saml');
        testStrategy = new TestSamlStrategy('saml', {}, async (profile, done) => {
            return done(null, profile);
        });
        
        passport.use('saml', testStrategy);
    };

    test('SAML_SUITE - Should redirect to SAML IdP on login request', async () => {
        const response = await request(app)
            .get('/admin/saml/login')
            .expect(302);
        
        expect(response.headers.location).toBeDefined();
    });

    test('SAML_SUITE - Should return SAML metadata', async () => {
        const response = await request(app)
            .get('/admin/saml/metadata')
            .expect(200);
        
        expect(response.headers['content-type']).toContain('application/xml');
        expect(response.text).toContain('EntityDescriptor');
    });

    test('SAML_SUITE - Should handle successful SAML callback with valid user token', async () => {
        // given - a valid SAML response
        await setupTestStrategy();
        testStrategy.setTestResult({ user: { token: 'mockToken' } });

        // test
        const response = await request(app)
            .post('/admin/saml/callback')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send('SAMLResponse=test')
            .expect(302);
    
        expect(response.headers.location).toBeDefined();
        expect(response.headers.location).toMatch(/token=mockToken/);
    });

    test('SAML_SUITE - Should handle SAML callback authentication failure', async () => {
        // given - an error during SAML authentication
        await setupTestStrategy();

        testStrategy.setTestResult({ 
            error: new Error('SAML authentication failed') 
        });

        // test
        const response = await request(app)
            .post('/admin/saml/callback')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send('SAMLResponse=test');

        expect(response.status).toBe(401);
    });

    test('SAML_SUITE - Should handle SAML callback with authentication failure', async () => {
        // given - an error during SAML authentication
        await setupTestStrategy();
        
        testStrategy.setTestResult({ 
            fail: 'Invalid SAML response' 
        });

        // test
        await request(app)
            .post('/admin/saml/callback')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send('SAMLResponse=test')
            .expect(401);
    });

    test('SAML_SUITE - Should authenticate SAML user from redirect', async () => {
        // test
        const response = await request(app)
            .post('/admin/saml/auth')
            .set('Authorization', `Bearer ${adminSamlAccountToken}`)
            .expect(200);

        expect(response.body.admin).toBeDefined();
        expect(response.body.jwt).toBeDefined();
    });

    test('SAML_SUITE - Should reject SAML user authentication without token', async () => {
        await request(app)
            .post('/admin/saml/auth')
            .expect(401);
    });

    test('SAML_SUITE - Should reject SAML user authentication - not valid SAML account', async () => {
        await request(app)
            .post('/admin/saml/auth')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .expect(401);
    });

});