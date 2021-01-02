import mongoose from 'mongoose';
import moment from 'moment';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Domain from './domain';
import { Team } from './team';
import { notifyAcCreation, notifyAcDeletion } from '../external/switcher-api-facade';

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
    transform: function (doc, ret) {
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
        expiresIn: process.env.JWT_ADMIN_TOKEN_RENEW_INTERVAL
    };

    const token = jwt.sign(({ _id: admin.id.toString() }), process.env.JWT_SECRET, options);
    const refreshToken = await bcrypt.hash(token.split('.')[2], 8);

    admin.code = null;
    admin.active = true;
    admin.token = refreshToken;
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
    const admin = await Admin.findOne({ email, active: true });

    if (!admin) {
        throw new Error('Unable to login');
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
        throw new Error('Unable to login');
    }

    return admin;
};

adminSchema.statics.findUserByAuthCode = async (code, active) => {
    const admin = await Admin.findOne({ code, active });
    return admin;
};

adminSchema.statics.findUserByGitId = async (_gitid) => {
    const admin = await Admin.findOne({ _gitid });
    return admin;
};

adminSchema.statics.findUserByBitBucketId = async (_bitbucketid) => {
    const admin = await Admin.findOne({ _bitbucketid });
    return admin;
};

adminSchema.statics.createThirdPartyAccount = async (
    admin, userInfo, platform, attributeIdName, checkAdmin) => {

    if (!admin) {
        await checkAdmin(`@${platform}_${userInfo.id}`);
        admin = new Admin({
            name: userInfo.name,
            email: userInfo.email,
            [`${attributeIdName}`]: userInfo.id,
            _avatar: userInfo.avatar,
            password: Math.random().toString(36).slice(-8)
        });
        await admin.save();
    } else {
        admin._avatar = userInfo.avatar;
    }

    return admin;
};

adminSchema.pre('save', async function (next) {
    const admin = this;

    if (admin.isModified('password')) {
        admin.password = await bcrypt.hash(admin.password, 8);
        notifyAcCreation(admin._id);
    }
    
    next();
});

adminSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoError' && error.code === 11000) {
        return next(new Error('Account is already registered.'));
    }
    
    next(error);
});

adminSchema.pre('remove', async function (next) {
    var ObjectId = (require('mongoose').Types.ObjectId);

    const admin = this;
    const domains = await Domain.find({ owner: new ObjectId(admin._id) });

    if (domains) {
        domains.forEach(async (domain) => await domain.remove());
    }

    const teams = await Team.find({ members: admin._id });
    for (let i = 0; i < teams.length; i++) {
        let indexMmeber = teams[i].members.indexOf(admin._id);
        teams[i].members.splice(indexMmeber, 1);
        await teams[i].save();
    }

    notifyAcDeletion(admin._id);
    next();
});

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;