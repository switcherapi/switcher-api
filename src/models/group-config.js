import mongoose from 'mongoose';
import moment from 'moment';
import { Config } from './config.js';
import History from './history.js';
import { EnvType } from '../models/environment.js';
import { recordHistory } from './common/index.js';

const groupConfigSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 30,
        minlength: 2
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
    domain: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Domain'
    }, 
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Admin'
    },
    updatedBy: {
        type: String
    }
}, {
    timestamps: true
});

groupConfigSchema.options.toJSON = {
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

async function recordGroupHistory(group, modifiedField) {
    if (group.__v !== undefined && modifiedField.length) {
        const oldGroup = await GroupConfig.findById(group._id).exec();
        await recordHistory(modifiedField, oldGroup, group, group.domain);
    }
}

groupConfigSchema.virtual('admin', {
    ref: 'Admin',
    localField: 'owner',
    foreignField: '_id',
    justOne: true
});

groupConfigSchema.virtual('config', {
    ref: 'Config',
    localField: '_id',
    foreignField: 'group'
});

groupConfigSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    const configs = await Config.find({ group: this._id }).exec();

    if (configs) {
        for (const config of configs) {
            await Promise.resolve(config.deleteOne());
        }
    }

    await History.deleteMany({ domainId: this.domain, elementId: this._id }).exec();
    next();
});

groupConfigSchema.pre('save', async function (next) {
    await recordGroupHistory(this, this.modifiedPaths());
    next();
});

const GroupConfig = mongoose.model('GroupConfig', groupConfigSchema);

export default GroupConfig;