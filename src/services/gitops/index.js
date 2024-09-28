import Logger from '../../helpers/logger.js';
import { getDomainById, updateDomainVersion } from '../domain.js';
import { processChanged } from './push-changed.js';
import { processDeleted } from './push-deleted.js';
import { processNew } from './push-new.js';

export const ADMIN_EMAIL = 'gitops@admin.noreply.switcherapi.com';

export async function pushChanges(domainId, environment, changes) {
    Logger.debug(`Pushing changes to domain ${domainId} for environment ${environment}`);
    Logger.debug(`Changes: ${JSON.stringify(changes)}`);

    let domain = await getDomainById(domainId);
    for (const change of changes) {
        switch (change.action) {
            case 'NEW':
                await processNew(domain, change, environment);
                break;
            case 'CHANGED':
                await processChanged(domain, change, environment);
                break;
            case 'DELETED':
                await processDeleted(domain, change, environment);
                break;
        }
    };

    domain = await updateDomainVersion(domainId);
    return {
        message: 'Changes applied successfully',
        version: domain.lastUpdate
    };
}