import mongoose from 'mongoose';
import moment from 'moment';
import History from './history.js';
import { recordHistory } from './common/index.js';
import { NotFoundError } from '../exceptions/index.js';

export const StrategiesType = Object.freeze({
    NETWORK: 'NETWORK_VALIDATION',
    VALUE: 'VALUE_VALIDATION',
    NUMERIC: 'NUMERIC_VALIDATION',
    TIME: 'TIME_VALIDATION',
    DATE: 'DATE_VALIDATION',
    REGEX: 'REGEX_VALIDATION',
    PAYLOAD: 'PAYLOAD_VALIDATION'
});

export const OperationsType = Object.freeze({
    EQUAL: 'EQUAL',
    NOT_EQUAL: 'NOT_EQUAL',
    EXIST: 'EXIST',
    NOT_EXIST: 'NOT_EXIST',
    GREATER: 'GREATER',
    LOWER: 'LOWER',
    BETWEEN: 'BETWEEN',
    HAS_ONE: 'HAS_ONE',
    HAS_ALL: 'HAS_ALL'
});

const StrategyRequirementDefinition = [
    {
        strategy: StrategiesType.NETWORK,
        operations: [OperationsType.EXIST, OperationsType.NOT_EXIST],
        format: '10.0.0.0/24 (CIDR) or 10.0.0.1 (IPv4 address)',
        validator: String.raw`^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$`
    },
    {
        strategy: StrategiesType.VALUE,
        operations: [OperationsType.EXIST, OperationsType.NOT_EXIST, OperationsType.EQUAL, OperationsType.NOT_EQUAL]
    },
    {
        strategy: StrategiesType.NUMERIC,
        operations: [OperationsType.EXIST, OperationsType.NOT_EXIST, OperationsType.EQUAL, OperationsType.NOT_EQUAL,
            OperationsType.BETWEEN, OperationsType.LOWER, OperationsType.GREATER],
        format: 'Numeric values (positive/negative or with decimal)',
        validator: String.raw`^((-[0-9]{1,})|([0-9]{1,}))(\.[0-9]{1,})?$`
    },
    {
        strategy: StrategiesType.TIME,
        operations: [OperationsType.BETWEEN, OperationsType.LOWER, OperationsType.GREATER],
        format: 'HH:mm',
        validator: '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$'
    },
    {
        strategy: StrategiesType.DATE,
        operations: [OperationsType.BETWEEN, OperationsType.LOWER, OperationsType.GREATER],
        format: 'YYYY-MM-DD or YYYY-MM-DD HH:mm',
        validator: '([12][0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))( (0[0-9]|1[0-9]|2[0-3]):[0-5][0-9])?$'
    },
    {
        strategy: StrategiesType.REGEX,
        operations: [OperationsType.EXIST, OperationsType.NOT_EXIST, OperationsType.EQUAL, OperationsType.NOT_EQUAL],
        format:  String.raw`Hint: NOT/EQUAL forces \b (delimiter) flag`
    },
    {
        strategy: StrategiesType.PAYLOAD,
        operations: [OperationsType.HAS_ONE, OperationsType.HAS_ALL]
    }
];

const OperationValuesValidation = [
    {
        operation: OperationsType.EQUAL,
        min: 1,
        max: 1
    },
    {
        operation: OperationsType.NOT_EQUAL,
        min: 1,
        max: 1
    },
    {
        operation: OperationsType.EXIST,
        min: 1,
        max: process.env.MAX_STRATEGY_OPERATION
    },
    {
        operation: OperationsType.NOT_EXIST,
        min: 1,
        max: process.env.MAX_STRATEGY_OPERATION
    },
    {
        operation: OperationsType.GREATER,
        min: 1,
        max: 1
    },
    {
        operation: OperationsType.LOWER,
        min: 1,
        max: 1
    },
    {
        operation: OperationsType.BETWEEN,
        min: 2,
        max: 2
    },
    {
        operation: OperationsType.HAS_ONE,
        min: 1,
        max: process.env.MAX_STRATEGY_OPERATION
    },
    {
        operation: OperationsType.HAS_ALL,
        min: 1,
        max: process.env.MAX_STRATEGY_OPERATION
    }
];

