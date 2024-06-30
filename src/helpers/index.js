import { BadRequestError, PermissionError } from '../exceptions/index.js';
import { EnvType } from '../models/environment.js';
import { getDomainById } from '../services/domain.js';
import { getEnvironments } from '../services/environment.js';
import { getTeams } from '../services/team.js';
import { verifyPermissions, verifyPermissionsCascade } from './permission.js';

const PATTERN_ALPHANUMERIC_SPACE = /^[a-zA-Z0-9_\- ]*$/;
const PATTERN_ALPHANUMERIC = /^[a-zA-Z0-9_-]*$/;

export async function checkEnvironmentStatusRemoval(domainId, environmentName, strategy = false) {
    const environment = await getEnvironments({ domain: domainId }, ['_id', 'name']);
    const isValidOperation = environment.filter((e) => 
        e.name === environmentName && 
        !strategy ? environmentName !== EnvType.DEFAULT : strategy).length > 0;
        
    if (!isValidOperation) {
        throw new BadRequestError('Invalid environment');
    }
}

export function containsValue(arr, value) {
    if (!arr?.length) {
        return false;
    }

    for (const v of arr) {
        if (v.includes(value)) {
            return true;
        }
    }
}

export function formatInput(input, 
    options = { 
        toUpper: false, 
        toLower: false, 
        autoUnderscore: false, 
        allowSpace: false 
    }) {

    let regexStr;
    if (options.autoUnderscore) {
        regexStr = PATTERN_ALPHANUMERIC_SPACE;
    } else {
        regexStr = options.allowSpace ? PATTERN_ALPHANUMERIC_SPACE : PATTERN_ALPHANUMERIC;
    }

    const regex = new RegExp(regexStr);
    if (!regex.test(input)) {
        throw new Error('Invalid input format. Use only alphanumeric digits.');
    }
    
    if (options.toUpper) {
        input = input.toUpperCase();
    } else if (options.toLower) {
        input = input.toLowerCase();
    }

    if (options.autoUnderscore) {
        input = input.replace(/\s/g, '_');
    }

    return input.trim();
}

export function sortBy(args) {
    const sort = {};

    if (args.sortBy) {
        const parts = args.sortBy.split(':');
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }

    return sort;
}

export function validatePagingArgs(args) {
    if (args.limit && !Number.isInteger(parseInt(args.limit)) || parseInt(args.limit) < 1) {
        return false;
    }
     
    if (args.skip && !Number.isInteger(parseInt(args.skip)) || parseInt(args.skip) < 0) {
        return false;
    }

    if (args.sortBy) {
        const parts = args.sortBy.split(':');

        if (parts.length != 2) {
            return false;
        }
            
        if (!parts[0].match(/^[A-Za-z]+$/)) {
            return false;
        }

        if (parts[1] != 'asc' && parts[1] != 'desc') {
            return false;
        }
    }

    return true;
}

/**
 * This function verifies if the user has permission to perform the action(s) on the element(s).
 * It initially checks if the user is the owner of the domain. If not, it checks if the user is a member of any team that has permission to perform the action(s) on the element(s).
 * If the user is the owner of the domain, it returns the element(s) without any further checks.
 * If the user is not the owner of the domain, it checks if the user is a member of any team that has permission to perform the action(s) on the element(s). If not, it throws an error.
 * If the user is a member of any team that has permission to perform the action(s) on the element(s), it returns the element(s).
 * 
 * @param {*} admin user object with the following properties: _id, teams
 * @param {*} element object or array of objects to be verified
 * @param {*} domainId domain id
 * @param {*} actions single or array of actions to be verified (e.g. 'READ', ['READ', 'UPDATE']) 
 * @param {*} routerType router type (e.g. 'GROUP', 'DOMAIN') 
 * @param {*} cascade if true, it will check if the user has permission to perform the action(s) on the element(s) and its children 
 * @param {*} environment environment name (e.g. 'default') 
 * 
 * @returns element(s) if the user has permission to perform the action(s) on the element(s)
 */
export async function verifyOwnership(admin, element, domainId, actions, routerType, cascade = false, environment = undefined) {
    // Return element if user is the owner of the domain
    const domain = await getDomainById(domainId);
    if (admin._id.equals(domain.owner)) {
        return element;
    }
    
    // Throw error if user has no teams
    const teams = await getTeams({ _id: { $in: admin.teams }, domain: domain._id, active: true });
    if (!teams.length || !admin.teams.length) {
        throw new PermissionError('It was not possible to find any team that allows you to proceed with this operation');
    }

    const actionsArray = Array.isArray(actions) ? actions : [actions];
    let hasPermission = [];
    let allowedElement;

    // Verify each team permission
    for (const team of teams) {
        if (cascade) {
            allowedElement = await verifyPermissionsCascade(team, element, actionsArray, routerType, environment);
        } else {
            allowedElement = await verifyPermissions(team, element, actionsArray, routerType, environment);
        }
        
        if (allowedElement) {
            hasPermission.push(allowedElement);
        }
    }
    
    if (!hasPermission.length) {
        throw new PermissionError('Action forbidden');
    }
    
    if (Array.isArray(element)) {
        hasPermission = hasPermission.flat(Infinity);
        hasPermission = [...new Set(hasPermission)];
        return hasPermission;
    }

    return element;
}