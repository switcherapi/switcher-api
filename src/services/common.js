import { NotFoundError } from '../exceptions/index.js';

export function response(element, onErrorMessage) {
    if (!element) throw new NotFoundError(onErrorMessage);
    return element;
}