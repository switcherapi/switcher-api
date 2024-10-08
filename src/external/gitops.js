import axios from 'axios';

export async function createAccount(account) {
    const url = `${process.env.SWITCHER_GITOPS_URL}/account`;
    const response = await axios.post(url, account);

    if (response.status !== 201) {
        throw new GitOpsError(`Failed to create account [${response.status}] ${JSON.stringify(response.data)}`);
    }

    return response.data;
}

export class GitOpsError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}