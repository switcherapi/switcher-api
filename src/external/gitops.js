import axios from 'axios';
import https from 'https';
import jwt from 'jsonwebtoken';

const agent = (url) => {
    const usesHttps = url.startsWith('https://');
    return new https.Agent({ rejectUnauthorized: !usesHttps });
};

const headers = (subject) => ({
    Authorization: `Bearer ${generateToken(subject)}`,
    'Content-Type': 'application/json'
});

export async function createAccount(account) {
    const url = `${process.env.SWITCHER_GITOPS_URL}/account`;
    const response = await axios.post(url, account, {
        httpsAgent: agent(url),
        headers: headers(account.domain.id)
    });

    if (response.status !== 201) {
        throw new GitOpsError(`Failed to create account [${response.status}] ${JSON.stringify(response.data)}`);
    }

    return response.data;
}

export async function updateAccount(account) {
    const url = `${process.env.SWITCHER_GITOPS_URL}/account`;
    const response = await axios.put(url, account, {
        httpsAgent: agent(url),
        headers: headers(account.domain.id)
    });

    if (response.status !== 200) {
        throw new GitOpsError(`Failed to update account [${response.status}] ${JSON.stringify(response.data)}`);
    }

    return response.data;
}

function generateToken(subject) {
    const options = {
        expiresIn: '1m'
    };

    return jwt.sign(({ 
        iss: 'Switcher API',
        subject
    }), process.env.SWITCHER_GITOPS_JWT_SECRET, options);
}

export class GitOpsError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}