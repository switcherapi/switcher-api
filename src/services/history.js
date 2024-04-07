import History from '../models/history.js';
import { sortBy, validatePagingArgs } from '../helpers/index.js';
import { BadRequestError } from '../exceptions/index.js';

export async function getHistory(query, domainId, elementId, pagingArgs = {}) {
    if (!validatePagingArgs(pagingArgs))
        throw new BadRequestError('Invalid paging args');

    return History.find({ domainId, elementId })
            .select(query)
            .sort(sortBy(pagingArgs))
            .limit(parseInt(pagingArgs.limit || 10))
            .skip(parseInt(pagingArgs.skip || 0))
            .exec();
}

export async function deleteHistory(domainId, elementId) {
    await History.deleteMany({ domainId, elementId }).exec();
}