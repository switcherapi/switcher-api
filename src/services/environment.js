import { BadRequestError } from '../exceptions/index.js';
import { checkEnvironment } from '../external/switcher-api-facade.js';
import { ConfigStrategy } from '../models/config-strategy.js';
import { Environment, EnvType } from '../models/environment.js';
import { ActionTypes, RouterTypes } from '../models/permission.js';
import { formatInput, verifyOwnership } from '../helpers/index.js';
import { permissionCache } from '../helpers/cache.js';
import { response } from './common.js';
import { getConfigs, removeConfigStatus } from './config.js';
import { getDomainById, removeDomainStatus } from './domain.js';
import { getGroupConfigs, removeGroupStatus } from './group-config.js';

async function removeEnvironmentFromElements(environment) {
    await ConfigStrategy.deleteMany({ domain: environment.domain, $or: [ 
        { activated: { [`${environment.name}`]: true } }, 
        { activated: { [`${environment.name}`]: false } } 
    ] }).exec();

    const configs = await getConfigs({ domain: environment.domain });
    if (configs.length) {
        configs.forEach(async function(config) {
            await removeConfigStatus(config, environment.name);
        });
    }

    const groupConfigs = await getGroupConfigs({ domain: environment.domain });
    if (groupConfigs.length) {
        groupConfigs.forEach(async function(group) {
            await removeGroupStatus(group, environment.name);
        });
    }

    const domain = await getDomainById(environment.domain);
    await removeDomainStatus(domain, environment.name);
}

export async function getEnvironmentById(id) {
    let environment = await Environment.findById(id).exec();
    return response(environment, 'Environment not found');
}

export async function getEnvironment(where) {
    const environment = await getEnvironmentByName(where.domain, where.name);
    return response(environment, 'Environment not found');
}

export async function getEnvironmentByName(domain, name) {
    const query = Environment.findOne();

    if (domain) query.where('domain', domain);
    if (name) query.where('name', name);
    
    return query.exec();
}

export async function getEnvironments(where, projection, options) {
    const query = Environment.find();

    if (where.domain) query.where('domain', where.domain);
    if (projection) query.projection(projection);
    if (options) query.setOptions(options);

    return query.exec();
}

export async function getTotalEnvByDomainId(domain) {
    return Environment.find({ domain }).countDocuments();
}

export async function createEnvironment(args, admin) {
    let environment = new Environment({
        ...args, 
        owner: admin._id
    });

    await checkEnvironment(args.domain);
    environment.name = formatInput(environment.name);
    environment = await verifyOwnership(admin, environment, environment.domain, ActionTypes.CREATE, RouterTypes.ENVIRONMENT);
    return environment.save();
}

export async function deleteEnvironment(id, admin) {
    let environment = await getEnvironmentById(id);

    if (environment.name === EnvType.DEFAULT) {
        throw new BadRequestError('Unable to delete this environment');
    }

    environment = await verifyOwnership(admin, environment, environment.domain, ActionTypes.DELETE, RouterTypes.ENVIRONMENT);

    // resets permission cache
    permissionCache.permissionReset(environment.domain, ActionTypes.ALL, RouterTypes.ENVIRONMENT, environment.name);

    await removeEnvironmentFromElements(environment);
    return environment.deleteOne();
}

export async function recoverEnvironment(id, admin) {
    let environment = await getEnvironmentById(id);
    environment = await verifyOwnership(admin, environment, environment.domain, ActionTypes.UPDATE, RouterTypes.ENVIRONMENT);
    await removeEnvironmentFromElements(environment);
    return environment;
}