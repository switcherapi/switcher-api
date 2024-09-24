import { responseException } from '../exceptions.js';
import { checkGitopsIntegration, SwitcherKeys } from '../external/switcher-api-facade.js';

const PATH_CONSTRAINTS_NEW = {
    GROUP: 0,
    CONFIG: 1,
    STRATEGY: 2,
    COMPONENT: 2,
    STRATEGY_VALUE: 3
};

export async function featureFlag(req, res, next) {
    try {
        await checkGitopsIntegration(req.domain);
        next();
    } catch (e) {
        responseException(res, e, 400, SwitcherKeys.GITOPS_INTEGRATION);
    }
};

export function validateChanges(req, res, next) {
    try {
        req.body = req.body || {};
        const changes = req.body.changes;

        validatePathForElement(changes);
        validateChangesContent(changes);
        next();
    } catch (e) {
        res.status(422).send({
            errors: [{
                msg: e.message,
                location: 'body'
            }]
        });
    }
}

function validatePathForElement(changes) {
    for (const change of changes) {
        if (change.action === 'NEW') {
            const path = change.path;
            const diff = change.diff;
            if (path.length !== PATH_CONSTRAINTS_NEW[diff]) {
                throw new Error('Request has invalid path settings for new element');
            }
        }
    }
}

function validateChangesContent(changes) {
    for (const change of changes) {
        if (['COMPONENT', 'STRATEGY_VALUE'].includes(change.diff)) {
            if (!Array.isArray(change.content)) {
                throw new Error('Request has invalid content type [object]');
            }
        } else if (Array.isArray(change.content)) {
            throw new Error('Request has invalid content type [array]');
        }
    }
}