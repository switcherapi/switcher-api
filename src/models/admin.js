import mongoose from 'mongoose';
import moment from 'moment';
import bcryptjs from 'bcryptjs';
import crypto from 'node:crypto';
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
        default: true
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
    auth_provider: {
        type: String,
        enum: ['email', 'github', 'bitbucket', 'saml'],
        default: 'email'
    },
    _gitid: {
        type: String,
        unique: true,
        sparse: true
    },
    _bitbucketid: {
        type: String,
        unique: true,
        sparse: true
    },
    _samlid: {
        type: String,
        unique: true,
        sparse: true
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
    const options = {
        expiresIn: process.env.JWT_ADMIN_TOKEN_RENEW_INTERVAL,
        issuer: 'switcher-api'
    };

    const token = jwt.sign(({ _id: this.id.toString(), issued: Date.now() }), process.env.JWT_SECRET, options);
    const refreshToken = jwt.sign(({ 
        subject: Admin.extractTokenPart(token)
    }), process.env.JWT_SECRET);

    this.code = null;
    this.active = true;
    this.token = Admin.extractTokenPart(token);
    await this.save();
    
    return {
        token,
        refreshToken
    };
};

adminSchema.methods.generateAuthCode = async function () {
    this.code = Math.random().toString(36).slice(-8);
    return this.code;
};

adminSchema.statics.findByCredentials = async (email, password) => {
    const admin = await Admin.findOneBy({ email, active: true });

    if (!admin) {
        throw new Error('Unable to login - account not found or not active.');
    }

    const isMatch = await bcryptjs.compare(password, admin.password);

    if (!isMatch) {
        throw new Error('Unable to login - invalid credentials.');
    }

    return admin;
};

adminSchema.statics.findOneBy = async (criteria) => {
    for (const key in criteria) {
        if (criteria[key] === undefined) {
            return null;
        }
    }
    
    return Admin.findOne(criteria).exec();
};

adminSchema.statics.findUserByAuthCode = async (code, active) => {
    return Admin.findOneBy({ code, active });
};

adminSchema.statics.findUserByGitId = async (_gitid) => {
    return Admin.findOneBy({ _gitid });
};

adminSchema.statics.findUserByBitBucketId = async (_bitbucketid) => {
    return Admin.findOneBy({ _bitbucketid });
};

adminSchema.statics.findUserBySamlId = async (_samlid) => {
    return Admin.findOneBy({ _samlid });
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
            auth_provider: platform,
            [`${attributeIdName}`]: userInfo.id,
            _avatar: userInfo.avatar,
            password: hash
        });

        await admin.save();
    }
    
    admin._avatar = userInfo.avatar;
    return admin;
};

adminSchema.statics.extractTokenPart = (token) => {
    return token.substring(token.length - 8, token.length);
};

adminSchema.pre('save', async function () {
    if (this.isModified('password')) {
        this.password = await bcryptjs.hash(this.password, EncryptionSalts.ADMIN);
        notifyAcCreation(this._id);
    }
});

adminSchema.pre('deleteOne', { document: true, query: false }, async function () {
    const teams = await Team.find({ members: this._id }).exec();
    for (const team of teams) {
        let indexMmeber = team.members.indexOf(this._id);
        team.members.splice(indexMmeber, 1);
        await team.save();
    }

    notifyAcDeletion(this._id);
});

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;