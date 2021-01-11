import Domain from '../models/domain';
import { response } from './common';

export async function getDomainById(id) {
    let domain = await Domain.findById(id);
    return response(domain, 'Domain not found');
}