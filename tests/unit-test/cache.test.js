import { permissionCache } from "../../src/helpers/cache";
import { ActionTypes, RouterTypes } from "../../src/models/permission";

describe("Test permissionCache", () => {

    it("UNIT_CACHE - Should set and get cache", () => {
        const cacheKey = permissionCache.permissionKey(
            'adminId', 
            'domainId', 
            ['element1Id', 'element2Id'], 
            [ActionTypes.UPDATE, ActionTypes.READ], 
            RouterTypes.GROUP
        );

        permissionCache.set(cacheKey, 'value');
        expect(permissionCache.has(cacheKey)).toBe(true);
        const result = permissionCache.get(cacheKey);
        expect(result).toEqual('value');
    });

    it("UNIT_CACHE - Should reload cache", () => {
        const cacheKey = permissionCache.permissionKey(
            'adminId', 
            'domainId', 
            ['element1Id', 'element2Id'], 
            [ActionTypes.UPDATE, ActionTypes.READ], 
            RouterTypes.GROUP
        );

        permissionCache.set(cacheKey, 'value');
        permissionCache.permissionReset('domainId', ActionTypes.UPDATE, RouterTypes.GROUP);
        const result = permissionCache.get(cacheKey);
        expect(result).toBeUndefined();
    });

    it("UNIT_CACHE - Should not reload cache", () => {
        const cacheKey = permissionCache.permissionKey(
            'adminId', 
            'domainId', 
            ['element1Id', 'element2Id'], 
            [ActionTypes.UPDATE, ActionTypes.READ], 
            RouterTypes.GROUP
        );

        permissionCache.set(cacheKey, 'value');
        permissionCache.permissionReset('domainId', ActionTypes.UPDATE, RouterTypes.CONFIG);
        const result = permissionCache.get(cacheKey);
        expect(result).toEqual('value');
    });

    it("UNIT_CACHE - Should not reload cache - empty router/action", () => {
        const cacheKey = permissionCache.permissionKey(
            'adminId', 
            'domainId', 
            ['element1Id', 'element2Id'], 
            [ActionTypes.UPDATE, ActionTypes.READ], 
            RouterTypes.GROUP
        );

        permissionCache.set(cacheKey, 'value');
        permissionCache.permissionReset();
        const result = permissionCache.get(cacheKey);
        expect(result).toEqual('value');
    });

});