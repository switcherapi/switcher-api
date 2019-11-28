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

const OperationPerStrategy = [
    {
        strategy: StrategiesType.CIDR,
        operations: [OperationsType.EXIST]
    },
    {
        strategy: StrategiesType.USER,
        operations: [OperationsType.EXIST]
    },
    {
        strategy: StrategiesType.TIME,
        operations: [OperationsType.BETWEEN, OperationsType.LOWER, OperationsType.GREATER]
    },
    {
        strategy: StrategiesType.LOCATION,
        operations: [OperationsType.EXIST]
    }
]

const OperationValuesValidation = [
    {
        operation: OperationsType.EQUAL,
        min: 1
    },
    {
        operation: OperationsType.EXIST,
        min: 1
    },
    {
        operation: OperationsType.GREATER,
        min: 1
    },
    {
        operation: OperationsType.LOWER,
        min: 1
    },
    {
        operation: OperationsType.BETWEEN,
        min: 2
    }
]

const strategyRequirements = (strategy, res) => {
    const foundStrategy = Object.values(StrategiesType).find(element => element === strategy)

    if (!foundStrategy) {
        return res.status(404)
            .send({
                message: `Strategy '${strategy}' not found`,
                tip: `You might want one of these: ${Object.values(StrategiesType)}`
        })
    }

    const operationsAvailable = OperationPerStrategy.find(element => element.strategy === foundStrategy).operations

    let operationRequirements = []
    operationsAvailable.forEach((o) => {
        operationRequirements.push(OperationValuesValidation.find(element => element.operation === o))
    })

    return {
        strategy,
        operationsAvailable,
        operationRequirements
    }
}

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

configStrategySchema.pre('save', async function (next) {
    const strategyConfig = this

    const strategy = strategyConfig.strategy
    const operation = strategyConfig.operation
    const minValues = OperationValuesValidation.find(element => element.operation === operation).min

    if (strategyConfig.values.length < minValues) {
        return new Error({
            message: `Unable to complete the operation. The number of values for the operation '${operation}', should contain at least ${minValues} items`
        })
    }

    const operations = OperationPerStrategy.find(element => element.strategy === strategy).operations
    const foundOperation = operations.filter((element) => element === operation)

    if (!foundOperation) {
        return new Error({
            message: `Unable to complete the operation. The strategy '${strategy}' needs ${operations} as operation`
        })
    }

    next()
})

Object.assign(configStrategySchema.statics, { StrategiesType, OperationsType });

const ConfigStrategy = mongoose.model('ConfigStrategy', configStrategySchema)

module.exports = {
    ConfigStrategy,
    StrategiesType,
    OperationsType,
    strategyRequirements
}