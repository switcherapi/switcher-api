import { Switcher, checkValue, checkPayload, checkRegex } from 'switcher-client';
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
const certPath = process.env.SSL_CERT;
const component = 'switcherapi';

Switcher.buildContext({ url, apiKey, domain: domainName, component, environment }, { logger, certPath });

export const SwitcherKeys = Object.freeze({
    ELEMENT_CREATION: 'ELEMENT_CREATION',
    ACCOUNT_CREATION: 'ACCOUNT_CREATION',
    ACCOUNT_IN_NOTIFY: 'ACCOUNT_IN_NOTIFY',
    ACCOUNT_OUT_NOTIFY: 'ACCOUNT_OUT_NOTIFY',
    SLACK_INTEGRATION: 'SLACK_INTEGRATION',
    RATE_LIMIT: 'RATE_LIMIT',
    HTTPS_AGENT: 'HTTPS_AGENT'
});

function switcherFlagResult(flag, message) {
    if (!flag) {
        throw new FeatureUnavailableError(message);
    }
}

async function checkFeature(feature, params) {
    const switcher = Switcher.factory();
    return switcher.isItOn(feature, params, true);
}

export async function checkDomain(req) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await getTotalDomainsByOwner(req.admin._id);
    switcherFlagResult(await checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkPayload(JSON.stringify({
            feature: 'domain',
            owner: req.admin._id,
            total
        }))
    ]), 'Domain limit has been reached.');
}

export async function checkGroup(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await getTotalGroupsByDomainId(domain._id);
    switcherFlagResult(await checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkPayload(JSON.stringify({
            feature: 'group',
            owner: domain.owner,
            total
        }))
    ]), 'Group limit has been reached.');
}

export async function checkSwitcher(group) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await getTotalConfigsByDomainId(group.domain);
    const { owner } = await getDomainById(group.domain);
    switcherFlagResult(await checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkPayload(JSON.stringify({
            feature: 'switcher',
            owner,
            total
        }))
    ]), 'Switcher limit has been reached.');
}

export async function checkComponent(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await getTotalComponentsByDomainId(domain);
    const { owner } = await getDomainById(domain);
    switcherFlagResult(await checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkPayload(JSON.stringify({
            feature: 'component',
            owner,
            total
        }))
    ]), 'Component limit has been reached.');
}

export async function checkEnvironment(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await getTotalEnvByDomainId(domain);
    const { owner } = await getDomainById(domain);
    switcherFlagResult(await checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkPayload(JSON.stringify({
            feature: 'environment',
            owner,
            total
        }))
    ]), 'Environment limit has been reached.');
}

export async function checkTeam(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await getTotalTeamsByDomainId(domain);
    const { owner } = await getDomainById(domain);
    switcherFlagResult(await checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkPayload(JSON.stringify({
            feature: 'team',
            owner,
            total
        }))
    ]), 'Team limit has been reached.');
}

export async function checkMetrics(config) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return true;

    const { owner } = await getDomainById(config.domain);
    const flag = await checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkPayload(JSON.stringify({
            feature: 'metrics',
            owner
        }))
    ]);

    if (!flag) {
        if (!config.disable_metrics) {
            config.disable_metrics = new Map();
            config.disable_metrics.set(EnvType.DEFAULT, true);
        }

        config.activated.forEach((value, key) => {
            config.disable_metrics.set(key, true);
        });
    }
}

export async function checkHistory(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return true;

    const { owner } = await getDomainById(domain);
    return checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkPayload(JSON.stringify({
            feature: 'history',
            owner
        }))
    ]);
}

export async function checkAdmin(login) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    switcherFlagResult(
        await checkFeature(SwitcherKeys.ACCOUNT_CREATION, [
            checkValue(login)
        ]), 'Account not released to use the API.');
}

export async function checkSlackIntegration(value) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    switcherFlagResult(
            await checkFeature(SwitcherKeys.SLACK_INTEGRATION, [
                checkValue(value)
            ]), 'Slack Integration is not available.');
}

export function notifyAcCreation(adminid) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const switcher = Switcher.factory();
    switcher.isItOn(SwitcherKeys.ACCOUNT_IN_NOTIFY, [
        checkValue(adminid)]);
}

export function notifyAcDeletion(adminid) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const switcher = Switcher.factory();
    switcher.isItOn(SwitcherKeys.ACCOUNT_OUT_NOTIFY, [
        checkValue(adminid)]);
}

export async function getRateLimit(key, component) {
    if (process.env.SWITCHER_API_ENABLE === 'true' && key !== process.env.SWITCHER_API_KEY) {
        const domain = await getDomainById(component.domain);
        const result = await checkFeature(SwitcherKeys.RATE_LIMIT, [
            checkValue(String(domain.owner))
        ]);

        if (result) {
            const log = Switcher.getLogger(SwitcherKeys.RATE_LIMIT)
                .find(log => log.input[0][1] === String(domain.owner));
            
            return JSON.parse(log.response.message).rate_limit;
        }
    }

    return parseInt(process.env.MAX_REQUEST_PER_MINUTE || DEFAULT_RATE_LIMIT);
}

export async function checkHttpsAgent(value) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    return checkFeature(SwitcherKeys.HTTPS_AGENT, [checkRegex(value)]);
}