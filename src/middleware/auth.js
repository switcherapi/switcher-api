import basicAuth from 'express-basic-auth';
import jwt from 'jsonwebtoken';
import { getAdmin, getAdminById } from '../services/admin.js';
import { getComponentById } from '../services/component.js';
import { getEnvironmentByName } from '../services/environment.js';
import Admin from '../models/admin.js';
import Component from '../models/component.js';
import { getRateLimit } from '../external/switcher-api-facade.js';
import { responseExceptionSilent } from '../exceptions/index.js';
import { EnvType } from '../models/environment.js';

export async function auth(req, res, next) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await getAdminById(decoded._id);

        if (!admin?.active) {
            throw new Error('User not active');
        }
        
        if (admin.token !== Admin.extractTokenPart(token)) {
            throw new Error(`Invalid token for ${admin.email}`);
        }

        req.token = token;
        req.admin = admin;
        next();
    } catch (err) {
        responseExceptionSilent(res, err, 401, 'Please authenticate.');
    }
}

export async function authRefreshToken(req, res, next) {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const refreshToken = req.body.refreshToken;
        
        const decodedRefreshToken = jwt.verify(refreshToken, process.env.JWT_SECRET);
        if (decodedRefreshToken.subject !== Admin.extractTokenPart(token)) {
            throw new Error('Refresh code does not match');
        }

        const decoded = await jwt.decode(token);
        const admin = await getAdmin({ _id: decoded._id, token: decodedRefreshToken.subject });
        
        if (!admin?.active) {
            throw new Error('User not active');
        }

        const newTokenPair = await admin.generateAuthToken();
        res.jwt = newTokenPair;
        next();
    } catch (err) {
        responseExceptionSilent(res, err, 401, 'Unable to refresh token.');
    }
}

export async function componentAuth(req, res, next) {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const component = await getComponentById(decoded.component);

        if (component?.apihash.substring(50, component.apihash.length - 1) !== decoded.vc) {
            throw new Error('Invalid API token');
        }

        req.token = token;
        req.domain = component.domain;
        req.component = component.name;
        req.componentId = component._id;
        req.environment = decoded.environment;
        req.rate_limit = decoded.rate_limit;
        next();
    } catch (err) {
        responseExceptionSilent(res, err, 401, 'Invalid API token.');
    }
}

export async function slackAuth(req, res, next) {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        jwt.verify(token, process.env.SWITCHER_SLACK_JWT_SECRET);
        next();
    } catch (err) {
        responseExceptionSilent(res, err, 401, 'Invalid API token.');
    }
}

export async function gitopsAuth(req, res, next) {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.SWITCHER_GITOPS_JWT_SECRET);

        req.token = token;
        req.domain = decoded.subject;
        req.environment = EnvType.DEFAULT;
        next();
    } catch (err) {
        responseExceptionSilent(res, err, 401, 'Invalid API token.');
    }
}

export function resourcesAuth() {
    return basicAuth({
        users: {
            admin: process.env.RESOURCE_SECRET || 'admin',
        },
        challenge: true,
    });
}

export async function appGenerateCredentials(req, res, next) {
    try {
        const key = req.header('switcher-api-key');
        const { component, domain } = await Component.findByCredentials(req.body.domain, req.body.component, key);
        const environment = await getEnvironmentByName(component.domain, req.body.environment);

        if (!environment) {
            throw new Error('Invalid environment');
        }

        const rate_limit = await getRateLimit(key, component);
        const token = await component.generateAuthToken(req.body.environment, rate_limit);

        req.token = token;
        req.domain = domain;
        req.environment = req.body.environment;
        req.rate_limit = rate_limit;
        next();
    } catch (err) {
        responseExceptionSilent(res, err, 401, 'Invalid token request.');
    }
}