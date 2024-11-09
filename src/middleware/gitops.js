import { responseException } from '../exceptions/index.js';
import { checkGitopsIntegration, SwitcherKeys } from '../external/switcher-api-facade.js';

const PATH_CONSTRAINTS_NEW = {
    GROUP: 0,
    CONFIG: 1,
    STRATEGY: 2,
    COMPONENT: 2
};

const PATH_CONSTRAINTS_CHANGED = {
    GROUP: 1,
    CONFIG: 2,
    STRATEGY: 3
};

const PATH_CONSTRAINTS_DELETED = {
    GROUP: 1,
    CONFIG: 2,
    STRATEGY: 3,
    RELAY: 2,
    COMPONENT: 2
};

const CONTENT_TYPE_ARRAY = ['COMPONENT'];

export async function featureFlag(req, res, next) {
    try {
        const domainId = req.path === '/gitops/v1/push' ? 
            req.domain : req.body?.domain.id || req.params.domain;
        
        await checkGitopsIntegration(domainId);
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
        const path = change.path;
        const diff = change.diff;

        switch (change.action) {
            case 'NEW':
                if (path.length !== PATH_CONSTRAINTS_NEW[diff]) {
                    throw new Error('Request has invalid path settings for new element');
                }
                break;
            case 'CHANGED':
                if (path.length !== PATH_CONSTRAINTS_CHANGED[diff]) {
                    throw new Error('Request has invalid path settings for changed element');
                }
                break;
            case 'DELETED':
                if (path.length !== PATH_CONSTRAINTS_DELETED[diff]) {
                    throw new Error('Request has invalid path settings for deleted element');
                }
                break;
        }
    }
}

function validateChangesContent(changes) {
    for (const change of changes) {
        if (CONTENT_TYPE_ARRAY.includes(change.diff)) {
            if (!Array.isArray(change.content)) {
                throw new Error('Request has invalid content type [object]');
            }
        } else if (Array.isArray(change.content)) {
            throw new Error('Request has invalid content type [array]');
        }
    }
}