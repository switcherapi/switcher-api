import History from '../models/history';
import { sortBy, validatePagingArgs } from '../helpers';
import { BadRequestError } from '../exceptions';

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