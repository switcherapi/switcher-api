import mongoose from 'mongoose';
import Config from './config';
import { EnvType } from '../models/environment';

const groupConfigSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
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
    }
}, {
    timestamps: true
})

groupConfigSchema.virtual('config', {
    ref: 'Config',
    localField: '_id',
    foreignField: 'group'
})

groupConfigSchema.pre('remove', async function (next) {
    var ObjectId = (require('mongoose').Types.ObjectId);

    const group = this
    const config = await Config.find({ group: new ObjectId(group._id) })

    if (config) {
        config.forEach((c) => c.remove())
    }
    
    next()
})

const GroupConfig = mongoose.model('GroupConfig', groupConfigSchema)

export default GroupConfig;