import History from '../history';
import { checkHistory } from '../../external/switcher-api-facade';

function checkDifference(diff, documents, defaultIgnoredFields, 
    keyArr, keys, pos) {
    
    if (!defaultIgnoredFields.includes(keyArr[pos])) {
        const vals = {
            oldValue: getValue(documents.oldDocument, keyArr[pos]) || '',
            newValue: getValue(documents.newDocument, keyArr[pos]) || ''
        };
        
        if (typeof vals.oldValue === 'object' || typeof vals.newValue === 'object') {
            validateObjects(diff, documents, vals, keyArr, defaultIgnoredFields, keys, pos);
        } else {
            if (!Object.is(vals.oldValue, vals.newValue)) {
                diff.oldValues.set(keys, vals.oldValue);
                diff.newValues.set(keys, vals.newValue);
            }
        }
    }
}

/**
 * Compares objects
 * 
 * @param {*} diff old/new values that are different
 * @param {*} documents old/new document evaluated
 * @param {*} vals old/new values to be compared
 * @param {*} keyArr fields to be compared
 * @param {*} defaultIgnoredFields fields to be ignores
 * @param {*} keys field that will be added to history
 * @param {*} pos current validation position
 */
function validateObjects(diff, documents, vals, keyArr, 
    defaultIgnoredFields, keys, pos) {
    if (keyArr.length - 1 > pos) {
        documents = {
            oldDocument: getValue(documents.oldDocument, keyArr[pos]),
            newDocument: getValue(documents.newDocument, keyArr[pos])
        };

        checkDifference(diff, documents, defaultIgnoredFields, keyArr, keys, pos+1);
    } else {
        if (!Object.is(extractValue(vals.oldValue), extractValue(vals.newValue))) {
            diff.oldValues.set(keys, extractValue(vals.oldValue));
            diff.newValues.set(keys, extractValue(vals.newValue));
        }
    }
}

function extractValue(element) {
    if (Array.isArray(element)) {
        return element.map(val => {
            if (val.name) return val.name;
            return val.key ? val.key : val;
        });
    }
}

function getValue(document, field) {
    if (document != undefined) {
        if (document instanceof Map) {
            return typeof document.get(field) === 'boolean' ?
                String(document.get(field)) : document.get(field);
        } else {
            return typeof document[field] === 'boolean' ? 
                String(document[field]) : document[field];
        }
    } else {
        return '';
    }
}

export async function recordHistory(modifiedField, oldDocument, newDocument, domainId, ignoredFields = []) {
    const defaultIgnoredFields = ['_id', 'updatedAt'];
    const diff = { oldValues: new Map(), newValues: new Map() };
    const documents = { oldDocument, newDocument };

    if (!await checkHistory(domainId))
        return;

    if (ignoredFields.length) {
        ignoredFields.forEach(field => defaultIgnoredFields.push(field));
    }
    
    modifiedField.forEach(keys => {
        const keyArr = keys.split('.');
        checkDifference(diff, documents, defaultIgnoredFields, 
            keyArr, keys.replace(/\./g, '/'), 0);
    });
    
    const history = new History({
        domainId,
        elementId: newDocument._id,
        oldValue: diff.oldValues,
        newValue: diff.newValues,
        updatedBy: newDocument.updatedBy,
        date: Date.now()
    });
    
    if (diff.newValues.size > 0 && process.env.HISTORY_ACTIVATED === 'true') {
        await history.save();
    }
}