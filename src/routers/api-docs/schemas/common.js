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