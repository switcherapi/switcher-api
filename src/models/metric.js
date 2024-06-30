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
    message: {
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
});

metricSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (_doc, ret) {
        ret.date = moment(ret.date).format('YYYY-MM-DD HH:mm:ss');
        if (!ret.id) {
            delete ret.id;
        }
        return ret;
    }
};

export const Metric = mongoose.model('Metric', metricSchema);
