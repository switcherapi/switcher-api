import { checkComponent } from '../external/switcher-api-facade';
import Component from '../models/component';
import { ActionTypes, RouterTypes } from '../models/permission';
import { formatInput, verifyOwnership } from '../helpers';
import { permissionCache } from '../helpers/cache';
import { response } from './common';

export async function getComponentById(id) {
    let component = await Component.findById(id).exec();
    return response(component, 'Component not found');
}

export async function getComponents(where, projection, options) {
    return Component.find(where, projection, options);
}

export async function getTotalComponentsByDomainId(domain) {
    return Component.find({ domain }).countDocuments();
}

export async function createComponent(args, admin) {
    let component = new Component({
        ...args,
        owner: admin._id
    });

    await checkComponent(args.domain);
    component.name = formatInput(component.name);
    component = await verifyOwnership(admin, component, args.domain, ActionTypes.CREATE, RouterTypes.COMPONENT);
    const apiKey = await component.generateApiKey();
    await component.save();

    return { component, apiKey };
}

export async function updateComponent(id, args, admin) {
    let component = await getComponentById(id);
    component = await verifyOwnership(
        admin, component, component.domain, ActionTypes.UPDATE, RouterTypes.COMPONENT);

    // resets permission cache
    permissionCache.permissionReset(component.domain, ActionTypes.ALL, RouterTypes.COMPONENT, component.name);

    const updates = Object.keys(args);
    updates.forEach((update) => component[update] = args[update]);
    component.name = formatInput(component.name);
    return component.save();
}

export async function deleteComponent(id, admin) {
    let component = await getComponentById(id);
    component = await verifyOwnership(
        admin, component, component.domain, ActionTypes.DELETE, RouterTypes.COMPONENT);

    // resets permission cache
    permissionCache.permissionReset(component.domain, ActionTypes.ALL, RouterTypes.COMPONENT, component.name);
    
    return component.deleteOne();
}

export async function generateApiKey(id, admin) {
    let component = await getComponentById(id);
    component = await verifyOwnership(
        admin, component, component.domain, ActionTypes.UPDATE, RouterTypes.COMPONENT);
    component.updatedBy = admin.email;
    return component.generateApiKey();
}