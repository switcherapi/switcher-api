import Logger from '../../helpers/logger.js';
import { getDomainById, updateDomainVersion } from '../domain.js';
import { processChanged } from './push-changed.js';
import { processDeleted } from './push-deleted.js';
import { processNew } from './push-new.js';
import * as GitOpsFacade from '../../external/gitops.js';

const CHANGE_PROCESSES = Object.freeze({
    NEW: processNew,
    CHANGED: processChanged,
    DELETED: processDeleted
});

export const ADMIN_EMAIL = 'gitops@admin.noreply.switcherapi.com';

export async function pushChanges(domainId, environment, changes) {
    Logger.debug(`Pushing changes to domain ${domainId} for environment ${environment}`);
    Logger.debug(`Changes: ${JSON.stringify(changes)}`);

    let domain = await getDomainById(domainId);
    for (const change of changes) {
        await CHANGE_PROCESSES[change.action](domain, change, environment);
    }

    domain = await updateDomainVersion(domainId);
    return {
        message: 'Changes applied successfully',
        version: domain.lastUpdate
    };
}

export async function subscribeAccount(account) {
    return GitOpsFacade.createAccount(account);
}

export async function updateAccount(account) {
    return GitOpsFacade.updateAccount(account);
}

export async function updateAccountToken(account) {
    return GitOpsFacade.updateAccount({
        environment: account.environment,
        token: account.token,
        domain: {
            id: account.domain.id
        }
    });
}

export async function forceSyncAccount(account) {
    return GitOpsFacade.updateAccount({
        environment: account.environment,
        lastcommit: 'refresh',
        domain: {
            id: account.domain.id
        }
    });
}