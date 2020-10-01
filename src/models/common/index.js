import History from '../history';
import { checkHistory } from '../../external/switcher-api-facade';

function checkDifference(oldValues, newValues, oldDocument, newDocument, 
    defaultIgnoredFields, keyArr, keys, pos) {
    
    if (!defaultIgnoredFields.includes(keyArr[pos])) {
        const oldValue = getValue(oldDocument, keyArr[pos]) || '';
        const newValue = getValue(newDocument, keyArr[pos]) || '';
        
        if (typeof oldValue === 'object' || typeof newValue === 'object') {
            if (keyArr.length - 1 > pos) {
                checkDifference(oldValues, newValues,  
                    getValue(oldDocument, keyArr[pos]), 
                    getValue(newDocument, keyArr[pos]), 
                    defaultIgnoredFields, keyArr, keys, pos+1);
            } else {
                if (!Object.is(extractValue(oldValue), extractValue(newValue))) {
                    oldValues.set(keys, extractValue(oldValue));
                    newValues.set(keys, extractValue(newValue));
                }
            }
        } else {
            if (!Object.is(oldValue, newValue)) {
                oldValues.set(keys, oldValue);
                newValues.set(keys, newValue);
            }
        }
    }
}

function extractValue(element) {
    if (Array.isArray(element)) {
        return element.map(val => {
            return val.name ? val.name : val.key ? val.key : val;
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
    const oldValues = new Map();
    const newValues = new Map();
    const defaultIgnoredFields = ['_id', 'updatedAt'];

    if (!await checkHistory(domainId))
        return;

    if (ignoredFields.length) {
        ignoredFields.forEach(field => defaultIgnoredFields.push(field));
    }
    
    modifiedField.forEach(keys => {
        const keyArr = keys.split('.');
        checkDifference(oldValues, newValues, oldDocument, newDocument, 
            defaultIgnoredFields, keyArr, keys.replace(/\./g, '/'), 0);
    });
    
    const history = new History({
        domainId,
        elementId: newDocument._id,
        oldValue: oldValues,
        newValue: newValues,
        updatedBy: newDocument.updatedBy,
        date: Date.now()
    });
    
    if (newValues.size > 0 && process.env.HISTORY_ACTIVATED === 'true') {
        await history.save();
    }
}