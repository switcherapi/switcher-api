import '../external/saml.js';
import { generateServiceProviderMetadata } from '@node-saml/passport-saml';
import express from 'express';
import passport from 'passport';
import * as Services from '../services/admin.js';
import { auth } from '../middleware/auth.js';
import { responseException } from '../exceptions/index.js';

const router = new express.Router();

router.get('/admin/saml/login', passport.authenticate('saml'));

router.post('/admin/saml/callback', (req, res, next) => {
    passport.authenticate('saml', { session: false }, (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Authentication failed' });
        }
        
        const { token } = user;
        const redirectTo = `${process.env.SAML_REDIRECT_ENDPOINT_URL}/login`;
        const fragment = `token=${encodeURIComponent(token)}`;
        
        res.redirect(`${redirectTo}#${fragment}`);
    })(req, res, next);
});

router.post('/admin/saml/auth', auth, async (req, res) => {
    try {
        const { admin, jwt } = await Services.signUpSaml({ 
            id: req.admin._samlid, 
            email: req.admin.email,
            name: req.admin.name
        });

        res.status(200).send({ admin, jwt });
    } catch (e) {
        responseException(res, e, 401);
    }
});

router.get('/admin/saml/metadata', (_, res) => {
    const metadata = generateServiceProviderMetadata({
        issuer: process.env.SAML_ISSUER,
        callbackUrl: process.env.SAML_CALLBACK_URL,
        publicCerts: Buffer.from(process.env.SAML_CERT, 'base64').toString('utf8'),
        privateKey: process.env.SAML_PRIVATE_KEY ? Buffer.from(process.env.SAML_PRIVATE_KEY, 'base64').toString('utf8') : undefined
    });
    
    res.set('Content-Type', 'application/xml');
    res.send(metadata);
});

export default router;