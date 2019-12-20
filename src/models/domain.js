import mongoose from 'mongoose';
import moment from 'moment';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import GroupConfig from './group-config';
import History from './history';
import { EnvType, Environment } from './environment';
import { recordHistory } from './common/index'

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

domainSchema.virtual('history', {
    ref: 'History',
    localField: '_id',
    foreignField: 'elementId'
})

domainSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret, options) {
        if (ret.updatedAt || ret.createdAt) {
            ret.updatedAt = moment(ret.updatedAt).format('YYYY-MM-DD HH:mm:ss')
            ret.createdAt = moment(ret.createdAt).format('YYYY-MM-DD HH:mm:ss')
        }
        delete ret.apihash
        return ret
    }
}

domainSchema.methods.generateApiKey = async function () {
    const domain = this
    const apiKey = await bcrypt.hash(domain._id + domain.name, 8)
    const hash = await bcrypt.hash(apiKey, 8)
    domain.apihash = hash    
    await domain.save()

    return apiKey
}

domainSchema.methods.generateAuthToken = async function (environment, component) {
    const domain = this

    var options = {
        expiresIn: process.env.JWT_CLIENT_TOKEN_EXP_TIME
    };

    const token = jwt.sign(({ 
        _id: domain.id.toString(), 
        environment,
        component,
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
        group.forEach(async (g) => await g.remove())
    }

    const environment = await Environment.find({ domain: new ObjectId(domain._id) })
    if (environment) {
        environment.forEach(async (e) => await e.remove())
    }

    const history = await History.find({ elementId: new ObjectId(domain._id) })
    if (history) {
        history.forEach((h) => h.remove())
    }

    next()
})

async function recordDomainHistory(domain, modifiedField) {
    if (domain.__v !== undefined && modifiedField.length) {
        const oldDomain = await Domain.findById(domain._id).select(modifiedField);
        recordHistory(modifiedField, oldDomain, domain)
    }
}

domainSchema.pre('save', async function (next) {
    const domain = this
    await recordDomainHistory(domain, this.modifiedPaths());
    next()
})

const Domain = mongoose.model('Domain', domainSchema)

module.exports = Domain