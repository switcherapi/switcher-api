export const commonSchemaContent = (ref) => ({
    'application/json': {
        schema: {
            $ref: `#/components/schemas/${ref}`
        }
    }
});