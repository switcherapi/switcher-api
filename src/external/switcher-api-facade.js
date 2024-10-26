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

function getFeatureFlag(feature) {
    const switcher = Client.getSwitcher(feature);

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
    const featureFlag = await getFeatureFlag(SwitcherKeys.ELEMENT_CREATION)
        .checkPayload(JSON.stringify({
            feature: 'domain',
            owner: req.admin._id,
            total
        })).isItOn();

    switcherFlagResult(featureFlag, 'Domain limit has been reached.');
}

export async function checkGroup(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const total = await getTotalGroupsByDomainId(domain._id);
    const featureFlag = await getFeatureFlag(SwitcherKeys.ELEMENT_CREATION)
        .checkPayload(JSON.stringify({
            feature: 'group',
            owner: domain.owner,
            total
        })).isItOn();

    switcherFlagResult(featureFlag, 'Group limit has been reached.');
}

export async function checkSwitcher(group) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const total = await getTotalConfigsByDomainId(group.domain);
    const { owner } = await getDomainById(group.domain);
    const featureFlag = await getFeatureFlag(SwitcherKeys.ELEMENT_CREATION)
        .checkPayload(JSON.stringify({
            feature: 'switcher',
            owner,
            total
        })).isItOn();

    switcherFlagResult(featureFlag, 'Switcher limit has been reached.');
}

export async function checkComponent(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const total = await getTotalComponentsByDomainId(domain);
    const { owner } = await getDomainById(domain);
    const featureFlag = await getFeatureFlag(SwitcherKeys.ELEMENT_CREATION)
        .checkPayload(JSON.stringify({
            feature: 'component',
            owner,
            total
        })).isItOn();

    switcherFlagResult(featureFlag, 'Component limit has been reached.');
}

export async function checkEnvironment(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const total = await getTotalEnvByDomainId(domain);
    const { owner } = await getDomainById(domain);
    const featureFlag = await getFeatureFlag(SwitcherKeys.ELEMENT_CREATION)
        .checkPayload(JSON.stringify({
            feature: 'environment',
            owner,
            total
        })).isItOn();

    switcherFlagResult(featureFlag, 'Environment limit has been reached.');
}

export async function checkTeam(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const total = await getTotalTeamsByDomainId(domain);
    const { owner } = await getDomainById(domain);
    const featureFlag = await getFeatureFlag(SwitcherKeys.ELEMENT_CREATION)
        .checkPayload(JSON.stringify({
            feature: 'team',
            owner,
            total
        })).isItOn();

    switcherFlagResult(featureFlag, 'Team limit has been reached.');
}

export async function checkMetrics(config) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return true;
    }

    const { owner } = await getDomainById(config.domain);
    const featureFlag = await getFeatureFlag(SwitcherKeys.ELEMENT_CREATION)
        .checkPayload(JSON.stringify({
            feature: 'metrics',
            owner
        })).isItOn();
    
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
    return getFeatureFlag(SwitcherKeys.ELEMENT_CREATION)
        .checkPayload(JSON.stringify({
            feature: 'history',
            owner
        })).isItOn();
}

export async function checkAdmin(login) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const featureFlag = await getFeatureFlag(SwitcherKeys.ACCOUNT_CREATION)
        .checkValue(login)
        .isItOn();

    switcherFlagResult(featureFlag, 'Account not released to use the API.');
}

export async function checkSlackIntegration(value) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const featureFlag = await getFeatureFlag(SwitcherKeys.SLACK_INTEGRATION)
        .checkValue(value)
        .isItOn();

    switcherFlagResult(featureFlag, 'Slack Integration is not available.');
}

export async function checkGitopsIntegration(value) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    const featureFlag = await getFeatureFlag(SwitcherKeys.GITOPS_INTEGRATION)
        .checkValue(value)
        .isItOn();

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
        const featureFlag = await getFeatureFlag(SwitcherKeys.RATE_LIMIT)
            .checkValue(String(domain.owner))
            .isItOn();

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

    return getFeatureFlag(SwitcherKeys.HTTPS_AGENT)
        .checkRegex(value)
        .isItOn();
}