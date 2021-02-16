import mongoose from 'mongoose';
import { NotFoundError } from '../exceptions';

export const ActionTypes = Object.freeze({
    ALL: 'ALL',
    CREATE: 'CREATE',
    READ: 'READ',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE'
});

export const RouterTypes = Object.freeze({
    ALL: 'ALL',
    ADMIN: 'ADMIN',
    DOMAIN: 'DOMAIN',
    GROUP: 'GROUP',
    CONFIG: 'SWITCHER',
    STRATEGY: 'STRATEGY',
    COMPONENT: 'COMPONENT',
    ENVIRONMENT: 'ENVIRONMENT'
});

export const KeyTypes = Object.freeze({
    STRATEGY: 'strategy',
    NAME: 'name',
    KEY: 'key',
    ID: 'id',
    EMPTY: ''
});

const RouterKeySpec = [
    {
        router: RouterTypes.DOMAIN,
        key: KeyTypes.NAME
    },
    {
        router: RouterTypes.GROUP,
        key: KeyTypes.NAME
    },
    {
        router: RouterTypes.CONFIG,
        key: KeyTypes.KEY
    },
    {
        router: RouterTypes.STRATEGY,
        key: KeyTypes.STRATEGY
    }
];

export function getKeysByRouter(router) {
    const foundRouterSpec = Object.values(RouterKeySpec).find(routerSpec => routerSpec.router === router);

    if (!foundRouterSpec) {
        throw new NotFoundError(`Router '${router}' not found. You might want one of these: ${Object.values(RouterTypes)}`);
    }

    return {
        key: foundRouterSpec.key
    };
}

const roleSchema = new mongoose.Schema({
    action: {
        type: String,
        enum: Object.values(ActionTypes),
        required: true
    },
    active: {
        type: Boolean,
        required: true,
        default: true
    },
    router: {
        type: String,
        enum: Object.values(RouterTypes),
        required: true
    },
    identifiedBy: {
        type: String,
        enum: Object.values(KeyTypes)
    },
    values: [{
        type: String
    }]
});

export function checkActionType(actions) {
    for (const action of actions) {
        if (!Object.values(ActionTypes).includes(action)) {
            throw new Error(`Role validation failed: action: '${action}' is not a valid enum value.`);
        }
    }
}

export const Role = mongoose.model('Role', roleSchema);