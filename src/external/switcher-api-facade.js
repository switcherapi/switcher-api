import { Client } from 'switcher-client';
import { EnvType } from '../models/environment.js';
import { FeatureUnavailableError } from '../exceptions/index.js';
import { getDomainById, getTotalDomainsByOwner } from '../services/domain.js';
import { getTotalGroupsByDomainId } from '../services/group-config.js';
import { getTotalConfigsByDomainId } from '../services/config.js';
import { getTotalComponentsByDomainId } from '../services/component.js';
import { getTotalEnvByDomainId } from '../services/environment.js';
import { getTotalTeamsByDomainId } from '../services/team.js';
import { DEFAULT_RATE_LIMIT } from '../middleware/limiter.js';

const apiKey = process.env.SWITCHER_API_KEY;
const environment = process.env.SWITCHER_API_ENVIRONMENT;
const domainName = process.env.SWITCHER_API_DOMAIN;
const url = process.env.SWITCHER_API_URL;
const logger = process.env.SWITCHER_API_LOGGER == 'true';
const throttle = process.env.SWITCHER_API_THROTTLE;
const certPath = process.env.SSL_CERT;
const component = 'switcherapi';

Client.buildContext({ url, apiKey, domain: domainName, component, environment }, { logger, certPath });
const switcher = Client.getSwitcher();

export const SwitcherKeys = Object.freeze({
    ELEMENT_CREATION: 'ELEMENT_CREATION',
    ACCOUNT_CREATION: 'ACCOUNT_CREATION',
    ACCOUNT_IN_NOTIFY: 'ACCOUNT_IN_NOTIFY',
    ACCOUNT_OUT_NOTIFY: 'ACCOUNT_OUT_NOTIFY',
    SLACK_INTEGRATION: 'SLACK_INTEGRATION',
    GITOPS_INTEGRATION: 'GITOPS_INTEGRATION',
    GITOPS_SUBSCRIPTION: 'GITOPS_SUBSCRIPTION',
    RATE_LIMIT: 'RATE_LIMIT',
    HTTPS_AGENT: 'HTTPS_AGENT'
});

function switcherFlagResult(response, message) {
    if (!response.result) {
        throw new FeatureUnavailableError(message);
    }
}

function switcherSettings() {
    if (throttle) {
        switcher.throttle(throttle);
    }

    return switcher.detail();
}

export async function checkDomain(req) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const total = await getTotalDomainsByOwner(req.admin._id);
    const featureFlag = await switcherSettings()
        .checkPayload(JSON.stringify({
            feature: 'domain',
            owner: req.admin._id,
            total
        })).isItOn(SwitcherKeys.ELEMENT_CREATION);

    switcherFlagResult(featureFlag, 'Domain limit has been reached.');
}

export async function checkGroup(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const total = await getTotalGroupsByDomainId(domain._id);
    const featureFlag = await switcherSettings()
        .checkPayload(JSON.stringify({
            feature: 'group',
            owner: domain.owner,
            total
        })).isItOn(SwitcherKeys.ELEMENT_CREATION);

    switcherFlagResult(featureFlag, 'Group limit has been reached.');
}

export async function checkSwitcher(group) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const total = await getTotalConfigsByDomainId(group.domain);
    const { owner } = await getDomainById(group.domain);
    const featureFlag = await switcherSettings()
        .checkPayload(JSON.stringify({
            feature: 'switcher',
            owner,
            total
        })).isItOn(SwitcherKeys.ELEMENT_CREATION);

    switcherFlagResult(featureFlag, 'Switcher limit has been reached.');
}

export async function checkComponent(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const total = await getTotalComponentsByDomainId(domain);
    const { owner } = await getDomainById(domain);
    const featureFlag = await switcherSettings()
        .checkPayload(JSON.stringify({
            feature: 'component',
            owner,
            total
        })).isItOn(SwitcherKeys.ELEMENT_CREATION);

    switcherFlagResult(featureFlag, 'Component limit has been reached.');
}

export async function checkEnvironment(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const total = await getTotalEnvByDomainId(domain);
    const { owner } = await getDomainById(domain);
    const featureFlag = await switcherSettings()
        .checkPayload(JSON.stringify({
            feature: 'environment',
            owner,
            total
        })).isItOn(SwitcherKeys.ELEMENT_CREATION);

    switcherFlagResult(featureFlag, 'Environment limit has been reached.');
}

export async function checkTeam(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const total = await getTotalTeamsByDomainId(domain);
    const { owner } = await getDomainById(domain);
    const featureFlag = await switcherSettings()
        .checkPayload(JSON.stringify({
            feature: 'team',
            owner,
            total
        })).isItOn(SwitcherKeys.ELEMENT_CREATION);

    switcherFlagResult(featureFlag, 'Team limit has been reached.');
}

export async function checkMetrics(config) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return true;
    }

    const { owner } = await getDomainById(config.domain);
    const featureFlag = await switcherSettings()
        .checkPayload(JSON.stringify({
            feature: 'metrics',
            owner
        })).isItOn(SwitcherKeys.ELEMENT_CREATION);
    
    if (!featureFlag.result) {
        config.disable_metrics = new Map();
        config.disable_metrics.set(EnvType.DEFAULT, true);
    }
}

export async function checkHistory(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return { result: true };
    }

    const { owner } = await getDomainById(domain);
    return await switcherSettings()
        .checkPayload(JSON.stringify({
            feature: 'history',
            owner
        })).isItOn(SwitcherKeys.ELEMENT_CREATION);
}

export async function checkAdmin(login) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const featureFlag = await switcherSettings()
        .checkValue(login)
        .isItOn(SwitcherKeys.ACCOUNT_CREATION);

    switcherFlagResult(featureFlag, 'Account not released to use the API.');
}

export async function checkSlackIntegration(value) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const featureFlag = await switcherSettings()
        .checkValue(value)
        .isItOn(SwitcherKeys.SLACK_INTEGRATION);

    switcherFlagResult(featureFlag, 'Slack Integration is not available.');
}

export async function checkGitopsIntegration(value) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const featureFlag = await switcherSettings()
        .checkValue(value)
        .isItOn(SwitcherKeys.GITOPS_INTEGRATION);

    switcherFlagResult(featureFlag, 'GitOps Integration is not available.');
}

export function notifyGitopsSubscription(action) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    Client.getSwitcher(SwitcherKeys.GITOPS_SUBSCRIPTION)
        .checkValue(action)
        .isItOn();
}

export function notifyAcCreation(adminid) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    Client.getSwitcher(SwitcherKeys.ACCOUNT_IN_NOTIFY)
        .checkValue(adminid)
        .isItOn();
}

export function notifyAcDeletion(adminid) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    Client.getSwitcher(SwitcherKeys.ACCOUNT_OUT_NOTIFY)
        .checkValue(adminid)
        .isItOn();
}

export async function getRateLimit(key, component) {
    if (process.env.SWITCHER_API_ENABLE === 'true' && key !== process.env.SWITCHER_API_KEY) {
        const domain = await getDomainById(component.domain);
        const featureFlag = await switcherSettings()
            .checkValue(String(domain.owner))
            .isItOn(SwitcherKeys.RATE_LIMIT);

        if (featureFlag.result) {
            return featureFlag.metadata.rate_limit;
        }
    }

    return parseInt(process.env.MAX_REQUEST_PER_MINUTE || DEFAULT_RATE_LIMIT);
}

export async function checkHttpsAgent(value) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return { result: true };
    }

    return await switcherSettings()
        .checkRegex(value)
        .isItOn(SwitcherKeys.HTTPS_AGENT);
}