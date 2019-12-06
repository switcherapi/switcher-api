import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import GroupConfig from './group-config';
import { EnvType } from './environment';

const domainSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 5,
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
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Admin'
    },
    token: {
        type: String
    }
}, {
    timestamps: true
})

domainSchema.virtual('groupConfig', {
    ref: 'GroupConfig',
    localField: '_id',
    foreignField: 'domain'
})

domainSchema.virtual('config', {
    ref: 'Config',
    localField: '_id',
    foreignField: 'domain'
})

domainSchema.virtual('configStrategy', {
    ref: 'ConfigStrategy',
    localField: '_id',
    foreignField: 'domain'
})

domainSchema.virtual('environment', {
    ref: 'Environment',
    localField: '_id',
    foreignField: 'domain'
})

domainSchema.methods.generateAuthToken = async function (environment) {
    const domain = this
    const token = jwt.sign(({ _id: domain.id.toString(), environment }), process.env.JWT_CONFIG_SECRET)

    return token
}

domainSchema.pre('remove', async function (next) {
    var ObjectId = (require('mongoose').Types.ObjectId);

    const domain = this
    const group = await GroupConfig.find({ domain: new ObjectId(domain._id) })
    
    if (group) {
        group.forEach((g) => g.remove())
    }
    
    next()
})

const Domain = mongoose.model('Domain', domainSchema)

module.exports = Domain