import { permissionCache } from '../../src/helpers/cache';
import { EnvType } from '../../src/models/environment';
import { ActionTypes, RouterTypes } from '../../src/models/permission';

describe('Test permissionCache', () => {

    beforeEach(() => {
        permissionCache.cache.clear();
    });

    it('UNIT_CACHE - Should set and get cache', () => {
        const cacheKey = permissionCache.permissionKey(
            'adminId', 
            'domainId', 
            'parentId',
            [ActionTypes.UPDATE, ActionTypes.READ], 
            RouterTypes.GROUP
        );

        permissionCache.set(cacheKey, 'value');
        expect(permissionCache.has(cacheKey)).toBe(true);
        const result = permissionCache.get(cacheKey);
        expect(result).toEqual('value');
    });

    it('UNIT_CACHE - Should reload cache', () => {
        const cacheKey = permissionCache.permissionKey(
            'adminId', 
            'domainId', 
            'parentId',
            [ActionTypes.UPDATE, ActionTypes.READ], 
            RouterTypes.GROUP
        );

        permissionCache.set(cacheKey, 'value');
        permissionCache.permissionReset('domainId', ActionTypes.UPDATE, RouterTypes.GROUP);
        const result = permissionCache.get(cacheKey);
        expect(result).toBeUndefined();
    });

    it('UNIT_CACHE - Should NOT reload cache', () => {
        const cacheKey = permissionCache.permissionKey(
            'adminId', 
            'domainId', 
            'parentId',
            [ActionTypes.UPDATE, ActionTypes.READ], 
            RouterTypes.GROUP
        );

        permissionCache.set(cacheKey, 'value');
        permissionCache.permissionReset('domainId', ActionTypes.UPDATE, RouterTypes.CONFIG);
        const result = permissionCache.get(cacheKey);
        expect(result).toEqual('value');
    });

    it('UNIT_CACHE - Should NOT reload cache - empty router/action', () => {
        const cacheKey = permissionCache.permissionKey(
            'adminId', 
            'domainId', 
            'parentId',
            [ActionTypes.UPDATE, ActionTypes.READ], 
            RouterTypes.GROUP
        );

        permissionCache.set(cacheKey, 'value');
        permissionCache.permissionReset();
        const result = permissionCache.get(cacheKey);
        expect(result).toEqual('value');
    });

    it('UNIT_CACHE - Should NOT get from cache - different environment', () => {
        const cacheKey = permissionCache.permissionKey(
            'adminId', 
            'domainId', 
            'parentId',
            [ActionTypes.UPDATE, ActionTypes.READ], 
            RouterTypes.GROUP,
            EnvType.DEFAULT
        );

        permissionCache.set(cacheKey, 'value1');
        const result = permissionCache.get(cacheKey);
        expect(result).toEqual('value1');

        const cacheKey2 = permissionCache.permissionKey(
            'adminId', 
            'domainId', 
            'parentId',
            [ActionTypes.UPDATE, ActionTypes.READ], 
            RouterTypes.GROUP
        );

        const result2 = permissionCache.get(cacheKey2);
        expect(result2).toBeUndefined();
    });

    it('UNIT_CAHCE - Should reload cache - requested router ALL to be removed', () => {
        const cacheKey = permissionCache.permissionKey(
            'adminId', 
            'domainId', 
            'parentId',
            [ActionTypes.READ], 
            RouterTypes.GROUP
        );

        permissionCache.set(cacheKey, 'value');
        permissionCache.permissionReset('domainId', ActionTypes.ALL, RouterTypes.ALL);
        const result = permissionCache.get(cacheKey);
        expect(result).toBeUndefined();
    });

    it('UNIT_CAHCE - Should NOT reload cache - requested different action for router ALL', () => {
        const cacheKey = permissionCache.permissionKey(
            'adminId', 
            'domainId', 
            'parentId',
            [ActionTypes.READ], 
            RouterTypes.GROUP
        );

        permissionCache.set(cacheKey, 'value');
        permissionCache.permissionReset('domainId', ActionTypes.UPDATE, RouterTypes.ALL);
        const result = permissionCache.get(cacheKey);
        expect(result).toEqual('value');
    });

});