import mongoose from 'mongoose';

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
    ID: 'id'
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

export function getKeysByRouter(router, res) {
    const foundRouterSpec = Object.values(RouterKeySpec).find(routerSpec => routerSpec.router === router)

    if (!foundRouterSpec) {
        return res.status(404)
            .send({
                error: `Router '${router}' not found`,
                tip: `You might want one of these: ${Object.values(RouterTypes)}`
        })
    }

    return {
        key: foundRouterSpec.key
    }
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
})

export function checkActionType(actions) {
    for (let index = 0; index < actions.length; index++) {
        if (!Object.values(ActionTypes).includes(actions[index])) {
            throw new Error(`Role validation failed: action: '${actions[index]}' is not a valid enum value.`);
        }
    }
}

export const Role = mongoose.model('Role', roleSchema)