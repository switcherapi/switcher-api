export function getFields(elements, fields) {
    return elements.map(element => {
        const newElement = {};
        for (const field of fields.split(',')) {
            if (field.includes('.')) {
                const nestedFields = field.split('.');
                const nextNestedFields = field.substring(field.indexOf('.') + 1);
                
                const nestedElement = getElement(element, nestedFields[0]);
                newElement[nestedFields[0]] = getFields([nestedElement], nextNestedFields)[0];
            } else {
                newElement[field] = getElement(element, field);
            }
        }
        return newElement;
    });
}

function getElement(element, field) {
    if (!element) {
        return undefined;
    }
    
    if (element.get) {
        return element.get(field);
    }
    
    return element[field];
}