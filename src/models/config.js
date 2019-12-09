import mongoose from 'mongoose';
import { ConfigStrategy } from './config-strategy';
import { EnvType } from './environment';

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
        type: Map,
        of: Boolean,
        required: true,
        default: new Map().set(EnvType.DEFAULT, true)
    },
    components: [{
        type: String,
        trim: true
    }],
    group: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'GroupConfig'
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

configSchema.virtual('configStrategy', {
    ref: 'ConfigStrategy',
    localField: '_id',
    foreignField: 'config'
})

configSchema.pre('remove', async function (next) {
    const config = this
    await ConfigStrategy.deleteMany({ config: config._id })
    next()
})

const Config = mongoose.model('Config', configSchema)

export default Config;