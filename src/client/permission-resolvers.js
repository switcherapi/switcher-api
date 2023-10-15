import { verifyOwnership } from '../helpers';
import { RouterTypes } from '../models/permission';
import { getConfigs } from '../services/config';
import { getGroupConfigs } from '../services/group-config';
import { permissionCache } from '../helpers/cache';

export async function resolvePermission(args, admin) {
    let elements;
    if (args.router === RouterTypes.GROUP) {
        elements = await getGroupConfigs({ domain: args.domain }, true);
    } else if (args.router === RouterTypes.CONFIG) {
        elements = await getConfigs({ domain: args.domain, group: args.parent }, true);
    } else {
        return [];
    }

    const cacheKey = permissionCache.permissionKey(admin._id, args.domain, elements, args.actions, args.router);
    if (permissionCache.has(cacheKey)) {
        return permissionCache.get(cacheKey);
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

    permissionCache.set(cacheKey, result);
    return result;
}