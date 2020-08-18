import mongoose from 'mongoose';
import moment from 'moment';

const historySchema = new mongoose.Schema({
    domainId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    elementId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    oldValue: {
        type: Map,
        required: true
    },
    newValue: {
        type: Map,
        required: true
    },
    updatedBy: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    }
});

historySchema.options.toJSON = {
    getters: true,
    minimize: false,
    transform: function (doc, ret, options) {
        ret.date = moment(ret.date).format('YYYY-MM-DD HH:mm:ss');
        if (!ret.id) {
            delete ret.id;
        }
        return ret;
    }
}

const History = mongoose.model(`History`, historySchema);

export default History;