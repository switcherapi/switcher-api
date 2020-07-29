import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Admin from '../models/admin';
import Component from '../models/component';

export async function auth(req, res, next) {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findOne({ _id: decoded._id });

        if (!admin || !admin.active) {
            throw new Error();
        }

        const isMatch = await bcrypt.compare(token.split('.')[2], admin.token);
        if (!isMatch) {
            throw new Error();
        }

        req.token = token;
        req.admin = admin;
        next();
    } catch (e) {
        res.status(401).send({ error: 'Please authenticate.' });
    }
}

export async function authRefreshToken(req, res, next) {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const refreshToken = req.body.refreshToken;
        
        const isMatch = await bcrypt.compare(token.split('.')[2], refreshToken);
        if (!isMatch) {
            throw new Error();
        }

        const decoded = await jwt.decode(token);
        const admin = await Admin.findOne({ _id: decoded._id, token: refreshToken });

        if (!admin || !admin.active) {
            throw new Error();
        }

        const newTokenPair = await admin.generateAuthToken();
        req.jwt = newTokenPair;
        next();
    } catch (e) {
        res.status(401).send({ error: 'Unable to refresh token.' });
    }
}

export async function appAuth(req, res, next) {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const component = await Component.findOne({ _id: decoded.component }).lean();

        if (component?.apihash.substring(50,component.apihash.length - 1) !== decoded.vc) {
            throw new Error();
        }

        req.token = token;
        req.domain = component.domain;
        req.component = component.name;
        req.environment = decoded.environment;
        next();
    } catch (e) {
        res.status(401).send({ error: 'Invalid API token.' });
    }
}

export async function appGenerateCredentials(req, res, next) {
    try {
        const key = req.header('switcher-api-key');
        const { component, domain } = await Component.findByCredentials(req.body.domain, req.body.component, key);

        if (!component) {
            throw new Error();
        }

        const token = await component.generateAuthToken(req.body.environment);

        req.token = token;
        req.domain = domain;
        req.environment = req.body.environment;
        next();
    } catch (e) {
        res.status(401).send({ error: 'Invalid token request' });
    }
}