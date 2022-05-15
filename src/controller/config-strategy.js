import { response } from './common';
import { ConfigStrategy } from '../models/config-strategy';
import { ActionTypes, RouterTypes } from '../models/role';
import { updateDomainVersion, verifyOwnership } from '../routers/common';
import { getConfigById } from './config';
import { BadRequestError } from '../exceptions';
import { checkEnvironmentStatusChange_v2 } from '../middleware/validators';
import { getEnvironment } from './environment';

async function verifyStrategyValueInput(strategyId, value) {
    const configStrategy = await getStrategyById(strategyId);

    if (!value) {
        throw new BadRequestError('The attribute \'value\' must be assigned');
    }

    return configStrategy;
}

function validateValues(values) {
    const invalidValue = values.find(value => value.length > 128);
    if (invalidValue) {
        throw new BadRequestError('Value cannot be longer than 128 characters');
    }
}

export async function getStrategyById(id) {
    let strategy = await ConfigStrategy.findById(id);
    return response(strategy, 'Strategy not found');
}

export async function getStrategies(where, lean = false) {
    const query = ConfigStrategy.find();
    if (where.config) query.where('config', where.config);
    if (lean) query.lean();
    return query.exec();
}

export async function createStrategy(args, admin) {
    const config = await getConfigById(args.config);

    if (!args.env) {
        throw new BadRequestError('Must specify environment');
    }

    validateValues(args.values);
    const environment = await getEnvironment({ name: args.env, domain: config.domain });

    let configStrategy = new ConfigStrategy({
        ...args,
        activated: new Map().set(environment.name, true),
        domain: config.domain,
        owner: admin._id
    });

    configStrategy = await verifyOwnership(admin, configStrategy, configStrategy.domain, ActionTypes.CREATE, RouterTypes.STRATEGY);

    await configStrategy.save();
    updateDomainVersion(configStrategy.domain);

    return configStrategy;
}

export async function deleteStrategy(id, admin) {
    let configStrategy = await getStrategyById(id);
    configStrategy = await verifyOwnership(admin, configStrategy, configStrategy.domain, ActionTypes.DELETE, RouterTypes.STRATEGY);

    await configStrategy.remove();
    updateDomainVersion(configStrategy.domain);

    return configStrategy;
}

export async function updateStrategy(id, args, admin) {
    let configStrategy = await getStrategyById(id);
    configStrategy = await verifyOwnership(admin, configStrategy, configStrategy.domain, ActionTypes.UPDATE, RouterTypes.STRATEGY);
    configStrategy.updatedBy = admin.email;
    
    const updates = Object.keys(args);
    updates.forEach((update) => configStrategy[update] = args[update]);
    await configStrategy.save();
    updateDomainVersion(configStrategy.domain);

    return configStrategy;
}

export async function addVal(id, args, admin) {
    let configStrategy = await verifyStrategyValueInput(id, args.value);

    const value = args.value.trim();
    const foundExistingOne = configStrategy.values.find((element) => element === value);

    validateValues([value]);
    if (foundExistingOne) {
        throw new BadRequestError(`Value '${value}' already exist`);
    }

    configStrategy = await verifyOwnership(admin, configStrategy, configStrategy.domain, ActionTypes.UPDATE, RouterTypes.STRATEGY);
    configStrategy.updatedBy = admin.email;

    configStrategy.values.push(value);
    await configStrategy.save();
    updateDomainVersion(configStrategy.domain);

    return configStrategy;
}

export async function updateVal(id, args, admin) {
    let configStrategy = await getStrategyById(id);

    if (!args.oldvalue || !args.newvalue) {
        throw new BadRequestError('Attributes \'oldvalue\' and \'newvalue\' must be assigned');
    }

    const oldvalue = args.oldvalue.trim();
    const indexOldValue = configStrategy.values.indexOf(oldvalue);

    if (indexOldValue < 0) {
        throw new BadRequestError(`Old value '${oldvalue}' not found`);
    }

    const newvalue = args.newvalue.trim();
    const indexNewValue = configStrategy.values.indexOf(newvalue);

    validateValues([newvalue]);
    if (indexNewValue >= 0) {
        throw new BadRequestError(`Value '${newvalue}' already exist`);
    }

    configStrategy = await verifyOwnership(admin, configStrategy, configStrategy.domain, ActionTypes.UPDATE, RouterTypes.STRATEGY);
    configStrategy.updatedBy = admin.email;

    configStrategy.values.splice(indexOldValue, 1);
    configStrategy.values.push(newvalue);
    await configStrategy.save();
    updateDomainVersion(configStrategy.domain);

    return configStrategy;
}

export async function removeVal(id, args, admin) {
    let configStrategy = await verifyStrategyValueInput(id, args.value);

    const value = args.value.trim();
    const indexValue = configStrategy.values.indexOf(value);

    if (indexValue < 0) {
        throw new BadRequestError(`Value '${value}' does not exist`);
    }

    configStrategy = await verifyOwnership(admin, configStrategy, configStrategy.domain, ActionTypes.UPDATE, RouterTypes.STRATEGY);
    configStrategy.updatedBy = admin.email;

    configStrategy.values.splice(indexValue, 1);
    await configStrategy.save();
    updateDomainVersion(configStrategy.domain);

    return configStrategy;
}

export async function updateStatusEnv(id, args, admin) {
    let updates = Object.keys(args);

    if (updates.length > 1) {
        throw new BadRequestError('You can only update one environment at time');
    }

    let configStrategy = await getStrategyById(id);
    updates = await checkEnvironmentStatusChange_v2(args, configStrategy.domain);
    if (configStrategy.activated.get(updates[0]) === undefined) {
        throw new BadRequestError('Strategy does not exist on this environment');
    }

    configStrategy = await verifyOwnership(admin, configStrategy, configStrategy.domain, ActionTypes.UPDATE, RouterTypes.STRATEGY);
    configStrategy.updatedBy = admin.email;
    
    configStrategy.activated.set(updates[0], args[updates[0]]);
    await configStrategy.save();
    updateDomainVersion(configStrategy.domain);

    return configStrategy;
}