export const commonSchemaContent = (ref) => ({
    'application/json': {
        schema: {
            $ref: `#/components/schemas/${ref}`
        }
    }
});

export const commonArraySchemaContent = (ref) => ({
    'application/json': {
        schema: {
            type: 'array',
            items: {
                $ref: `#/components/schemas/${ref}`
            }
        }
    }
});