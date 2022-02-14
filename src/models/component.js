import mongoose from 'mongoose';
import moment from 'moment';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Config } from './config';
import Domain from './domain';

const componentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
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
    transform: function (doc, ret) {
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
    const apiKey = await bcrypt.hash(component._id + component.name, 8);
    const hash = await bcrypt.hash(apiKey, 8);
    component.apihash = hash;
    await component.save();
    
    return Buffer.from(apiKey).toString('base64');
};

componentSchema.methods.generateAuthToken = async function (environment) {
    const component = this;

    var options = {
        expiresIn: process.env.JWT_CLIENT_TOKEN_EXP_TIME
    };

    return jwt.sign(({ 
        component: component._id,
        environment,
        vc: component.apihash.substring(50, component.apihash.length - 1) 
    }), process.env.JWT_SECRET, options);
};

componentSchema.statics.findByCredentials = async (domainName, componentName, apiKey) => {
    const domain = await Domain.findOne({ name: domainName });
    const component = await Component.findOne({ name: componentName, domain: domain._id || '' });

    if (!component) {
        throw new Error('Unable to find this Component');
    }

    let decoded = Buffer.from(apiKey, 'base64').toString('ascii');
    const isMatch = await bcrypt.compare(decoded, component.apihash);

    if (!isMatch) {
        throw new Error('Unable to find this Component');
    }

    return {
        component,
        domain
    };
};

const existComponent = async ({ domain, name, __v }) => {
    if (__v === undefined) {
        const foundComponent = await Component.find({ domain, name });
        return foundComponent.length > 0;
    }
    return false;
};

componentSchema.pre('validate', async function (next) {
    const component = this;

    // Verify if component already exist
    if (await existComponent(component)) {
        const err = new Error(`Unable to complete the operation. Component '${component.name}' already exist for this Domain`);
        next(err);
    }

    next();
});

componentSchema.pre('remove', async function (next) {
    const component = this;
    
    const configsToRemoveFrom = await Config.find({ components: { $in: [component._id] } });
    configsToRemoveFrom.forEach(config => {
        const indexValue = config.components.indexOf(component._id);
        config.components.splice(indexValue, 1);
        config.save();
    });

    next();
});

const Component = mongoose.model('Component', componentSchema);

export default Component;