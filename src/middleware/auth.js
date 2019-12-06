"use strict";

import jwt from 'jsonwebtoken';
import Admin from '../models/admin';
import Domain from '../models/domain';

/**
 * Middleware
 * 
 * Auth for managing switchers
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
export async function auth(req, res, next) {
    try {
        const token = req.header('Authorization').replace('Bearer ', '')
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const admin = await Admin.findOne({ _id: decoded._id, 'tokens.token': token })

        if (!admin || !admin.active) {
            throw new Error()
        }

        req.token = token
        req.admin = admin
        next()
    } catch (e) {
        res.status(401).send({ error: 'Please authenticate.' })
    }
}

/**
 * Middleware
 * 
 * Auth to access switchers
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
export async function appAuth(req, res, next) {
    try {
        const token = req.header('Authorization').replace('Bearer ', '')

        const decoded = jwt.verify(token, process.env.JWT_CONFIG_SECRET)
        const domain = await Domain.findOne({ _id: decoded._id })

        if (!domain) {
            throw new Error()
        }

        req.token = token
        req.domain = domain
        req.environment = decoded.environment
        next()
    } catch (e) {
        res.status(401).send({ error: 'Invalid API token.' })
    }
}