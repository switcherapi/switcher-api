import mongoose from 'mongoose';
import moment from 'moment';
import History from './history.js';
import { ConfigStrategy } from './config-strategy.js';
import { EnvType } from './environment.js';
import { recordHistory } from './common/index.js';
import { checkMetrics } from '../external/switcher-api-facade.js';

export const RelayMethods = Object.freeze({
    POST: 'POST',
    GET: 'GET'
});

export const RelayTypes = Object.freeze({
    VALIDATION: 'VALIDATION',
    NOTIFICATION: 'NOTIFICATION'
});

export const StrategiesToRelayDataType = Object.freeze({
    NETWORK_VALIDATION: 'network',
    VALUE_VALIDATION: 'value',
    NUMERIC_VALIDATION: 'numeric',
    TIME_VALIDATION: 'time',
    DATE_VALIDATION: 'date',
    REGEX_VALIDATION: 'regex',
    PAYLOAD_VALIDATION: 'payload'
});

const configSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        trim: true,
        maxlength: 30,
        minlength: 3
    },
    description: {
        type: String,
        trim: true,
        maxlength: 256
    },
    activated: {
        type: Map,
        of: Boolean,
        required: true,
        default: new Map().set(EnvType.DEFAULT, true)
    },
    components: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    group: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'GroupConfig'
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
    disable_metrics: {
        type: Map,
        of: Boolean,
        required: true,
        default: new Map().set(EnvType.DEFAULT, false)
    },
    updatedBy: {
        type: String
    },
    relay: {
        type: {
            type: String,
            enum: Object.values(RelayTypes)
        },
        description: {
            type: String,
            maxlength: 256
        },
        activated: {
            type: Map,
            of: Boolean
        },
        endpoint: {
            type: Map,
            of: String
        },
        method: {
            type: String,
            enum: Object.values(RelayMethods)
        },
        auth_prefix: {
            type: String
        },
        auth_token: {
            type: Map,
            of: String
        },
        verified: {
            type: Map,
            of: Boolean,
            default: new Map()
        }
    }
}, {
    timestamps: true
});

configSchema.index({ key: 1 });

configSchema.virtual('admin', {
    ref: 'Admin',
    localField: 'owner',
    foreignField: '_id',
    justOne: true
});

configSchema.virtual('component_list', {
    ref: 'Component',
    localField: 'components',
    foreignField: '_id'
});

configSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (_doc, ret) {
        if (ret.updatedAt || ret.createdAt) {
            ret.updatedAt = moment(ret.updatedAt).format('YYYY-MM-DD HH:mm:ss');
            ret.createdAt = moment(ret.createdAt).format('YYYY-MM-DD HH:mm:ss');
        }

        if (!ret.id) {
            delete ret.id;
        }

        if (!ret.relay) {
            delete ret.relay;
        } else if (!ret.relay.auth_prefix) {
            delete ret.relay.auth_prefix;
            delete ret.relay.auth_token;
        }
        
        if (ret.component_list) {
            ret.components = ret.component_list;
            delete ret.component_list;
        }
        return ret;
    }
};

async function recordConfigHistory(config, modifiedField) {
    if (config.__v !== undefined && modifiedField.length) {
        const oldConfig = await Config.findById(config._id).exec();
        await oldConfig.populate({ path: 'component_list' });
        await recordHistory(modifiedField, oldConfig.toJSON(), config, config.domain);
    }
}

function hasRelayEndpointUpdates(config, modifiedField) {
    const hasUpdate = modifiedField.filter(field => field.indexOf('relay.endpoint.') >= 0);
    
    if (hasUpdate.length) {
        const environment = hasUpdate[0].split('.')[2];
        config.relay.verified.set(environment, false);
    }
}

configSchema.virtual('configStrategy', {
    ref: 'ConfigStrategy',
    localField: '_id',
    foreignField: 'config'
});

configSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    const config = this;
    
    const strategies = await ConfigStrategy.find({ config: config._id }).exec();
    if (strategies) {
        for (const strategy of strategies) {
            await Promise.resolve(strategy.deleteOne());
        }
    }
    
    await History.deleteMany({ domainId: config.domain, elementId: config._id }).exec();
    next();
});

configSchema.pre('save', async function (next) {
    const config = this;
    await config.populate({ path: 'component_list' });
    await recordConfigHistory(config.toJSON(), this.modifiedPaths());
    await checkMetrics(config);
    hasRelayEndpointUpdates(config, this.modifiedPaths());

    next();
});

export const Config = mongoose.model('Config', configSchema);

export function relayOptions() {
    return {
        methods: Object.values(RelayMethods),
        types: Object.values(RelayTypes)
    };
}