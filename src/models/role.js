import mongoose from 'mongoose';

export const ActionTypes = Object.freeze({
    CREATE: 'CREATE',
    REMOVE: 'REMOVE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    SELECT: 'SELECT'
});

export const RouterTypes = Object.freeze({
    ALL: 'ALL',
    DOMAIN: 'DOMAIN',
    GROUP: 'GROUP',
    CONFIG: 'CONFIG',
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