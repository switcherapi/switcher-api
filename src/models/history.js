import mongoose from 'mongoose';
import moment from 'moment';

const historySchema = new mongoose.Schema({
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
})

historySchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret, options) {
        ret.date = moment(ret.date).format('YYYY-MM-DD HH:mm:ss')
        if (!ret.id) {
            delete ret.id
        }
        return ret
    }
}


const HistorySchema = mongoose.model('History', historySchema)

module.exports = HistorySchema