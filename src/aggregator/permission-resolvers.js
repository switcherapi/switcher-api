import { verifyOwnership } from '../helpers/index.js';
import { RouterTypes } from '../models/permission.js';
import { getConfigs } from '../services/config.js';
import { getGroupConfigs } from '../services/group-config.js';
import { permissionCache } from '../helpers/permission-cache.js';
import Logger from '../helpers/logger.js';

export async function resolvePermission(args, admin) {
    const cacheKey = permissionCache.permissionKey(admin._id, args.domain, args.parent, 
        args.actions, args.router, args.environment);

    if (permissionCache.has(cacheKey)) {
        return permissionCache.get(cacheKey);
    }
    
    let elements = await getElements(args.domain, args.parent, args.router);

    const result = await Promise.all(elements.map(async (element) => {
        const permissions = await Promise.all(args.actions.map(async (action_perm) => {
            try {
                await verifyOwnership(admin, element, args.domain, action_perm, args.router, false, args.environment);
                return { action: action_perm.toString(), result: 'ok' };
            } catch (e) {
                Logger.debug('resolvePermission', e);
                return { action: action_perm.toString(), result: 'nok' };
            }
        }));

        return {
            id: element._id,
            name: element.name || element.key,
            permissions
        };
    }));

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

    return [];
};