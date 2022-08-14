import { verifyOwnership } from '../helpers';
import { RouterTypes } from '../models/permission';
import { getConfigs } from '../services/config';
import { getGroupConfigs } from '../services/group-config';

export async function resolvePermission(args, admin) {
    let elements;
    if (args.router === RouterTypes.GROUP) {
        elements = await getGroupConfigs({ domain: args.domain }, true);
    } else if (args.router === RouterTypes.CONFIG) {
        elements = await getConfigs({ domain: args.domain, group: args.parent }, true);
    } else {
        return [];
    }
    
    let result = [];
    for (const element of elements) {
        result.push({
            id: element._id,
            name: element.name || element.key,
            permissions: []
        });

        for (const action_perm of args.actions) {
            try {
                await verifyOwnership(admin, element, args.domain, action_perm, args.router);
                result[result.length - 1].permissions.push({ action: action_perm.toString(), result: 'ok' });
            } catch (e) {
                result[result.length - 1].permissions.push({ action: action_perm.toString(), result: 'nok' });
            }
        }
    }
    
    return result;
}