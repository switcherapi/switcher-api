const mongoose = require('mongoose')
const Admin = require('./admin')
const Domain = require('./domain')
const Config = require('./config')

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
        type: Boolean,
        required: true,
        default: true
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

groupConfigSchema.methods.toJSON = function () {
    const groupConfig = this
    const groupConfigObject = groupConfig.toObject()
    
    return groupConfigObject
}

groupConfigSchema.pre('remove', async function (next) {
    const group = this
    const config = await Config.find({ group: group._id })

    if (config) {
        config.forEach((c) => c.remove())
    }
    
    next()
})

const GroupConfig = mongoose.model('GroupConfig', groupConfigSchema)

module.exports = GroupConfig