"use strict";

import jwt from 'jsonwebtoken';
import Admin from '../models/admin';
import Domain from '../models/domain';
import Component from '../models/component';

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

export async function appAuth(req, res, next) {
    try {
        const token = req.header('Authorization').replace('Bearer ', '')
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const domain = await Domain.findOne({ _id: decoded._id }).lean()
        
        if (!domain || domain.apihash.substring(50,domain.apihash.length-1) !== decoded.vc) {
            throw new Error()
        }

        req.token = token
        req.domain = domain
        req.component = decoded.component
        req.environment = decoded.environment
        next()
    } catch (e) {
        res.status(401).send({ error: 'Invalid API token.' })
    }
}

export async function appGenerateCredentials(req, res, next) {
    try {
        const key = req.header('switcher-api-key')
        const domain = await Domain.findByCredentials(req.body.domain, key)

        if (!domain) {
            throw new Error()
        }

        const { name } = await Component.findOne({ name: req.body.component })

        if (!name) {
            throw new Error()
        }

        const token = await domain.generateAuthToken(req.body.environment, name)

        req.token = token
        req.domain = domain
        req.environment = req.body.environment
        next()
    } catch (e) {
        res.status(401).send({ error: 'Invalid token request' })
    }
}