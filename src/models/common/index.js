import History from '../history';

export async function recordHistory(modifiedField, oldDocument, newDocument) {
    const oldValues = new Map();
    modifiedField.forEach(field => {
        if (field !== '_id' && !field.startsWith('activated.')) {
            oldValues.set(field, oldDocument[`${field}`]);
        }
    });

    const newValues = new Map();
    modifiedField.forEach(field => {
        if (field !== '_id' && !field.startsWith('activated.')) {
            newValues.set(field, newDocument[`${field}`]);
        }
    });

    const history = new History({
        elementId: newDocument._id,
        oldValue: oldValues,
        newValue: newValues
    });
    
    if (process.env.HISTORY_ACTIVATED === 'true') {
        await history.save();
    }
}