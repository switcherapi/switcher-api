import { BadRequestError } from '../exceptions';
import { checkEnvironment } from '../external/switcher-api-facade';
import { ConfigStrategy } from '../models/config-strategy';
import { Environment, EnvType } from '../models/environment';
import { ActionTypes, RouterTypes } from '../models/role';
import { formatInput, removeConfigStatus, removeDomainStatus, removeGroupStatus, verifyOwnership } from '../routers/common';
import { response } from './common';
import { getConfigs } from './config';
import { getDomainById } from './domain';
import { getGroupConfigs } from './group-config';

async function removeEnvironmentFromElements(environment) {
    await ConfigStrategy.deleteMany({ domain: environment.domain, $or: [ 
        { activated: { [`${environment.name}`]: true } }, 
        { activated: { [`${environment.name}`]: false } } 
    ] });

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
    let environment = await Environment.findById(id);
    return response(environment, 'Environment not found');
}

export async function getEnvironment(where) {
    let environment = await Environment.findOne(where);
    return response(environment, 'Environment not found');
}

export async function createEnvironment(args, admin) {
    let environment = new Environment({
        ...args, 
        owner: admin._id
    });

    await checkEnvironment(args.domain);
    environment.name = formatInput(environment.name);
    environment = await verifyOwnership(admin, environment, environment.domain, ActionTypes.CREATE, RouterTypes.ENVIRONMENT);

    await environment.save();
    return environment;
}

export async function deleteEnvironment(id, admin) {
    let environment = await getEnvironmentById(id);

    if (environment.name === EnvType.DEFAULT) {
        throw new BadRequestError('Unable to delete this environment');
    }

    environment = await verifyOwnership(admin, environment, environment.domain, ActionTypes.DELETE, RouterTypes.ENVIRONMENT);

    await removeEnvironmentFromElements(environment);
    await environment.remove();
    return environment;
}

export async function recoverEnvironment(id, admin) {
    let environment = await getEnvironmentById(id);
    environment = await verifyOwnership(admin, environment, environment.domain, ActionTypes.UPDATE, RouterTypes.ENVIRONMENT);
    await removeEnvironmentFromElements(environment);
    return environment;
}