import mongoose from 'mongoose';
import moment from 'moment';
import bcryptjs from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Config } from './config.js';
import { EncryptionSalts } from './common/index.js';

const componentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
        minlength: 2
    },
    description: {
        type: String,
        trim: true,
        maxlength: 256
    },
    domain: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Domain'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Admin'
    },
    apihash: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true
});

componentSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (_doc, ret) {
        if (ret.updatedAt || ret.createdAt) {
            ret.updatedAt = moment(ret.updatedAt).format('YYYY-MM-DD HH:mm:ss');
            ret.createdAt = moment(ret.createdAt).format('YYYY-MM-DD HH:mm:ss');
        }
        delete ret.apihash;
        return ret;
    }
};

componentSchema.methods.generateApiKey = async function () {
    const component = this;

    const apiKey = randomUUID();
    const hash = await bcryptjs.hash(apiKey, EncryptionSalts.COMPONENT);
    component.apihash = hash;
    await component.save();
    
    return apiKey;
};

const existComponent = async ({ domain, name, __v }) => {
    if (__v === undefined) {
        const foundComponent = await Component.find({ domain, name }).exec();
        return foundComponent.length > 0;
    }
    return false;
};

componentSchema.pre('validate', async function (next) {
    const component = this;

    // Verify if component already exists
    if (await existComponent(component)) {
        const err = new Error(`Unable to complete the operation. Component '${component.name}' already exists for this Domain`);
        next(err);
    }

    next();
});

componentSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    const component = this;
    
    const configsToRemoveFrom = await Config.find({ components: { $in: [component._id] } }).exec();
    configsToRemoveFrom.forEach(config => {
        const indexValue = config.components.indexOf(component._id);
        config.components.splice(indexValue, 1);
        config.save();
    });

    next();
});

const Component = mongoose.model('Component', componentSchema);

export default Component;