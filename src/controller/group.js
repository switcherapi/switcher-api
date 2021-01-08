import { response } from './common';
import GroupConfig from '../models/group-config';

export async function getGroupConfigById(id) {
    let group = await GroupConfig.findById(id);
    return response(group, 'Group Config not found');
}