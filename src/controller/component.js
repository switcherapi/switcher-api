import Component from '../models/component';
import { response } from './common';

export async function getComponentById(id) {
    let component = await Component.findById(id);
    return response(component, 'Component not found');
}

export async function getComponents(where) {
    return await Component.find(where);
}