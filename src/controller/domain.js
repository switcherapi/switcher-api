import { checkEnvironmentStatusChange_v2 } from '../middleware/validators';
import Component from '../models/component';
import { Config } from '../models/config';
import { ConfigStrategy } from '../models/config-strategy';
import Domain from '../models/domain';
import { Environment } from '../models/environment';
import GroupConfig from '../models/group-config';
import History from '../models/history';
import { ActionTypes, RouterTypes } from '../models/role';
import { formatInput, removeDomainStatus, verifyOwnership } from '../routers/common';
import { response } from './common';

export async function getDomainById(id) {
    let domain = await Domain.findById(id);
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
    await Domain.find({ owner }).countDocuments();
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
    await History.deleteMany({ elementId: domain._id });
    return domain;
}

export async function deleteDomain(id, admin) {
    let domain = await getDomainById(id);
    domain = await verifyOwnership(admin, domain, domain._id, ActionTypes.DELETE, RouterTypes.DOMAIN);
    return domain.remove();
}

export async function transferDomain(args, admin) {
    let domain = await getDomain({ _id: args.domain, owner: admin._id });

    domain.updatedBy = admin.email;
    domain.transfer = domain.transfer ? null : true;
    await domain.save();
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