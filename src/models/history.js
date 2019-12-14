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
    }
})

historySchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret, options) {
        ret.oldValue.updatedAt = moment(ret.oldValue.updatedAt).format('YYYY-MM-DD HH:mm:ss')
        ret.newValue.updatedAt = moment(ret.newValue.updatedAt).format('YYYY-MM-DD HH:mm:ss')
        ret.date = moment(ret.newValue.updatedAt).format('YYYY-MM-DD HH:mm:ss')
        if (!ret.id) {
            delete ret.id
        }
        return ret
    }
}


const HistorySchema = mongoose.model('History', historySchema)

module.exports = HistorySchema