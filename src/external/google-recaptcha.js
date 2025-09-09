import axios from 'axios';

export const url = 'https://www.google.com/recaptcha/api/siteverify';

export async function validate_token(token, remoteAddress) {
    if (!process.env.GOOGLE_RECAPTCHA_SECRET || process.env.GOOGLE_SKIP_AUTH == 'true') {
        return;
    }

    if (token === null || token === undefined) {
        throw new GoogleRecaptchaError('Token is empty or invalid');
    }

    const response = await axios.post(
        `${url}?secret=${process.env.GOOGLE_RECAPTCHA_SECRET}&response=${token}&remoteip=${remoteAddress}`, null,
        { 
            headers: {
                accept: 'application/json'
            }
        });
        
    if (!response.data.success || response.data.score < 0.8) {
        throw new GoogleRecaptchaError('Failed to validate recaptcha');
    }
}

export class GoogleRecaptchaError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}