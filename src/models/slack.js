import mongoose from 'mongoose';
import moment from 'moment';
import { SlackTicket } from './slack_ticket.js';

const slackSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        trim: true
    },
    team_id: {
        type: String,
        required: true,
        trim: true
    },
    domain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Domain'
    },
    enterprise_id: {
        type: String,
        trim: true
    },
    installation_payload: {
        type: Object
    },
    bot_payload: {
        type: Object
    },
    settings: {
        ignored_environments: [{
            type: String    
        }],
        frozen_environments: [{
            type: String    
        }]
    },
}, {
    timestamps: true
});

slackSchema.virtual('slack_ticket', {
    ref: 'SlackTicket',
    localField: '_id',
    foreignField: 'slack'
});

slackSchema.options.toJSON = {
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

slackSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    const slack = this;
    await SlackTicket.deleteMany({ slack: slack._id }).exec();
    next();
});

const Slack = mongoose.model('Slack', slackSchema);

export default Slack;