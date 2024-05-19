import axios from 'axios';
import Logger from '../helpers/logger.js';

export const bitBucketAccessTokenUrl = 'https://bitbucket.org/site/oauth2/access_token';
export const bitBucketAPIUserUrl = 'https://api.bitbucket.org/2.0/user';

export async function getBitBucketToken(code) {
    try {
        let digested = Buffer.from(`${process.env.BITBUCKET_OAUTH_CLIENT_ID}:${process.env.BITBUCKET_OAUTH_SECRET}`).toString('base64');
        
        var bodyFormData = new URLSearchParams();
        bodyFormData.set('grant_type', 'authorization_code');
        bodyFormData.set('code', code);
        const response = await axios.post(bitBucketAccessTokenUrl, bodyFormData,
            { 
                headers: {
                    'Cache-Control': 'no-cache',
                    Authorization: `Basic ${digested}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    accept: 'application/json'
                }
            });
            
        return response.data.access_token;
    } catch (error) {
        Logger.debug('getBitBucketToken', error);
        throw new BitBucketAuthError('Failed to get Bitbucket access token');
    }
}

export async function getBitBucketUserInfo(token) {
    try {
        const response = await axios.get(bitBucketAPIUserUrl,
            { 
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        
        return {
            id: response.data.account_id,
            name: response.data.display_name || response.data.nickname,
            email: `${response.data.account_id}+${response.data.username}@admin.noreply.switcherapi.com`,
            avatar: response.data?.links?.avatar?.href
        };
   } catch (error) {
        Logger.debug('getBitBucketUserInfo', error);
        throw new BitBucketAuthError('Failed to get Bitbucket user info');
   }
}

export class BitBucketAuthError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}