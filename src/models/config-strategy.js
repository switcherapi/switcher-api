const mongoose = require('mongoose')

const StrategiesType = Object.freeze({
    CIDR: 'CIDR_VALIDATION',
    USER: 'USER_VALIDATION',
    TIME: 'TIME_VALIDATION',
    LOCATION: 'LOCATION_VALIDATION'
  });

  const OperationsType = Object.freeze({
    EQUAL: 'EQUAL',
    EXIST: 'EXIST',
    GREATER: 'GREATER',
    LOWER: 'LOWER',
    BETWEEN: 'BETWEEN'
  });

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
        enum: Object.values(StrategiesType),
        required: true
    },
    values: [{
        value: {
            type: String,
            require: true,
            trim: true
        }
    }],
    operation: {
        type: String,
        enum: Object.values(OperationsType),
        require: true
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

Object.assign(configStrategySchema.statics, { StrategiesType, OperationsType });

const ConfigStrategy = mongoose.model('ConfigStrategy', configStrategySchema)

module.exports = {
    ConfigStrategy,
    StrategiesType,
    OperationsType
}