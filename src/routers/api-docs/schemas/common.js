export const commonSchema = {
    Message: {
        type: 'object',
        properties: {
            message: {
                type: 'string'
            }
        }
    }
};

export const pagination = [
    {
        in: 'query',
        name: 'sortBy',
        description: 'Sort by',
        schema: {
            type: 'string',
            enum: ['createdAt:desc', 'createdAt:asc', 'updatedAt:desc', 'updatedAt:asc']
        }
    },
    {
        in: 'query',
        name: 'skip',
        description: 'Skip',
        schema: {
            type: 'integer',
            minimum: 0
        }
    },
    {
        in: 'query',
        name: 'limit',
        description: 'Limit',
        schema: {
            type: 'integer',
            minimum: 0
        }
    }
];

export default {
    Message: {
        type: 'object',
        properties: {
            message: {
                type: 'string'
            }
        }
    },
    History: {
        type: 'object',
        properties: {
            domainId: {
                type: 'string',
                format: 'uuid'
            },
            elementId: {
                type: 'string',
                format: 'uuid'
            },
            oldValue: {
                type: 'object'
            },
            newValue: {
                type: 'object'
            },
            updatedBy: {
                type: 'string'
            },
            date: {
                type: 'string',
                format: 'date-time'
            }
        }
    }
};
