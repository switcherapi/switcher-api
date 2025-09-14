import { Strategy as SamlStrategy } from '@node-saml/passport-saml';
import passport from 'passport';
import { signUpSaml } from '../services/admin.js';
import Logger from '../helpers/logger.js';

function isSamlAvailable() {
    return process.env.SAML_ENTRY_POINT && process.env.SAML_CALLBACK_ENDPOINT_URL && process.env.SAML_CERT;
}

if (isSamlAvailable()) {
    const samlOptions = {
        entryPoint: process.env.SAML_ENTRY_POINT,
        issuer: process.env.SAML_ISSUER || 'switcher-api',
        callbackUrl: `${process.env.SAML_CALLBACK_ENDPOINT_URL}/admin/saml/callback`,
        idpCert: Buffer.from(process.env.SAML_CERT, 'base64').toString('utf8'),
        privateKey: process.env.SAML_PRIVATE_KEY ? Buffer.from(process.env.SAML_PRIVATE_KEY, 'base64').toString('utf8') : undefined,
        identifierFormat: process.env.SAML_IDENTIFIER_FORMAT || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        acceptedClockSkewMs: process.env.SAML_ACCEPTED_CLOCK_SKEW_MS ? parseInt(process.env.SAML_ACCEPTED_CLOCK_SKEW_MS, 10) : 5000,
        signatureAlgorithm: 'sha256',
        digestAlgorithm: 'sha256',
        wantAssertionsSigned: true,
        wantAuthnResponseSigned: false,
    };

    const samlStrategy = new SamlStrategy(samlOptions, async (profile, done) => {
        try {
            const userInfo = {
                id: profile.nameID,
                email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
                name: profile.firstName || profile.nameID
            };
            
            const { jwt } = await signUpSaml(userInfo);
            return done(null, { token: jwt.token });
        } catch (error) {
            Logger.error('SAML Strategy Error Event:', error);
            return done(error);
        }
    });

    passport.use('saml', samlStrategy);
    Logger.info('SSO enabled: SAML strategy configured');
    Logger.info(`   - Entry Point: ${samlOptions.entryPoint}`);
    Logger.info(`   - Callback URL: ${samlOptions.callbackUrl}`);
    Logger.info(`   - Issuer: ${samlOptions.issuer}`);
    Logger.info(`   - Identifier Format: ${samlOptions.identifierFormat}`);
    Logger.info(`   - Accepted Clock Skew (ms): ${samlOptions.acceptedClockSkewMs}`);
    Logger.info(`   - Idp Cert: ${samlOptions.idpCert ? 'Provided' : 'Not Provided'}`);
    Logger.info(`   - Private Key: ${samlOptions.privateKey ? 'Provided' : 'Not Provided'}`);
}

