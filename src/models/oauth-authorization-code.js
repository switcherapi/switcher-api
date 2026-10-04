import mongoose from 'mongoose';

const oauthAuthorizationCodeSchema = new mongoose.Schema({
    code: {
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
    redirect_uri: {
        type: String,
        required: true
    },
    scope: {
        type: String,
        default: 'config:read'
    },
    code_challenge: {
        type: String,
        required: true
    },
    code_challenge_method: {
        type: String,
        enum: ['S256'],
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    used: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

oauthAuthorizationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OAuthAuthorizationCode = mongoose.model('OAuthAuthorizationCode', oauthAuthorizationCodeSchema);
