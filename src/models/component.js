import mongoose from 'mongoose';
import moment from 'moment';

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
    }
}, {
    timestamps: true
})

componentSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret, options) {
        if (ret.updatedAt || ret.createdAt) {
            ret.updatedAt = moment(ret.updatedAt).format('YYYY-MM-DD HH:mm:ss')
            ret.createdAt = moment(ret.createdAt).format('YYYY-MM-DD HH:mm:ss')
        }
        return ret
    }
}

const existComponent = async (component) => {
    if (component.__v === undefined) {
        const foundComponent = await Component.find({ name: component.name })
        return foundComponent.length > 0
    }
    return false
}

componentSchema.pre('validate', async function (next) {
    const component = this

    // Verify if component already exist
    if (await existComponent(component)) {
        const err = new Error(`Unable to complete the operation. Component '${component.name}' already exist for this Domain`)
        next(err);
    }

    next()
})

const Component = mongoose.model('Component', componentSchema)

export default Component;