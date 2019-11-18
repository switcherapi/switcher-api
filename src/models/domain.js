const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const GroupConfig = require('./group-config')
const Config = require('./config')
const ConfigStrategy = require('./config-strategy')

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

domainSchema.methods.generateAuthToken = async function () {
    const domain = this
    const token = jwt.sign(({ _id: domain.id.toString() }), process.env.JWT_CONFIG_SECRET)

    return token
}

domainSchema.pre('remove', async function (next) {
    const domain = this
    const group = await GroupConfig.find({ domain: domain._id })

    if (group) {
        group.forEach((g) => g.remove())
    }
    
    next()
})

const Domain = mongoose.model('Domain', domainSchema)

module.exports = Domain