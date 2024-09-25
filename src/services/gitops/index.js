import { getDomainById, updateDomainVersion } from '../domain.js';
import { processChanged } from './push-changed.js';
import { processNew } from './push-new.js';

export const ADMIN_EMAIL = 'gitops@admin.noreply.switcherapi.com';

export async function pushChanges(domainId, environment, changes) {
    let domain = await getDomainById(domainId);
    for (const change of changes) {
        switch (change.action) {
            case 'NEW':
                await processNew(domain, change, environment);
                break;
            case 'CHANGED':
                await processChanged(domain, change, environment);
                break;
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