import axios from 'axios';

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

        const accessToken = response.data.access_token;
        return accessToken;
    } catch (error) {
        throw new BitBucketAuthError('Failed to get BitBucket access token');
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
            avatar: response.data?.links?.avatar,
        };
   } catch (error) {
       throw new BitBucketAuthError('Failed to get BitBucket user info');
   }
}

export class BitBucketAuthError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}