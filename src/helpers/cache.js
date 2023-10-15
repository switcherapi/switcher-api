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

    permissionKey(adminId, domainId, elements, action, router) {
        return JSON.stringify({
            adminId: String(adminId),
            domainId: String(domainId),
            elements: elements.map(element => String(element._id)),
            actions: action,
            router: router
        });
    }

    permissionReset(domainId, action, router) {
        if (!domainId || !action || !router) {
            return;
        }

        const keys = this.cache.keys();
        for (const key of keys) {
            const parsedKey = JSON.parse(key);
            if (parsedKey.domainId === String(domainId) && 
                parsedKey.actions.includes(action) && 
                parsedKey.router === router) {
                this.cache.delete(key);
            }
        }
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