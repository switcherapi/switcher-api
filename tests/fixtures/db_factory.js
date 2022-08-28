import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import Component from '../../src/models/component';
import Domain from '../../src/models/domain';
import { EnvType } from '../../src/models/environment';

export async function createDummyDomain(domainName, accountId) {
    const domainDocument = {
        _id: new mongoose.Types.ObjectId(),
        name: domainName,
        description: 'Dummy Domain',
        activated: new Map().set(EnvType.DEFAULT, true),
        owner: accountId
    };

    await new Domain(domainDocument).save();
    return domainDocument;
}

export async function createDummyComponent(componentName, domainId, accountId) {
    const componentDocument = {
        _id: new mongoose.Types.ObjectId(),
        name: componentName,
        description: 'Test app',
        domain: domainId,
        owner: accountId
    };

    const apiKey = await bcryptjs.hash(componentDocument._id + componentDocument.name, 8);
    const hash = await bcryptjs.hash(apiKey, 8);
    componentDocument.apihash = hash;
    
    await new Component(componentDocument).save();
    return componentDocument;
}