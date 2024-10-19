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
        throw new GitOpsError(`Failed to create account [${response.status}] ${JSON.stringify(response.data)}`, 
            response.status);
    }

    return response.data;
}

export async function updateAccount(account) {
    try {
        const url = `${process.env.SWITCHER_GITOPS_URL}/account`;
        const response = await axios.put(url, account, {
            httpsAgent: agent(url),
            headers: headers(account.domain.id)
        });

        if (response.status !== 200) {
            throw new GitOpsError(`Failed to update account [${response.status}] ${JSON.stringify(response.data)}`, 
                response.status);
        }

        return response.data;
    } catch (e) {
        throw new GitOpsError(`Failed to update account: ${e.message}`, e.status);
    }
}

export async function updateAccountTokens(update, domainId) {
    try {
        const url = `${process.env.SWITCHER_GITOPS_URL}/account/tokens/${domainId}`;
        const response = await axios.put(url, update, {
            httpsAgent: agent(url),
            headers: headers(domainId)
        });

        if (response.status !== 200) {
            throw new GitOpsError(`Failed to update accounts [${response.status}] ${JSON.stringify(response.data)}`, 
                response.status);
        }

        return response.data;
    } catch (e) {
        throw new GitOpsError(`Failed to update account: ${e.message}`, e.status);
    }
}

export async function deleteAccount(domainId, environment) {
    try {
        const url = `${process.env.SWITCHER_GITOPS_URL}/account/${domainId}/${environment}`;
        const response = await axios.delete(url, {
            httpsAgent: agent(url),
            headers: headers(domainId)
        });

        if (response.status !== 204) {
            throw new GitOpsError(`Failed to delete account [${response.status}] ${JSON.stringify(response.data)}`, 
                response.status);
        }
    } catch (e) {
        throw new GitOpsError(`Failed to delete account: ${e.message}`, e.status);
    }
}

export async function fetchAccounts(domainId, environment) {
    try {
        const url = environment ? 
            `${process.env.SWITCHER_GITOPS_URL}/account/${domainId}/${environment}` : 
            `${process.env.SWITCHER_GITOPS_URL}/account/${domainId}`;
            
        const response = await axios.get(url, {
            httpsAgent: agent(url),
            headers: headers(domainId)
        });

        if (response.status !== 200) {
            throw new GitOpsError(`Failed to fetch accounts [${response.status}] ${JSON.stringify(response.data)}`, 
                response.status);
        }

        return response.data;
    } catch (e) {
        throw new GitOpsError(`Failed to fetch accounts: ${e.message}`, e.status);
    }
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
    constructor(message, code = 500) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}