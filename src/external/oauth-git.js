import axios from 'axios';

export const githubAccessTokenUrl = 'https://github.com/login/oauth/access_token';
export const githubAPIUserUrl = 'https://api.github.com/user';

export async function getToken(code) {
    try {
        const response = await axios.post(
            `${githubAccessTokenUrl}?client_id=${process.env.GIT_OAUTH_CLIENT_ID}&client_secret=${process.env.GIT_OAUTH_SECRET}&code=${code}`, null,
            { 
                headers: {
                    accept: 'application/json'
                }
            });
        
        const accessToken = response.data.access_token;
        return accessToken;
    } catch (error) {
        throw new GitAuthError('Failed to get GitHub access token');
    }
}

export async function getUserInfo(token) {
    try {
        const response = await axios.get(githubAPIUserUrl,
            { 
                headers: {
                    Authorization: `token ${token}`
                }
            });
        
        return {
            id: response.data.id,
            name: response.data.name || response.data.login,
            email: response.data.email || `${response.data.id}+${response.data.login}@admin.noreply.switcherapi.com`
        };
   } catch (error) {
       throw new GitAuthError('Failed to get GitHub user info');
   }
}

export class GitAuthError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}