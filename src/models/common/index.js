import History from '../history';

export async function recordHistory(modifiedField, oldDocument, newDocument, domainId, ignoredFields = []) {
    const oldValues = new Map();
    const defaultIgnoredFields = ['_id', 'updatedAt'];

    if (ignoredFields.length) {
        ignoredFields.forEach(field => defaultIgnoredFields.push(field))
    }

    modifiedField.forEach(field => {
        if (!defaultIgnoredFields.includes(field) && !field.startsWith('activated.')) {
            oldValues.set(field, extractValue(oldDocument[`${field}`]));
        }
    });

    const newValues = new Map();
    modifiedField.forEach(field => {
        if (!defaultIgnoredFields.includes(field) && !field.startsWith('activated.')) {
            if (JSON.stringify(oldValues.get(field)) === JSON.stringify(newDocument[`${field}`])) {
                oldValues.delete(field);
            } else {
                newValues.set(field, extractValue(newDocument[`${field}`]));
            }
        }
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

function extractValue(element) {
    if (Array.isArray(element)) {
        return element.map(val => {
            return val.name ? val.name : val.key ? val.key : val;
        });
    }

    return element;
}