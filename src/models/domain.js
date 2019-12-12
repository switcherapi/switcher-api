import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
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
    apihash: {
        type: String,
        required: true,
        unique: true
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

domainSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret, options) {
        delete ret.apihash
        return ret
    }
}

domainSchema.methods.generateApiKey = async function () {
    const domain = this
    const apiKey = await bcrypt.hash(domain._id + domain.name, 8)
    const hash = await bcrypt.hash(apiKey, 8)
    domain.apihash = hash    
    domain.save()

    return apiKey
}

domainSchema.methods.generateAuthToken = async function (environment) {
    const domain = this

    var options = {
        expiresIn: process.env.JWT_CLIENT_TOKEN_EXP_TIME
    };

    const token = jwt.sign(({ 
        _id: domain.id.toString(), 
        environment, 
        vc: domain.apihash.substring(50, domain.apihash.length-1) 
    }), process.env.JWT_SECRET, options)

    return token
}

domainSchema.statics.findByCredentials = async (name, apiKey) => {
    const domain = await Domain.findOne({ name })

    if (!domain) {
        throw new Error('Unable to find this Domain')
    }

    const isMatch = await bcrypt.compare(apiKey, domain.apihash)

    if (!isMatch) {
        throw new Error('Unable to find this Domain')
    }

    return domain
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