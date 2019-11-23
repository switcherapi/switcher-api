const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const GroupConfig = require('./group-config')

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
        type: Boolean,
        required: true,
        default: true
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