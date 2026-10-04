import mongoose from 'mongoose';

const oauthClientSchema = new mongoose.Schema({
    client_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    client_name: {
        type: String,
        trim: true
    },
    redirect_uris: {
        type: [String],
        required: true
    },
    grant_types: {
        type: [String],
        default: ['authorization_code', 'refresh_token']
    },
    response_types: {
        type: [String],
        default: ['code']
    },
    token_endpoint_auth_method: {
        type: String,
        default: 'none'
    },
    scope: {
        type: String,
        default: 'config:read'
    }
}, {
    timestamps: true
});

export const OAuthClient = mongoose.model('OAuthClient', oauthClientSchema);
