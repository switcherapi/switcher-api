import mongoose from 'mongoose';
import History from './history';
import { recordHistory } from './common/index';
import moment from 'moment';
import IPCIDR from 'ip-cidr';
import { NotFoundError } from '../routers/common';

export const StrategiesType = Object.freeze({
    NETWORK: 'NETWORK_VALIDATION',
    VALUE: 'VALUE_VALIDATION',
    NUMERIC: 'NUMERIC_VALIDATION',
    TIME: 'TIME_VALIDATION',
    DATE: 'DATE_VALIDATION',
    REGEX: 'REGEX_VALIDATION'
});

export const OperationsType = Object.freeze({
    EQUAL: 'EQUAL',
    NOT_EQUAL: 'NOT_EQUAL',
    EXIST: 'EXIST',
    NOT_EXIST: 'NOT_EXIST',
    GREATER: 'GREATER',
    LOWER: 'LOWER',
    BETWEEN: 'BETWEEN'
});

const StrategyRequirementDefinition = [
    {
        strategy: StrategiesType.NETWORK,
        operations: [OperationsType.EXIST, OperationsType.NOT_EXIST],
        format: '10.0.0.0/24 (CIDR) or 10.0.0.1 (IPv4 address)',
        validator: '^([0-9]{1,3}\\.){3}[0-9]{1,3}(\\/([0-9]|[1-2][0-9]|3[0-2]))?$'
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
        validator: '^((-[0-9]{1,})|([0-9]{1,}))(\\.[0-9]{1,})?$'
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
        format: 'YYYY-MM-DD or YYYY-MM-DDTHH:mm',
        validator: '([12][0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))(T(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9])?$'
    },
    {
        strategy: StrategiesType.REGEX,
        operations: [OperationsType.EXIST, OperationsType.NOT_EXIST, OperationsType.EQUAL, OperationsType.NOT_EQUAL],
        format: 'Hint: NOT/EQUAL forces \\b (delimiter) flag'
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
        max: process.env.MAX_EXIST_STRATEGYOPERATION
    },
    {
        operation: OperationsType.NOT_EXIST,
        min: 1,
        max: process.env.MAX_EXIST_STRATEGYOPERATION
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
    }
];

export function validateStrategyValue(strategy, value) {
    const strategyRules = StrategyRequirementDefinition.filter(element => element.strategy === strategy);

    if (!value.match(strategyRules[0].validator)) {
        throw new Error(`Value does not match with the requirements for this Strategy. Please, try using: ${strategyRules[0].format}`);
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
    operationsAvailable.operations.forEach((o) => {
        operationRequirements.push(OperationValuesValidation.find(element => element.operation === o));
    });

    return {
        strategy,
        operationsAvailable,
        operationRequirements
    };
}

export function processOperation(strategy, operation, input, values) {
    switch(strategy) {
        case StrategiesType.NETWORK:
            return processNETWORK(operation, input, values);
        case StrategiesType.VALUE:
            return processVALUE(operation, input, values);
        case StrategiesType.NUMERIC:
            return processNUMERIC(operation, input, values);
        case StrategiesType.TIME:
            return processTime(operation, input, values);
        case StrategiesType.DATE:
            return processDate(operation, input, values);
        case StrategiesType.REGEX:
            return processREGEX(operation, input, values);
    }
}

function processNETWORK(operation, input, values) {

    const cidrRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))$/;
    
    switch(operation) {
        case OperationsType.EXIST: {
            for (var i = 0; i < values.length; i++) {
                if (values[i].match(cidrRegex)) {
                    const cidr = new IPCIDR(values[i]);
                    if (cidr.contains(input)) {
                        return true;
                    }
                } else {
                    return values.includes(input);
                }
            }
            break;
        }
        case OperationsType.NOT_EXIST: {
            const result = values.filter(element => {
                if (element.match(cidrRegex)) {
                    const cidr = new IPCIDR(element);
                    if (cidr.contains(input)) {
                        return true;
                    }
                } else {
                    return values.includes(input);
                }
            });
            return result.length === 0;
        }
    }

    return false;
}

function processVALUE(operation, input, values) {
    switch(operation) {
        case OperationsType.EXIST:
            return values.includes(input);
        case OperationsType.NOT_EXIST:
            return !values.includes(input);
        case OperationsType.EQUAL:
            return input === values[0];
        case OperationsType.NOT_EQUAL:
            return values.filter(element => element === input).length === 0;
    }
}

