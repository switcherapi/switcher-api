import { checkComponent } from '../external/switcher-api-facade';
import Component from '../models/component';
import { ActionTypes, RouterTypes } from '../models/role';
import { formatInput, verifyOwnership } from '../routers/common';
import { response } from './common';

export async function getComponentById(id) {
    let component = await Component.findById(id);
    return response(component, 'Component not found');
}

export async function getComponents(where) {
    return await Component.find(where);
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

    const updates = Object.keys(args);
    updates.forEach((update) => component[update] = args[update]);
    component.name = formatInput(component.name);
    await component.save();
    return component;
}

export async function deleteComponent(id, admin) {
    let component = await getComponentById(id);
    component = await verifyOwnership(
        admin, component, component.domain, ActionTypes.DELETE, RouterTypes.COMPONENT);

    await component.remove();
    return component;
}

export async function generateApiKey(id, admin) {
    let component = await getComponentById(id);
    component = await verifyOwnership(
        admin, component, component.domain, ActionTypes.UPDATE, RouterTypes.COMPONENT);
    component.updatedBy = admin.email;

    const apiKey = await component.generateApiKey();
    return apiKey;
}