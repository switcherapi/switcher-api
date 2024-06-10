import { ActionTypes, RouterTypes } from '../models/permission.js';

class Cache {
    constructor() {
        this.cache = new Map();
    }

    set(key, value) {
        if (!this._isPermissionCacheActivated()) {
            return;
        }

        this.cache.set(key, value);
    }

    get(key) {
        return this.cache.get(key);
    }

    has(key) {
        return this.cache.has(key);
    }

    permissionKey(adminId, domainId, parentId, actions, router, environment) {
        return JSON.stringify({
            adminId: String(adminId),
            domainId: String(domainId),
            parentId: String(parentId),
            actions,
            router,
            environment
        });
    }

    permissionReset(domainId, action, router, parentId) {
        if (!domainId || !action || !router) {
            return;
        }

        const keys = this.cache.keys();
        for (const key of keys) {
            const parsedKey = JSON.parse(key);
            if (this._matchesKey(parsedKey, domainId, action, router, parentId)) {
                this.cache.delete(key);
            }
        }
    }

    _matchesKey(parsedKey, domainId, action, router, parentId) {
        return parsedKey.domainId === String(domainId) && 
            (parentId === undefined || parsedKey.parentId === String(parentId)) &&
            (action === ActionTypes.ALL || parsedKey.actions.includes(action)) && 
            (router === RouterTypes.ALL || parsedKey.router === router);
    }

    _isPermissionCacheActivated() {
        return process.env.PERMISSION_CACHE_ACTIVATED === 'true';
    }
}

const permissionCache = new Cache();

export { permissionCache };