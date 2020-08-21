import express from 'express';
import Domain from '../models/domain';
import { Environment } from '../models/environment';
import History from '../models/history';
import { auth } from '../middleware/auth';
import { check, validationResult } from 'express-validator';
import { checkEnvironmentStatusChange, verifyInputUpdateParameters } from '../middleware/validators';
import { removeDomainStatus, verifyOwnership, responseException, NotFoundError, formatInput } from './common/index'
import { ActionTypes, RouterTypes } from '../models/role';
import GroupConfig from '../models/group-config';
import Config from '../models/config';
import { ConfigStrategy } from '../models/config-strategy';
import Component from '../models/component';

const router = new express.Router();

router.post('/domain/create', auth, async (req, res) => {
    try {
        let domain = new Domain({
            ...req.body,
            owner: req.admin._id
        });

        domain.name = formatInput(domain.name, { allowSpace: true });
        const environment = new Environment({
            domain: domain._id,
            owner: req.admin._id
        });

        environment.save();
        await domain.save();
        res.status(201).send(domain);
    } catch (e) {
        res.status(400).send(e);
    }
})

// GET /domain?limit=10&skip=20
// GET /domain?sortBy=createdAt:desc
router.get('/domain', auth, async (req, res) => {
    const sort = {};

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':');
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }

    try {
        await req.admin.populate({
            path: 'domain',
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate();
        res.send(req.admin.domain);
    } catch (e) {
        res.status(500).send();
    }
})

router.get('/domain/:id', auth, async (req, res) => {
    try {
        let domain = await Domain.findById(req.params.id);

        if (!domain) {
            return res.status(404).send();
        }

        domain = await verifyOwnership(req.admin, domain, domain._id, ActionTypes.READ, RouterTypes.DOMAIN, true);
        
        res.send(domain);
    } catch (e) {
        responseException(res, e, 400);
    }
})

// GET /domain/ID?sortBy=date:desc
// GET /domain/ID?limit=10&skip=20
// GET /domain/ID
router.get('/domain/history/:id', auth, async (req, res) => {
    const sort = {};

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':');
        sort[`${parts[0]}`] = parts[1] === 'desc' ? -1 : 1;
    }

    try {
        const domain = await Domain.findById(req.params.id);

        if (!domain) {
            return res.status(404).send();
        }

        const history = await History.find({ elementId: domain._id })
            .select('oldValue newValue updatedBy date -_id')
            .sort(sort)
            .limit(parseInt(req.query.limit))
            .skip(parseInt(req.query.skip));

        await verifyOwnership(req.admin, domain, domain._id, ActionTypes.READ, RouterTypes.DOMAIN);

        res.send(history);
    } catch (e) {
        responseException(res, e, 400);
    }
})

router.delete('/domain/history/:id', auth, async (req, res) => {
    try {
        const domain = await Domain.findById(req.params.id);

        if (!domain) {
            return res.status(404).send();
        }

        await verifyOwnership(req.admin, domain, domain._id, ActionTypes.DELETE, RouterTypes.ADMIN);

        await History.deleteMany({ elementId: domain._id });

        res.send(domain);
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.delete('/domain/:id', auth, async (req, res) => {
    try {
        let domain = await Domain.findById(req.params.id);

        if (!domain) {
            return res.status(404).send();
        }

        domain = await verifyOwnership(req.admin, domain, domain._id, ActionTypes.DELETE, RouterTypes.DOMAIN);

        await domain.remove();
        res.send(domain);
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.patch('/domain/transfer/request', [check('domain').isMongoId()], auth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }
        
        let domain = await Domain.findOne({ _id: req.body.domain, owner: req.admin._id });
        if (!domain) {
            throw new NotFoundError('Domain does not exist');
        }

        domain.updatedBy = req.admin.email;
        domain.transfer = domain.transfer ? null : true;
        await domain.save();
        res.send(domain);
    } catch (e) {
        responseException(res, e, 400);
    }
})

router.patch('/domain/transfer/accept', [check('domain').isMongoId()], auth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }
        
        let domain = await Domain.findOne({ _id: req.body.domain, transfer: true });
        if (!domain) {
            throw new NotFoundError('Domain does not exist');
        }
        
        domain.transfer = null;
        domain.owner = req.admin._id;
        await Promise.all([
            GroupConfig.updateMany({ domain: domain._id }, { owner: req.admin._id }),
            Config.updateMany({ domain: domain._id }, { owner: req.admin._id }),
            ConfigStrategy.updateMany({ domain: domain._id }, { owner: req.admin._id }),
            Component.updateMany({ domain: domain._id }, { owner: req.admin._id }),
            Environment.updateMany({ domain: domain._id }, { owner: req.admin._id }),
            domain.save()
        ]);
        
        res.send(domain);
    } catch (e) {
        responseException(res, e, 400);
    }
})

router.patch('/domain/:id', auth,
    verifyInputUpdateParameters(['description']), async (req, res) => {
    try {
        let domain = await Domain.findById(req.params.id);

        if (!domain) {
            return res.status(404).send();
        }

        domain = await verifyOwnership(req.admin, domain, domain._id, ActionTypes.UPDATE, RouterTypes.DOMAIN);
        domain.updatedBy = req.admin.email;
        domain.lastUpdate = Date.now();
        
        req.updates.forEach((update) => domain[update] = req.body[update]);
        await domain.save();
        res.send(domain);
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.patch('/domain/updateStatus/:id', auth, async (req, res) => {
    try {
        let domain = await Domain.findById(req.params.id);

        if (!domain) {
            return res.status(404).send({ error: 'Domain does not exist' });
        }

        domain = await verifyOwnership(req.admin, domain, domain._id, ActionTypes.UPDATE, RouterTypes.DOMAIN);
        domain.updatedBy = req.admin.email;
        domain.lastUpdate = Date.now();

        const updates = await checkEnvironmentStatusChange(req, res, req.params.id);

        updates.forEach((update) => domain.activated.set(update, req.body[update]));
        await domain.save();
        res.send(domain);
    } catch (e) {
        responseException(res, e, 400);
    }
})

router.patch('/domain/removeStatus/:id', auth, async (req, res) => {
    try {
        let domain = await Domain.findById(req.params.id);
        
        if (!domain) {
            return res.status(404).send({ error: 'Domain does not exist' });
        }

        domain = await verifyOwnership(req.admin, domain, domain._id, ActionTypes.UPDATE, RouterTypes.DOMAIN);
        domain.updatedBy = req.admin.email;
        domain.lastUpdate = Date.now();
        
        res.send(await removeDomainStatus(domain, req.body.env));
    } catch (e) {
        responseException(res, e, 400);
    }
})

export default router;