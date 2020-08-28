import mongoose from 'mongoose';
import moment from 'moment';
import { Config } from './config';
import History from './history';
import { EnvType } from '../models/environment';
import { recordHistory } from './common/index'

const groupConfigSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
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
})

groupConfigSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret, options) {
        if (ret.updatedAt || ret.createdAt) {
            ret.updatedAt = moment(ret.updatedAt).format('YYYY-MM-DD HH:mm:ss');
            ret.createdAt = moment(ret.createdAt).format('YYYY-MM-DD HH:mm:ss');
        }
        return ret;
    }
}

async function recordGroupHistory(group, modifiedField) {
    if (group.__v !== undefined && modifiedField.length) {
        const oldGroup = await GroupConfig.findById(group._id);
        await recordHistory(modifiedField, oldGroup, group, group.domain);
    }
}

groupConfigSchema.virtual('config', {
    ref: 'Config',
    localField: '_id',
    foreignField: 'group'
})

groupConfigSchema.pre('remove', async function (next) {
    var ObjectId = (require('mongoose').Types.ObjectId);

    const group = this;
    const config = await Config.find({ group: new ObjectId(group._id) });

    if (config) {
        config.forEach(async (c) => await c.remove());
    }

    await History.deleteMany({ domainId: group.domain, elementId: group._id });
    next();
})

groupConfigSchema.pre('save', async function (next) {
    const group = this;
    await recordGroupHistory(group, this.modifiedPaths());
    next();
})

const GroupConfig = mongoose.model('GroupConfig', groupConfigSchema);

export default GroupConfig;