function processNUMERIC(operation, input, values) {
    switch(operation) {
        case OperationsType.EXIST:
            return processVALUE(operation, input, values);
        case OperationsType.NOT_EXIST:
            return processVALUE(operation, input, values);
        case OperationsType.EQUAL:
            return processVALUE(operation, input, values);
        case OperationsType.NOT_EQUAL:
            return processVALUE(operation, input, values);
        case OperationsType.LOWER:
            return input < values[0];
        case OperationsType.GREATER:
            return input > values[0];
        case OperationsType.BETWEEN:
            return input >= values[0] && input <= values[1];
    }
}

function processTime(operation, input, values) {
    const today = moment().format('YYYY-MM-DD');

    switch(operation) {
        case OperationsType.LOWER:
            return moment(`${today}T${input}`).isSameOrBefore(`${today}T${values[0]}`);
        case OperationsType.GREATER:
            return moment(`${today}T${input}`).isSameOrAfter(`${today}T${values[0]}`);
        case OperationsType.BETWEEN:
            return moment(`${today}T${input}`).isBetween(`${today}T${values[0]}`, `${today}T${values[1]}`);
    }
}

function processDate(operation, input, values) {
    switch(operation) {
        case OperationsType.LOWER:
            return moment(input).isSameOrBefore(values[0]);
        case OperationsType.GREATER:
            return moment(input).isSameOrAfter(values[0]);
        case OperationsType.BETWEEN:
            return moment(input).isBetween(values[0], values[1]);
    }
}

function processREGEX(operation, input, values) {
    switch(operation) {
        case OperationsType.EXIST:
            for (var i = 0; i < values.length; i++) {
                if (input.match(values[i])) {
                    return true;
                }
            }
            return false;
        case OperationsType.NOT_EXIST:
            return !processREGEX(OperationsType.EXIST, input, values);
        case OperationsType.EQUAL:
            return input.match(`\\b${values[0]}\\b`) != null;
        case OperationsType.NOT_EQUAL:
            return input.match(`\\b${values[0]}\\b`) == null;
    }
}

async function recordStrategyHistory(strategyConfig, modifiedField) {
    if (strategyConfig.__v !== undefined && modifiedField.length) {
        const oldStrategy = await ConfigStrategy.findById(strategyConfig._id);
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
            });

        return foundStrategy.length > 0;
    }
    return false;
}

const configStrategySchema = new mongoose.Schema({
    description: {
        type: String,
        trim: true
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

configStrategySchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret) {
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

configStrategySchema.pre('remove', async function (next) {
    const strategyConfig = this;
    await History.deleteMany({ domainId: strategyConfig.domain, 
        elementId: strategyConfig._id });
        
    next();
});

configStrategySchema.pre('save', async function (next) {
    const strategyConfig = this;

    const strategy = strategyConfig.strategy;
    const operationStrategy = strategyConfig.operation;
    const { min, max } = OperationValuesValidation.filter(element => element.operation === operationStrategy)[0];

    // Verify if strategy already exist
    if (await existStrategy(strategyConfig)) {
        const err = new Error(`Unable to complete the operation. Strategy '${strategy}' already exist for this configuration and environment`);
        return next(err);
    }

    // Verify strategy value quantity
    if (!strategyConfig.values || strategyConfig.values.length < min || strategyConfig.values.length > max) {
        const err =  new Error(`Unable to complete the operation. The number of values for the operation '${operationStrategy}', are min: ${min} and max: ${max} values`);
        return next(err);
    }

    const operations = StrategyRequirementDefinition.find(element => element.strategy === strategy).operations;
    const foundOperation = operations.filter((element) => element === operationStrategy);
    
    // Verify strategy operation requirements
    if (!foundOperation.length) {
        const err =  new Error(`Unable to complete the operation. The strategy '${strategy}' needs ${operations} as operation`);
        return next(err);
    }

    // Verify strategy values format
    try {
        strategyConfig.values.forEach(value => validateStrategyValue(strategy, value));
    } catch (err) {
        return next(err);
    }

    await recordStrategyHistory(strategyConfig, this.modifiedPaths());

    next();
});

Object.assign(configStrategySchema.statics, { StrategiesType, OperationsType });

export const ConfigStrategy = mongoose.model('ConfigStrategy', configStrategySchema);