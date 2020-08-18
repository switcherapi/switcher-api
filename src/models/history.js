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

const History = mongoose.model(`History`, historySchema);

export default History;