import mongoose from 'mongoose';
import moment from 'moment';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Team } from './team.js';
import { notifyAcCreation, notifyAcDeletion } from '../external/switcher-api-facade.js';
import { EncryptionSalts } from './common/index.js';

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
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 5,
        trim: true
    },
    active: {
        type: Boolean,
        required: true,
        default: false
    },
    teams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    }],
    token: {
        type: String
    },
    code: {
        type: String
    },
    _gitid: {
        type: String
    },
    _bitbucketid: {
        type: String
    },
    _avatar: {
        type: String
    }
}, {
    timestamps: true
});

adminSchema.virtual('domain', {
    ref: 'Domain',
    localField: '_id',
    foreignField: 'owner'
});

adminSchema.virtual('groupConfig', {
    ref: 'GroupConfig',
    localField: '_id',
    foreignField: 'owner'
});

adminSchema.virtual('config', {
    ref: 'config',
    localField: '_id',
    foreignField: 'owner'
});

adminSchema.virtual('configStrategy', {
    ref: 'ConfigStrategy',
    localField: '_id',
    foreignField: 'owner'
});

adminSchema.virtual('team_list', {
    ref: 'Team',
    localField: 'teams',
    foreignField: '_id'
});

adminSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (_doc, ret) {
        if (ret.updatedAt || ret.createdAt) {
            ret.updatedAt = moment(ret.updatedAt).format('YYYY-MM-DD HH:mm:ss');
            ret.createdAt = moment(ret.createdAt).format('YYYY-MM-DD HH:mm:ss');
        }

        if (ret.team_list) {
            ret.teams = ret.team_list;
            delete ret.team_list;
        }

        delete ret.password;
        delete ret.token;
        delete ret.code;
        return ret;
    }
};

adminSchema.methods.generateAuthToken = async function () {
    const admin = this;

    const options = {
        expiresIn: process.env.JWT_ADMIN_TOKEN_RENEW_INTERVAL,
        issuer: 'switcher-api'
    };

    const token = jwt.sign(({ _id: admin.id.toString(), issued: Date.now() }), process.env.JWT_SECRET, options);
    const refreshToken = jwt.sign(({ 
        subject: Admin.extractTokenPart(token)
    }), process.env.JWT_SECRET);

    admin.code = null;
    admin.active = true;
    admin.token = Admin.extractTokenPart(token);
    await admin.save();
    
    return {
        token,
        refreshToken
    };
};

adminSchema.methods.generateAuthCode = async function () {
    const admin = this;
    admin.code = Math.random().toString(36).slice(-8);
    return admin.code;
};

adminSchema.statics.findByCredentials = async (email, password) => {
    const admin = await Admin.findOne({ email, active: true }).exec();

    if (!admin) {
        throw new Error('Unable to login');
    }

    const isMatch = await bcryptjs.compare(password, admin.password);

    if (!isMatch) {
        throw new Error('Unable to login');
    }

    return admin;
};

adminSchema.statics.findUserByAuthCode = async (code, active) => {
    return Admin.findOne({ code, active });
};

adminSchema.statics.findUserByGitId = async (_gitid) => {
    return Admin.findOne({ _gitid });
};

adminSchema.statics.findUserByBitBucketId = async (_bitbucketid) => {
    return Admin.findOne({ _bitbucketid });
};

adminSchema.statics.createThirdPartyAccount = async (
    admin, userInfo, platform, attributeIdName, checkAdmin) => {

    if (!admin) {
        await checkAdmin(`@${platform}_${userInfo.id}`);

        const hash = crypto.createHmac('sha256', process.env.JWT_SECRET)
                   .update(`${Date.now()}`)
                   .digest('hex');
                   
        admin = new Admin({
            name: userInfo.name,
            email: userInfo.email,
            [`${attributeIdName}`]: userInfo.id,
            _avatar: userInfo.avatar,
            password: hash
        });

        await admin.save();
    }
    
    admin.name = userInfo.name;
    admin._avatar = userInfo.avatar;
    return admin;
};

adminSchema.statics.extractTokenPart = (token) => {
    return token.substring(token.length - 8, token.length);
};

adminSchema.pre('save', async function (next) {
    const admin = this;

    if (admin.isModified('password')) {
        admin.password = await bcryptjs.hash(admin.password, EncryptionSalts.ADMIN);
        notifyAcCreation(admin._id);
    }
    
    next();
});

adminSchema.post('save', function(error, _doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000)
        return next(new Error('Account is already registered.'));
    
    next(error);
});

adminSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    const admin = this;
    const teams = await Team.find({ members: admin._id }).exec();
    for (const team of teams) {
        let indexMmeber = team.members.indexOf(admin._id);
        team.members.splice(indexMmeber, 1);
        await team.save();
    }

    notifyAcDeletion(admin._id);
    next();
});

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;