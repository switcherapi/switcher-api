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

export const queryParameter = (name, description, required, type) => ({
    in: 'query',
    name,
    description,
    required,
    schema: {
        type: type || 'string'
    }
});

export const pathParameter = (name, description, required) => ({
    in: 'path',
    name,
    description,
    required,
    schema: {
        type: 'string'
    }
});

export const commonSchema = {
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
