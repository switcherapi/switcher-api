import { ActionTypes, RouterTypes } from '../models/permission';
import { getPermission, getPermissions } from '../services/permission';

export async function verifyPermissions(team, element, action, routerType, environment) {
    const permission = await getPermission({
        _id: { $in: team.permissions }, 
        action: { $in: [action, ActionTypes.ALL] },
        active: true,
        router: { $in: [routerType, RouterTypes.ALL] }
    });

    if (!permission || !verifyEnvironment(permission, environment)) {
        return undefined;
    }

    return verifyIdentifiers(permission, element);
}

export async function verifyPermissionsCascade(team, element, action, routerType, environment) {
    let orStatement = [];
    if (routerType === RouterTypes.DOMAIN) {
        orStatement = [
            { router: routerType },
            { router: RouterTypes.GROUP },
            { router: RouterTypes.CONFIG },
            { router: RouterTypes.STRATEGY },
            { router: RouterTypes.ALL }
        ];
    } else if (routerType === RouterTypes.GROUP) {
        orStatement = [
            { router: routerType },
            { router: RouterTypes.CONFIG },
            { router: RouterTypes.STRATEGY },
            { router: RouterTypes.ALL }
        ];
    } else if (routerType === RouterTypes.CONFIG || routerType === RouterTypes.STRATEGY) {
        orStatement = [
            { router: routerType },
            { router: RouterTypes.STRATEGY },
            { router: RouterTypes.ALL }
        ];
    }

    const foundPermission = await getPermissions({
        _id: { $in: team.permissions }, 
        action: { $in: [action, ActionTypes.ALL] },
        active: true,
        $or: orStatement
    });

    const matchedPermission = foundPermission.filter(value => value.router === routerType);
    if (matchedPermission.length && verifyEnvironment(matchedPermission[0], environment)) {
        return verifyIdentifiers(matchedPermission[0], element);
    } else if (foundPermission[0] && verifyEnvironment(foundPermission[0], environment)) {
        return element;
    }
}

function verifyIdentifiers(permission, element) {
    if (permission.identifiedBy) {
        if (Array.isArray(element)) {
            if (permission.values.length) {
                element = element.filter(child => permission.values.includes(child[`${permission.identifiedBy}`]));
                if (element.length) {
                    return element;
                }
            }
        } else if (permission.values.includes(element[`${permission.identifiedBy}`])) {
            return element;
        }

        return undefined;
    }

    return element;
}

function verifyEnvironment(permission, environment) {
    if (permission.environments?.length) {
        return environment && permission.environments.includes(environment);
    }
    
    return true;
}