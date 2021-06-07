import { Switcher, checkNumeric, checkValue } from 'switcher-client';
import { EnvType } from '../models/environment';
import { BadRequestError, FeatureUnavailableError } from '../exceptions';
import { getDomainById, getTotalDomainsByOwner } from '../controller/domain';
import { getTotalGroupsByDomainId } from '../controller/group-config';
import { getTotalConfigsByDomainId } from '../controller/config';
import { getTotalComponentsByDomainId } from '../controller/component';
import { getTotalEnvByDomainId } from '../controller/environment';
import { getTotalTeamsByDomainId } from '../controller/team';

const apiKey = process.env.SWITCHER_API_KEY;
const environment = process.env.SWITCHER_API_ENVIRONMENT;
const domainName = process.env.SWITCHER_API_DOMAIN;
const url = process.env.SWITCHER_API_URL;
const logger = process.env.SWITCHER_API_LOGGER == 'true';
const component = 'switcherapi';

Switcher.buildContext({ url, apiKey, domain: domainName, component, environment }, { logger });
const switcher = Switcher.factory();

export const SwitcherKeys = Object.freeze({
    ELEMENT_CREATION: 'ELEMENT_CREATION',
    ACCOUNT_CREATION: 'ACCOUNT_CREATION',
    ACCOUNT_IN_NOTIFY: 'ACCOUNT_IN_NOTIFY',
    ACCOUNT_OUT_NOTIFY: 'ACCOUNT_OUT_NOTIFY',
    SLACK_INTEGRATION: 'SLACK_INTEGRATION',
    SLACK_UPDATE: 'SLACK_UPDATE'
});

function switcherFlagResult(flag, message) {
    if (!flag) {
        throw new FeatureUnavailableError(message);
    }
}

export async function checkFeature(feature, params, restrictTo = SwitcherKeys) {
    const key = Object.values(restrictTo).find(element => element === feature);
    if (!key)
        throw new BadRequestError('Invalid feature');
    
    return switcher.isItOn(feature, params);
}

export async function checkDomain(req) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await getTotalDomainsByOwner(req.admin._id);
    switcherFlagResult(await checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkValue(`domain#${req.admin._id}`),
        checkNumeric(total)
    ]), 'Domain limit has been reached.');
}

export async function checkGroup(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await getTotalGroupsByDomainId(domain._id);
    switcherFlagResult(await checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkValue(`group#${domain.owner}`),
        checkNumeric(total)
    ]), 'Group limit has been reached.');
}

export async function checkSwitcher(group) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await getTotalConfigsByDomainId(group.domain);
    const { owner } = await getDomainById(group.domain);
    switcherFlagResult(await checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkValue(`switcher#${owner}`),
        checkNumeric(total)
    ]), 'Switcher limit has been reached.');
}

export async function checkComponent(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await getTotalComponentsByDomainId(domain);
    const { owner } = await getDomainById(domain);
    switcherFlagResult(await checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkValue(`component#${owner}`),
        checkNumeric(total)
    ]), 'Component limit has been reached.');
}

export async function checkEnvironment(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await getTotalEnvByDomainId(domain);
    const { owner } = await getDomainById(domain);
    switcherFlagResult(await checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkValue(`environment#${owner}`),
        checkNumeric(total)
    ]), 'Environment limit has been reached.');
}

export async function checkTeam(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await getTotalTeamsByDomainId(domain);
    const { owner } = await getDomainById(domain);
    switcherFlagResult(await checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkValue(`team#${owner}`),
        checkNumeric(total)
    ]), 'Team limit has been reached.');
}

export async function checkMetrics(config) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return true;

    const { owner } = await getDomainById(config.domain);
    const flag = await checkFeature(SwitcherKeys.ELEMENT_CREATION, [
        checkValue(`metrics#${owner}`)
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
        checkValue(`history#${owner}`)
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

    switcher.isItOn(SwitcherKeys.ACCOUNT_IN_NOTIFY, [
        checkValue(adminid)]);
}

export function notifyAcDeletion(adminid) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    switcher.isItOn(SwitcherKeys.ACCOUNT_OUT_NOTIFY, [
        checkValue(adminid)]);
}