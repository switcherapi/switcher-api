import { TicketStatusType } from '../../models/slack_ticket.js';

const ticket = {
    type: 'object',
    properties: {
        environment: {
            type: 'string',
            description: 'The environment'
        },
        group: {
            type: 'string',
            description: 'The Group ID'
        },
        switcher: {
            type: 'string',
            description: 'The Switcher ID'
        },
        status: {
            type: 'boolean',
            description: 'The status to be set'
        },
        observations: {
            type: 'string',
            description: 'The ticket observations'
        },
        ticket_status: {
            type: 'string',
            enum: Object.values(TicketStatusType),
            default: TicketStatusType.OPENED
        },
        date_closed: {
            type: 'string',
            description: 'The date closed'
        },
        createdAt: {
            type: 'string',
            description: 'The date created'
        },
        updatedAt: {
            type: 'string',
            description: 'The date updated'
        }
    }
};

const installation_payload = {
    type: 'object',
    properties: {
        app_id: {
            type: 'string',
            description: 'The app ID'
        },
        enterprise_id: {
            type: 'string',
            description: 'The enterprise ID'
        },
        enterprise_name: {
            type: 'string',
            description: 'The enterprise name'
        },
        enterprise_url: {
            type: 'string',
            description: 'The enterprise URL'
        },
        team_id: {
            type: 'string',
            description: 'The team ID'
        },
        team_name: {
            type: 'string',
            description: 'The team name'
        },
        bot_token: {
            type: 'string',
            description: 'The bot token'
        },
        bot_id: {
            type: 'string',
            description: 'The bot ID'
        },
        bot_user_id: {
            type: 'string',
            description: 'The bot user ID'
        },
        bot_scopes: {
            type: 'array',
            description: 'The bot scopes',
            items: {
                type: 'string'
            }
        },
        user_id: {
            type: 'string',
            description: 'The user ID'
        },
        user_token: {
            type: 'string',
            description: 'The user token'
        },
        user_scopes: {
            type: 'array',
            description: 'The user scopes',
            items: {
                type: 'string'
            }
        },
        incoming_webhook_url: {
            type: 'string',
            description: 'The incoming webhook URL'
        },
        incoming_webhook_channel: {
            type: 'string',
            description: 'The incoming webhook channel'
        },
        incoming_webhook_channel_id: {
            type: 'string',
            description: 'The incoming webhook channel ID'
        },
        incoming_webhook_configuration_url: {
            type: 'string',
            description: 'The incoming webhook configuration URL'
        },
        is_enterprise_install: {
            type: 'boolean',
            description: 'Is enterprise install'
        },
        installed_at: {
            type: 'number',
            description: 'The date installed'
        }
    }
};

const bot_payload = {
    type: 'object',
    properties: {
        app_id: installation_payload.properties.app_id,
        enterprise_id: installation_payload.properties.enterprise_id,
        enterprise_name: installation_payload.properties.enterprise_name,
        team_id: installation_payload.properties.team_id,
        team_name: installation_payload.properties.team_name,
        bot_token: installation_payload.properties.bot_token,
        bot_id: installation_payload.properties.bot_id,
        bot_user_id: installation_payload.properties.bot_user_id,
        bot_scopes: installation_payload.properties.bot_scopes,
        is_enterprise_install: installation_payload.properties.is_enterprise_install,
        installed_at: installation_payload.properties.installed_at
    }
};

const slack = {
    type: 'object',
    properties: {
        _id: {
            type: 'string',
            description: 'The Slack App ID'
        },
        user_id: installation_payload.properties.user_id,
        team_id: installation_payload.properties.team_id,
        domain: {
            type: 'string',
            description: 'The domain ID',
            format: 'uuid'
        },
        enterprise_id: {
            type: 'string',
            description: 'The Slack enterprise ID'
        },
        installation_payload,
        bot_payload,
        settings: {
            type: 'object',
            properties: {
                ignored_environments: {
                    type: 'array',
                    description: 'Environments that should be ignored for the approval request',
                    items: {
                        type: 'string'
                    }
                },
                frozen_environments: {
                    type: 'array',
                    description: 'Environments that should not change',
                    items: {
                        type: 'string'
                    }
                }
            }
        },
        tickets: {
            type: 'array',
            items: ticket
        },
        createdAt: {
            type: 'string',
            description: 'The date and time the Slack was created',
            format: 'date-time'
        },
        updatedAt: {
            type: 'string',
            description: 'The date and time the Slack was updated',
            format: 'date-time'
        }
    }
};

const ticket_content = {
    type: 'object',
    properties: {
        environment: {
            type: 'string',
            description: 'The environment where the chanhe will be applied'
        },
        group: {
            type: 'string',
            description: 'The group name'
        },
        switcher: {
            type: 'string',
            description: 'The switcher name'
        },
        status: {
            type: 'string',
            description: 'The status name',
            enum: [ 'True', 'False' ]
        }
    }
};

export default {
    Slack: slack,
    SlackInstallation: installation_payload,
    SlackBot: bot_payload,
    SlackTicket: ticket,
    SlackInstallationRequest: {
        type: 'object',
        properties: {
            enterprise_id: installation_payload.properties.enterprise_id,
            team_id: installation_payload.properties.team_id,
            user_id: installation_payload.properties.user_id,
            installation_payload,
            bot_payload
        }
    },
    SlackTicketRequest: {
        type: 'object',
        properties: {
            team_id: installation_payload.properties.team_id,
            ticket_content
        }
    },
    SlackTicketProcessRequest: {
        type: 'object',
        properties: {
            team_id: installation_payload.properties.team_id,
            ticket_id: {
                type: 'string',
                description: 'The Slack ticket ID'
            },
            approved: {
                type: 'boolean',
                description: 'The approval status'
            }
        }
    },
    SlackInstallationSummary: {
        type: 'object',
        properties: {
            team_id: installation_payload.properties.team_id,
            team_name: installation_payload.properties.team_name,
            bot_scopes: installation_payload.properties.bot_scopes,
            channel_id: installation_payload.properties.incoming_webhook_channel_id,
            is_enterprise: installation_payload.properties.is_enterprise_install,
            tickets_opened: {
                type: 'number',
                description: 'The number of tickets opened'
            },
            tickets_approved: {
                type: 'number',
                description: 'The number of tickets approved'
            },
            tickets_denied: {
                type: 'number',
                description: 'The number of tickets denied'
            },
            settings: slack.properties.settings
        }
    },
    SlackInstallationSettings: {
        type: 'object',
        properties: {
            settings: slack.properties.settings
        }
    }
};