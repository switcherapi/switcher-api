import { NotFoundError } from '../exceptions';

export function response(element, onErrorMessage) {
    if (!element) throw new NotFoundError(onErrorMessage);
    return element;
}