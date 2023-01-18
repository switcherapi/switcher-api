import History from '../models/history';
import { sortBy } from '../helpers';

export async function getHistory(query, domainId, elementId, specs = {}) {
    const findQuery = elementId ? { domainId, elementId } : { domainId };

    return History.find(findQuery)
            .select(query)
            .sort(sortBy(specs))
            .limit(parseInt(specs.limit || 10))
            .skip(parseInt(specs.skip || 0))
            .exec();
}

export async function deleteHistory(domainId, elementId) {
    await History.deleteMany({ domainId, elementId }).exec();
}