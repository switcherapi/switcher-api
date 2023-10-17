import { ActionTypes } from '../models/permission';

class Cache {
    constructor() {
        this.cache = new Map();
    }

    set(key, value) {
        if (!this.isPermissionCacheActivated()) {
            return;
        }

        this.cache.set(key, value);
    }

    get(key) {
        return this.cache.get(key);
    }

    permissionKey(adminId, domainId, parentId, actions, router) {
        return JSON.stringify({
            adminId: String(adminId),
            domainId: String(domainId),
            parentId: String(parentId),
            actions,
            router
        });
    }

    permissionReset(domainId, action, router, parentId) {
        if (!domainId || !action || !router) {
            return;
        }

        const keys = this.cache.keys();
        for (const key of keys) {
            const parsedKey = JSON.parse(key);
            if (this.matchesKey(parsedKey, domainId, action, router, parentId)) {
                this.cache.delete(key);
            }
        }
    }

    matchesKey(parsedKey, domainId, action, router, parentId) {
        return parsedKey.domainId === String(domainId) && 
            (parentId === undefined || parsedKey.parentId === String(parentId)) &&
            (action === ActionTypes.ALL || parsedKey.actions.includes(action)) && 
            parsedKey.router === router;
    }

    isPermissionCacheActivated() {
        return process.env.PERMISSION_CACHE_ACTIVATED === 'true';
    }

    has(key) {
        return this.cache.has(key);
    }
}

const permissionCache = new Cache();

export { permissionCache };