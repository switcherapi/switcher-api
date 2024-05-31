import mongoose from 'mongoose';
import moment from 'moment';

export const SLACK_SUB = 'Switcher Slack App';

export const TicketValidationType = Object.freeze({
    VALIDATED: 'VALIDATED',
    IGNORED_ENVIRONMENT: 'IGNORED_ENVIRONMENT',
    FROZEN_ENVIRONMENT: 'FROZEN_ENVIRONMENT'
});

const slackTicketSchema = new mongoose.Schema({
    slack: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Slack'
    },
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
    date_closed: {
        type: Date
    }
}, {
    timestamps: true
});

slackTicketSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (_doc, ret) {
        if (ret.updatedAt || ret.createdAt) {
            ret.updatedAt = moment(ret.updatedAt).format('YYYY-MM-DD HH:mm:ss');
            ret.createdAt = moment(ret.createdAt).format('YYYY-MM-DD HH:mm:ss');
        }
        return ret;
    }
};

export const SlackTicket = mongoose.model('SlackTicket', slackTicketSchema);