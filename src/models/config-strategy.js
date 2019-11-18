const mongoose = require('mongoose')

const configStrategySchema = new mongoose.Schema({
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
    strategy: {
        type: String,
        required: true,
        default: '1 === 1'
    },
    config: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Config'
    }, 
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Admin'
    }
}, {
    timestamps: true
})

const ConfigStrategy = mongoose.model('ConfigStrategy', configStrategySchema)

module.exports = ConfigStrategy