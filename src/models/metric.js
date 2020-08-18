import mongoose from 'mongoose';
import moment from 'moment';

const metricSchema = new mongoose.Schema({
    config: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Config',
        index: true
    },
    component: {
        type: String
    },
    entry: [{
        strategy: String,
        input: String
    }],
    result: {
        type: Boolean,
        required: true,
    },
    reason: {
        type: String
    },
    group: {
        type: String,
        required: true
    },
    environment: {
        type: String,
        required: true
    },
    domain: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Domain',
        index: true
    },
    date: {
        type: Date,
        required: true
    }
})

metricSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret, options) {
        ret.date = moment(ret.date).format('YYYY-MM-DD HH:mm:ss');
        if (!ret.id) {
            delete ret.id;
        }
        return ret;
    }
}

export function addMetrics(context, response) {
    const metric = new Metric({
        config: context.config_id,
        component: context.component,
        entry: context.entry,
        result: response.result,
        reason: response.reason,
        group: response.group.name,
        environment: context.environment,
        domain: response.domain._id,
        date: Date.now()
    });
    metric.save();
}

export const Metric = mongoose.model('Metric', metricSchema);
