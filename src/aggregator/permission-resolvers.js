import { verifyOwnership } from '../helpers/index.js';
import { RouterTypes } from '../models/permission.js';
import { getConfigs } from '../services/config.js';
import { getGroupConfigs } from '../services/group-config.js';
import { permissionCache } from '../helpers/cache.js';
import Logger from '../helpers/logger.js';

export async function resolvePermission(args, admin) {
    const cacheKey = permissionCache.permissionKey(admin._id, args.domain, args.parent, 
        args.actions, args.router, args.environment);

    if (permissionCache.has(cacheKey)) {
        return permissionCache.get(cacheKey);
    }
    
    let elements = await getElements(args.domain, args.parent, args.router);

    let result = [];
    for (const element of elements) {
        result.push({
            id: element._id,
            name: element.name || element.key,
            permissions: []
        });

        for (const action_perm of args.actions) {
            try {
                await verifyOwnership(admin, element, args.domain, action_perm, args.router, false, args.environment);
                result[result.length - 1].permissions.push({ action: action_perm.toString(), result: 'ok' });
            } catch (e) {
                Logger.debug('resolvePermission', e);
                result[result.length - 1].permissions.push({ action: action_perm.toString(), result: 'nok' });
            }
        }
    }

    if (result.length) {
        permissionCache.set(cacheKey, result);
    }

    return result;
}

const getElements = async (domain, parent, router) => {
    if (domain && router === RouterTypes.GROUP) {
        return getGroupConfigs({ domain }, true);
    }
    
    if (domain && parent && router === RouterTypes.CONFIG) {
        return getConfigs({ domain, group: parent }, true);
    }

    return Promise.resolve([]);
};