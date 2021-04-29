import { Switcher, checkNumeric, checkValue } from 'switcher-client';
import Domain from '../models/domain';
import GroupConfig from '../models/group-config';
import { Config } from '../models/config';
import Component from '../models/component';
import { Environment, EnvType } from '../models/environment';
import { Team } from '../models/team';
import { FeatureUnavailableError } from '../exceptions';

const apiKey = process.env.SWITCHER_API_KEY;
const environment = process.env.SWITCHER_API_ENVIRONMENT;
const domainName = process.env.SWITCHER_API_DOMAIN;
const url = process.env.SWITCHER_API_URL;
const component = 'switcherapi';

Switcher.buildContext({ url, apiKey, domain: domainName, component, environment });
const switcher = Switcher.factory();

function switcherFlagResult(flag, message) {
    if (!flag) {
        throw new FeatureUnavailableError(message);
    }
}

export async function checkDomain(req) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await Domain.find({ owner: req.admin._id }).countDocuments();
    switcherFlagResult(await switcher.isItOn('ELEMENT_CREATION', [
        checkValue(`domain#${req.admin._id}`),
        checkNumeric(total)]), 'Domain limit has been reached.');
}

export async function checkGroup(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await GroupConfig.find({ domain: domain._id }).countDocuments();
    switcherFlagResult(await switcher.isItOn('ELEMENT_CREATION', [
        checkValue(`group#${domain.owner}`),
        checkNumeric(total)]), 'Group limit has been reached.');
}

export async function checkSwitcher(group) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await Config.find({ domain: group.domain }).countDocuments();
    const { owner } = await Domain.findById(group.domain).lean();
    switcherFlagResult(await switcher.isItOn('ELEMENT_CREATION', [
        checkValue(`switcher#${owner}`),
        checkNumeric(total)]), 'Switcher limit has been reached.');
}

export async function checkComponent(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await Component.find({ domain }).countDocuments();
    const { owner } = await Domain.findById(domain).lean();
    switcherFlagResult(await switcher.isItOn('ELEMENT_CREATION', [
        checkValue(`component#${owner}`),
        checkNumeric(total)]), 'Component limit has been reached.');
}

export async function checkEnvironment(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await Environment.find({ domain }).countDocuments();
    const { owner } = await Domain.findById(domain).lean();
    switcherFlagResult(await switcher.isItOn('ELEMENT_CREATION', [
        checkValue(`environment#${owner}`),
        checkNumeric(total)]), 'Environment limit has been reached.');
}

export async function checkTeam(domain) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    const total = await Team.find({ domain }).countDocuments();
    const { owner } = await Domain.findById(domain).lean();
    switcherFlagResult(await switcher.isItOn('ELEMENT_CREATION', [
        checkValue(`team#${owner}`),
        checkNumeric(total)]), 'Team limit has been reached.');
}

export async function checkMetrics(config) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return true;

    const { owner } = await Domain.findById(config.domain).lean();
    if (!await switcher.isItOn('ELEMENT_CREATION', [
        checkValue(`metrics#${owner}`)])) {

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

    const { owner } = await Domain.findById(domain).lean();
    return switcher.isItOn('ELEMENT_CREATION', [
        checkValue(`history#${owner}`)]);
}

export async function checkAdmin(login) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    switcherFlagResult(await switcher.isItOn('ACCOUNT_CREATION', [
        checkValue(login)]), 'Account not released to use the API.');
}

export function notifyAcCreation(adminid) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    switcher.isItOn('ACCOUNT_IN_NOTIFY', [
        checkValue(adminid)]);
}

export function notifyAcDeletion(adminid) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    switcher.isItOn('ACCOUNT_OUT_NOTIFY', [
        checkValue(adminid)]);
}