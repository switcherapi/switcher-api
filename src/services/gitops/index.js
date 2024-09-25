import { getDomainById, updateDomainVersion } from '../domain.js';
import { processChanged } from './push-changed.js';
import { processNew } from './push-new.js';

export const ADMIN_EMAIL = 'gitops@admin.noreply.switcherapi.com';

export async function pushChanges(domainId, environment, changes) {
    let domain = await getDomainById(domainId);
    for (const change of changes) {
        if (change.action === 'NEW') {
            await processNew(domain, change, environment);
        } else if (change.action === 'CHANGED') {
            await processChanged(domain, change, environment);
        }
    };

    domain = await updateDomainVersion(domainId);
    return successResponse('Changes applied successfully', domain.lastUpdate);
}

function successResponse(message, version) {
    return {
        message,
        version
    };
}