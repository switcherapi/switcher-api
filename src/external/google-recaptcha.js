import axios from 'axios';

export const url = 'https://www.google.com/recaptcha/api/siteverify';

export async function validate_token(req) {
    if (req.body.token === null || req.body.token === undefined) {
        throw new GoogleRecaptchaError('Token is empty or invalid');
    }

    const response = await axios.post(
        `${url}?secret=${process.env.GOOGLE_RECAPTCHA_SECRET}&response=${req.body.token}&remoteip=${req.connection.remoteAddress}`, null,
        { 
            headers: {
                accept: 'application/json'
            }
        });
        
    if (!response.data.success) {
        throw new GoogleRecaptchaError('Failed to validate capatcha');
    }
}

export class GoogleRecaptchaError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}