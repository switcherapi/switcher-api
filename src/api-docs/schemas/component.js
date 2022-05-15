export const component = {
    type: 'object',
    properties: {
        _id: {
            type: 'string',
            description: 'The unique identifier of the component'
        },
        name: {
            type: 'string',
            description: 'The name given to the component'
        },
        description: {
            type: 'string',
            description: 'The description of the component'
        },
        domain: {
            type: 'uuid',
            description: 'The domain ID parent of the component',
            format: 'uuid'
        },
        owner: {
            type: 'uuid',
            description: 'The owner id of the component'
        },
        apihash: {
            type: 'string',
            description: 'The api hash of the component',
            format: 'base64'
        },
        createdAt: {
            type: 'string',
            description: 'The date when the component was created',
            format: 'date-time'
        },
        updatedAt: {
            type: 'string',
            description: 'The date when the component was updated',
            format: 'date-time'
        }
    }
};

export default {
    Component: component
};