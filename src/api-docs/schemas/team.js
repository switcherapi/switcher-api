const team = {
    type: 'object',
    properties: {
        _id: {
            type: 'string',
            description: 'The unique identifier of the team'
        },
        name: {
            type: 'string',
            description: 'The name of the team'
        },
        active: {
            type: 'boolean',
            description: 'The status of the team'
        },
        domain: {
            type: 'string',
            description: 'The domain of the team',
            format: 'uuid'
        },
        permissions: {
            type: 'array',
            description: 'The permissions of the team',
            items: {
                type: 'string',
                format: 'uuid'
            }
        },
        members: {
            type: 'array',
            description: 'The members of the team',
            items: {
                type: 'string',
                format: 'uuid'
            }
        }
    }
};

export default {
    Team: team,
    TeamInvite: {
        type: 'object',
        properties: {
            _id: {
                type: 'string',
                description: 'The unique identifier of the team invite'
            },
            email: {
                type: 'string',
                description: 'The email of the member being invited',
                format: 'email'
            },
            teamid: {
                type: 'string',
                description: 'The Team ID from which the member is being invited',
                format: 'uuid'
            },
            createdAt: {
                type: 'string',
                description: 'The date when the team invite was created'
            },
            updatedAt: {
                type: 'string',
                description: 'The date when the team invite was updated'
            }
        }
    }
};