export function validateStrategyValue(strategy, value) {
    const strategyRules = StrategyRequirementDefinition.find(element => element.strategy === strategy);

    if (!value.match(strategyRules.validator)) {
        throw new Error(`Value does not match with the requirements for this Strategy. Please, try using: ${strategyRules.format}`);
    }
    return true;
}

export function strategyRequirements(strategy) {
    const foundStrategy = Object.values(StrategiesType).find(element => element === strategy);

    if (!foundStrategy) {
        throw new NotFoundError(`Strategy '${strategy}' not found. Please, try using: ${Object.values(StrategiesType)}`);
    }

    const operationsAvailable = StrategyRequirementDefinition.find(element => element.strategy === foundStrategy);

    let operationRequirements = [];
    for (const o of operationsAvailable.operations) {
        operationRequirements.push(OperationValuesValidation.find(element => element.operation === o));
    }

    return {
        strategy: foundStrategy,
        operationsAvailable,
        operationRequirements
    };
}

async function recordStrategyHistory(strategyConfig, modifiedField) {
    if (strategyConfig.__v !== undefined && modifiedField.length) {
        const oldStrategy = await ConfigStrategy.findById(strategyConfig._id).exec();
        await recordHistory(modifiedField, oldStrategy, strategyConfig, strategyConfig.domain);
    }
}

async function existStrategy(strategyConfig) {
    if (strategyConfig.__v === undefined) {
        const foundStrategy = await ConfigStrategy
            .find({ 
                config: strategyConfig.config, 
                strategy: strategyConfig.strategy,
                activated: strategyConfig.activated 
            }).exec();

        return foundStrategy.length > 0;
    }
    return false;
}

const configStrategySchema = new mongoose.Schema({
    description: {
        type: String,
        trim: true,
        maxlength: 256
    },
    activated: {
        type: Map,
        of: Boolean,
        required: true
    },
    strategy: {
        type: String,
        enum: Object.values(StrategiesType),
        required: true
    },
    values: [{
        type: String,
        require: true,
        trim: true
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
    domain: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Domain'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Admin'
    },
    updatedBy: {
        type: String
    }
}, {
    timestamps: true
});

configStrategySchema.virtual('admin', {
    ref: 'Admin',
    localField: 'owner',
    foreignField: '_id',
    justOne: true
});

configStrategySchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (_doc, ret) {
        if (ret.updatedAt || ret.createdAt) {
            ret.updatedAt = moment(ret.updatedAt).format('YYYY-MM-DD HH:mm:ss');
            ret.createdAt = moment(ret.createdAt).format('YYYY-MM-DD HH:mm:ss');
        }
        if (!ret.id) {
            delete ret.id;
        }
        return ret;
    }
};

configStrategySchema.pre('deleteOne', { document: true, query: false }, async function () {
    await History.deleteMany({ domainId: this.domain, 
        elementId: this._id }).exec();
});

configStrategySchema.pre('save', async function () {
    const strategy = this.strategy;
    const operationStrategy = this.operation;
    const { min, max } = OperationValuesValidation.find(element => element.operation === operationStrategy);

    // Verify if strategy already exists
    if (await existStrategy(this)) {
        throw new Error(`Unable to complete the operation. Strategy '${strategy}' already exists for this configuration and environment`);
    }

    // Verify strategy value quantity
    if (!this.values || this.values.length < min || this.values.length > max) {
        const err =  new Error(`Unable to complete the operation. The number of values for the operation '${operationStrategy}', are min: ${min} and max: ${max} values`);
        throw err;
    }

    const operations = StrategyRequirementDefinition.find(element => element.strategy === strategy).operations;
    const foundOperation = operations.find((element) => element === operationStrategy);
    
    // Verify strategy operation requirements
    if (!foundOperation) {
        const err =  new Error(`Unable to complete the operation. The strategy '${strategy}' needs ${operations} as operation`);
        throw err;
    }

    // Verify strategy values format
    for (const value of this.values) {
        validateStrategyValue(strategy, value);
    }

    await recordStrategyHistory(this, this.modifiedPaths());
});

Object.assign(configStrategySchema.statics, { StrategiesType, OperationsType });

export const ConfigStrategy = mongoose.model('ConfigStrategy', configStrategySchema);