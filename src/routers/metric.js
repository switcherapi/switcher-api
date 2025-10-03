import express from 'express';
import { check, query } from 'express-validator';
import { auth } from '../middleware/auth.js';
import { responseException } from '../exceptions/index.js';
import { 
    deleteMetrics,
    getData,
    getStatistics
} from '../services/metric.js';
import { validate } from '../middleware/validators.js';

const router = new express.Router();

// GET /metric/data/ID??key=&component=&result=&group=&dateBefore=&dateAfter=
// GET /metric/data/ID?sortBy=-date;key;component;result
// GET /metric/data/ID?page=1
router.get('/metric/data/', auth, [
    check('domainid').isMongoId(), 
    check('page', 'page is required as query parameter').isLength({ min: 1 })
], validate, async (req, res) => {
    try {
        const page = String(req.query.page);
        if (isNaN(page)) {
            throw new TypeError('Page value should be a number');
        }

        const data = await getData(req, page);
        if (!data) {
            return res.send();
        }

        res.send({ data });
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/metric/statistics/', auth, [
    query('domainid').isMongoId(),
    query('statistics', 'add one or more options {swicthers,components,reasons,all} separed by comma').isLength({ min: 3 }),
    query('dateGroupPattern', 'e.g. YYYY-MM-DD HH:mm').optional().isLength({ max: 16 }),
    query('key').optional().isLength({ max: 30 }),
    query('environment').optional().isLength({ max: 30 }),
    query('result').optional().isBoolean(),
    query('component').optional().isLength({ max: 50 }),
    query('group').optional().isLength({ max: 30 }),
    query('dateBefore').optional().isISO8601(),
    query('dateAfter').optional().isISO8601()
], validate, async (req, res) => {
    try {
        const result = await getStatistics(req);
        if (!result) {
            return res.send();
        }

        res.send(result);
    } catch (e) {
        responseException(res, e, 500);
    }

});

router.delete('/metric', auth, [
    check('domainid').isMongoId(),
    check('key', 'switcher key must be provided').isLength({ min: 1 })
], validate, async (req, res) => {
    try {
        await deleteMetrics(req);
        res.send({ message: 'Switcher metrics deleted' });
    } catch (e) {
        responseException(res, e, 500);
    }
});

export default router;