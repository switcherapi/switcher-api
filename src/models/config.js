const mongoose = require('mongoose')
const { ConfigStrategy } = require('./config-strategy')

const configSchema = new mongoose.Schema({
    key: {
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
    group: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'GroupConfig'
    }, 
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Admin'
    }
}, {
    timestamps: true
})

configSchema.virtual('configStrategy', {
    ref: 'ConfigStrategy',
    localField: '_id',
    foreignField: 'config'
})

configSchema.methods.toJSON = function () {
    const config = this
    const configObject = config.toObject()
    
    return configObject
}

configSchema.pre('remove', async function (next) {
    const config = this
    await ConfigStrategy.deleteMany({ config: config._id })
    next()
})

const Config = mongoose.model('Config', configSchema)

module.exports = Config