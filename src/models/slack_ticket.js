import mongoose from 'mongoose';

export const SLACK_SUB = 'Switcher Slack App';
export const TicketStatusType = Object.freeze({
    OPENED: 'OPENED',
    APPROVED: 'APPROVED',
    DENIED: 'DENIED'
});

export const TicketValidationType = Object.freeze({
    VALIDATED: 'VALIDATED',
    IGNORED_ENVIRONMENT: 'IGNORED_ENVIRONMENT',
    FROZEN_ENVIRONMENT: 'FROZEN_ENVIRONMENT'
});

export const slackTicketSchema = new mongoose.Schema({
    environment: {
        type: String,
        required: true
    },
    group: {
        type: String,
        required: true
    },
    switcher: {
        type: String
    },
    status: {
        type: Boolean,
        required: true
    },
    observations: {
        type: String
    },
    ticket_status: {
        type: String,
        enum: Object.values(TicketStatusType),
        default: TicketStatusType.OPENED,
        required: true
    },
    date_closed: {
        type: Date
    }
}, {
    timestamps: true
});