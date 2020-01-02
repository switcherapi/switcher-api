import mongoose from 'mongoose';
import moment from 'moment';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Domain from './domain';

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 7,
        trim: true
    },
    active: {
        type: Boolean,
        required: true,
        default: true
    },
    teams: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    token: {
        type: String
    },
}, {
    timestamps: true
})

adminSchema.virtual('domain', {
    ref: 'Domain',
    localField: '_id',
    foreignField: 'owner'
})

adminSchema.virtual('groupConfig', {
    ref: 'GroupConfig',
    localField: '_id',
    foreignField: 'owner'
})

adminSchema.virtual('config', {
    ref: 'config',
    localField: '_id',
    foreignField: 'owner'
})

adminSchema.virtual('configStrategy', {
    ref: 'ConfigStrategy',
    localField: '_id',
    foreignField: 'owner'
})

adminSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret, options) {
        if (ret.updatedAt || ret.createdAt) {
            ret.updatedAt = moment(ret.updatedAt).format('YYYY-MM-DD HH:mm:ss')
            ret.createdAt = moment(ret.createdAt).format('YYYY-MM-DD HH:mm:ss')
        }
        delete ret.password
        delete ret.token
        return ret
    }
}

adminSchema.methods.generateAuthToken = async function () {
    const admin = this

    const options = {
        expiresIn: process.env.JWT_ADMIN_TOKEN_RENEW_INTERVAL
    };

    const token = jwt.sign(({ _id: admin.id.toString() }), process.env.JWT_SECRET, options)
    const refreshToken = await bcrypt.hash(token.split('.')[2], 8)

    admin.token = refreshToken;
    await admin.save()

    return {
        token,
        refreshToken
    }
}

adminSchema.statics.findByCredentials = async (email, password) => {
    const admin = await Admin.findOne({ email })

    if (!admin) {
        throw new Error('Unable to login')
    }

    const isMatch = await bcrypt.compare(password, admin.password)

    if (!isMatch) {
        throw new Error('Unable to login')
    }

    return admin
}

adminSchema.pre('save', async function (next) {
    const admin = this

    if (admin.isModified('password')) {
        admin.password = await bcrypt.hash(admin.password, 8)
    }

    next()
})

adminSchema.pre('remove', async function (next) {
    var ObjectId = (require('mongoose').Types.ObjectId);

    const admin = this
    const domain = await Domain.find({ owner: new ObjectId(admin._id) })

    if (domain) {
        domain.forEach(async (d) => await d.remove())
    }

    next()
})

const Admin = mongoose.model('Admin', adminSchema)

export default Admin;