import mongoose from 'mongoose';
import moment from 'moment';

const metricSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true
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
    domain: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Domain'
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
        if (ret.date) {
            ret.date = moment(ret.date).format('YYYY-MM-DD HH:mm:ss')
        }
        if (!ret.id) {
            delete ret.id
        }
        return ret
    }
}

export function addMetrics(context, result) {
    const metric = new Metric({
        key: context.key,
        component: context.component,
        entry: context.entry,
        result: result.return,
        reason: result.reason,
        group: result.group.name,
        domain: result.domain._id,
        date: Date.now()
    })
    metric.save()
}

export const Metric = mongoose.model('Metric', metricSchema)
