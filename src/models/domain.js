import mongoose from 'mongoose';
import moment from 'moment';
import Component from './component.js';
import GroupConfig from './group-config.js';
import History from './history.js';
import { Metric } from './metric.js';
import { Team } from './team.js';
import { EnvType, Environment } from './environment.js';
import { recordHistory } from './common/index.js';

const domainSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 5,
        maxlength: 30
    },
    description: {
        type: String,
        trim: true,
        maxlength: 256
    },
    activated: {
        type: Map,
        of: Boolean,
        required: true,
        default: new Map().set(EnvType.DEFAULT, true)
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Admin'
    },
    integrations: {
        slack: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Slack'
        },
        relay: {
            verification_code: {
                type: String
            }
        }
    },
    lastUpdate: {
        type: Number,
        default: Date.now()
    },
    updatedBy: {
        type: String
    },
    transfer: {
        type: Boolean
    }
}, {
    timestamps: true
});

domainSchema.virtual('admin', {
    ref: 'Admin',
    localField: 'owner',
    foreignField: '_id',
    justOne: true
});

domainSchema.virtual('groupConfig', {
    ref: 'GroupConfig',
    localField: '_id',
    foreignField: 'domain'
});

domainSchema.virtual('config', {
    ref: 'Config',
    localField: '_id',
    foreignField: 'domain'
});

domainSchema.virtual('configStrategy', {
    ref: 'ConfigStrategy',
    localField: '_id',
    foreignField: 'domain'
});

domainSchema.virtual('environment', {
    ref: 'Environment',
    localField: '_id',
    foreignField: 'domain'
});

domainSchema.virtual('team', {
    ref: 'Team',
    localField: '_id',
    foreignField: 'domain'
});

domainSchema.options.toJSON = {
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

domainSchema.pre('deleteOne', { document: true, query: false }, async function () {
    const groups = await GroupConfig.find({ domain: this._id }).exec();

    if (groups) {
        for (const group of groups) {
            await Promise.resolve(group.deleteOne());
        }
    }

    const teams = await Team.find({ domain: this._id }).exec();
    if (teams) {
        for (const team of teams) {
            await Promise.resolve(team.deleteOne());
        }
    }

    await Promise.all([
        Component.deleteMany({ domain: this._id }),
        Environment.deleteMany({ domain: this._id }), 
        History.deleteMany({ domainId: this._id }), 
        Metric.deleteMany({ domain: this._id })
    ]);
});

async function recordDomainHistory(domain, modifiedField) {
    if (domain.__v !== undefined && modifiedField.length) {
        const oldDomain = await Domain.findById(domain._id).exec();
        await recordHistory(modifiedField, oldDomain, domain, domain._id, ['lastUpdate']);
    }
}

domainSchema.pre('save', async function () {
    await recordDomainHistory(this, this.modifiedPaths());
});

const Domain = mongoose.model('Domain', domainSchema);

export default Domain;