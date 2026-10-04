import mongoose from 'mongoose';
import moment from 'moment';

const oauthTokenSchema = new mongoose.Schema({
    access_token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    refresh_token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    client_id: {
        type: String,
        required: true,
        index: true
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Admin'
    },
    scope: {
        type: String,
        default: 'config:read'
    },
    accessTokenExpiresAt: {
        type: Date,
        required: true
    },
    refreshTokenExpiresAt: {
        type: Date,
        required: true
    },
    revoked: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

oauthTokenSchema.index({ refreshTokenExpiresAt: 1 }, { expireAfterSeconds: 0 });

oauthTokenSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (_doc, ret) {
        if (ret.updatedAt || ret.createdAt) {
            ret.updatedAt = moment(ret.updatedAt).format('YYYY-MM-DD HH:mm:ss');
            ret.createdAt = moment(ret.createdAt).format('YYYY-MM-DD HH:mm:ss');
        }

        delete ret.access_token;
        delete ret.refresh_token;

        return ret;
    }
};

export const OAuthToken = mongoose.model('OAuthToken', oauthTokenSchema);
