import mongoose from 'mongoose';
import moment from 'moment';
import History from './history';
import { ConfigStrategy } from './config-strategy';
import { EnvType } from './environment';
import { recordHistory } from './common/index';
import { checkMetrics } from '../external/switcher-api-facade';

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
    REGEX_VALIDATION: 'regex'
});

const configSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true
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
        of: Boolean
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
            type: String
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
        }
    }
}, {
    timestamps: true
})

configSchema.index({ key: 1 });

configSchema.virtual('component_list', {
    ref: 'Component',
    localField: 'components',
    foreignField: '_id'
})

configSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret, options) {
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
}

async function recordConfigHistory(config, modifiedField) {
    if (config.__v !== undefined && modifiedField.length) {
        const oldConfig = await Config.findById(config._id);
        await oldConfig.populate({ path: 'component_list' }).execPopulate();
        await recordHistory(modifiedField, oldConfig.toJSON(), config, config.domain);
    }
}

configSchema.virtual('configStrategy', {
    ref: 'ConfigStrategy',
    localField: '_id',
    foreignField: 'config'
})

configSchema.pre('remove', async function (next) {
    const config = this;
    
    const strategy = await ConfigStrategy.find({ config: config._id });
    if (strategy) {
        strategy.forEach(async (s) => await s.remove());
    }
    
    await History.deleteMany({ domainId: config.domain, elementId: config._id });
    next();
})

configSchema.pre('save', async function (next) {
    const config = this;
    await config.populate({ path: 'component_list' }).execPopulate();
    await recordConfigHistory(config.toJSON(), this.modifiedPaths());
    await checkMetrics(config);
    next();
})

export const Config = mongoose.model('Config', configSchema);

export function relayOptions() {
    return {
        methods: Object.values(RelayMethods),
        types: Object.values(RelayTypes)
    };
}