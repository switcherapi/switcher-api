import { randomUUID } from 'crypto';
import { checkEnvironmentStatusChange_v2 } from '../middleware/validators';
import Component from '../models/component';
import { Config } from '../models/config';
import { ConfigStrategy } from '../models/config-strategy';
import Domain from '../models/domain';
import { Environment } from '../models/environment';
import GroupConfig from '../models/group-config';
import History from '../models/history';
import { ActionTypes, RouterTypes } from '../models/permission';
import { formatInput, verifyOwnership, checkEnvironmentStatusRemoval } from '../helpers';
import { permissionCache } from '../helpers/cache';
import { response } from './common';

export async function removeDomainStatus(domain, environmentName) {
    try {
        await checkEnvironmentStatusRemoval(domain._id, environmentName);
        domain.activated.delete(environmentName);
        return await domain.save();
    } catch (e) {
        throw new Error(e.message);
    }
}

export async function getDomainById(id, lean = false, populateAdmin = false) {
    let domain = await Domain.findById(id, null, { lean }).exec();

    if (!lean && domain && populateAdmin) {
        await domain.populate({ path: 'admin', select: 'name' });
    }

    return response(domain, 'Domain not found');
}

export async function getDomain(where) {
    const query = Domain.findOne();

    if (where._id) query.where('_id', where._id);
    if (where.owner) query.where('owner', where.owner);
    if (where.transfer) query.where('transfer', where.transfer);
    
    let domain = await query.exec();
    return response(domain, 'Domain not found');
}

export async function getTotalDomainsByOwner(owner) {
    return Domain.find({ owner }).countDocuments();
}

export async function createDomain(args, admin) {
    let domain = new Domain({
        ...args,
        owner: admin._id
    });

    domain.name = formatInput(domain.name, { allowSpace: true });
    const environment = new Environment({
        domain: domain._id,
        owner: admin._id
    });

    environment.save();
    return domain.save();
}

export async function deleteDomainHistory(id, admin) {
    const domain = await getDomainById(id);
    await verifyOwnership(admin, domain, domain._id, ActionTypes.DELETE, RouterTypes.ADMIN);
    await History.deleteMany({ elementId: domain._id }).exec();
    return domain;
}

export async function deleteDomain(id, admin) {
    let domain = await getDomainById(id);
    domain = await verifyOwnership(admin, domain, domain._id, ActionTypes.DELETE, RouterTypes.DOMAIN);

    // resets permission cache
    permissionCache.permissionReset(id, ActionTypes.ALL, RouterTypes.DOMAIN, domain.name);
    return domain.deleteOne();
}

export async function transferDomain(args, admin) {
    let domain = await getDomain({ _id: args.domain, owner: admin._id });

    domain.updatedBy = admin.email;
    domain.transfer = domain.transfer ? null : true;
    return domain.save();
}

export async function transferDomainAccept(args, admin) {
    let domain = await getDomain({ _id: args.domain, transfer: true });
        
    domain.transfer = null;
    domain.owner = admin._id;
    await Promise.all([
        GroupConfig.updateMany({ domain: domain._id }, { owner: admin._id }),
        Config.updateMany({ domain: domain._id }, { owner: admin._id }),
        ConfigStrategy.updateMany({ domain: domain._id }, { owner: admin._id }),
        Component.updateMany({ domain: domain._id }, { owner: admin._id }),
        Environment.updateMany({ domain: domain._id }, { owner: admin._id }),
        domain.save()
    ]);

    return domain;
}

export async function updateDomain(id, args, admin) {
    let domain = await getDomainById(id);

    domain = await verifyOwnership(admin, domain, domain._id, ActionTypes.UPDATE, RouterTypes.DOMAIN);
    domain.updatedBy = admin.email;
    domain.lastUpdate = Date.now();
    
    const updates = Object.keys(args);
    updates.forEach((update) => domain[update] = args[update]);
    return domain.save();
}

export async function updateDomainStatus(id, args, admin) {
    let domain = await getDomainById(id);

    domain = await verifyOwnership(admin, domain, domain._id, ActionTypes.UPDATE, RouterTypes.DOMAIN);
    domain.updatedBy = admin.email;
    domain.lastUpdate = Date.now();

    const updates = await checkEnvironmentStatusChange_v2(args, id);

    updates.forEach((update) => domain.activated.set(update, args[update]));
    return domain.save();
}

export async function removeDomainStatusEnv(id, env, admin) {
    let domain = await getDomainById(id);

    domain = await verifyOwnership(admin, domain, domain._id, ActionTypes.UPDATE, RouterTypes.DOMAIN);
    domain.updatedBy = admin.email;
    domain.lastUpdate = Date.now();
    
    return removeDomainStatus(domain, env);
}

export async function updateDomainVersion(domainId) {
    const domain = await getDomainById(domainId);
    domain.lastUpdate = Date.now();
    domain.save();
}

export async function getRelayVerificationCode(id, admin) {
    let domain = await getDomainById(id);
    domain = await verifyOwnership(admin, domain, domain._id, ActionTypes.UPDATE, RouterTypes.DOMAIN);
    
    domain.updatedBy = admin.email;
    
    if (!domain.integrations.relay.verification_code) {
        domain.integrations.relay.verification_code = randomUUID();
        await domain.save();
    }

    return domain.integrations.relay.verification_code;
}