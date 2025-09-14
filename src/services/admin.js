import { BadRequestError, NotFoundError } from '../exceptions/index.js';
import { validate_token } from '../external/google-recaptcha.js';
import { getBitBucketToken, getBitBucketUserInfo } from '../external/oauth-bitbucket.js';
import { getGitToken, getGitUserInfo } from '../external/oauth-git.js';
import { checkAdmin } from '../external/switcher-api-facade.js';
import Admin from '../models/admin.js';
import Domain from '../models/domain.js';
import { response } from './common.js';
import { getTeams } from './team.js';

export async function getAdminById(id) {
    let admin = await Admin.findById(id).exec();
    return response(admin, 'Admin not found');
}

export async function getAdmin(where) {
    const query = Admin.findOne();

    if (where._id) query.where('_id', where._id);
    if (where.email) query.where('email', where.email);
    if (where.token) query.where('token', where.token);

    return query.exec();
}

export async function signUp(args, remoteAddress) {
    await checkAdmin(args.email);
    await validate_token(args.token, remoteAddress);

    const admin = new Admin(args);
    return admin.save();
}

export async function signUpGitHub(code) {
    const token = await getGitToken(code);
    const userInfo = await getGitUserInfo(token);

    let admin = await Admin.findUserByGitId(userInfo.id);
    admin = await Admin.createThirdPartyAccount(
        admin, userInfo, 'github', '_gitid', checkAdmin);

    const jwt = await admin.generateAuthToken();
    return { admin, jwt };
}

export async function signUpBitbucket(code) {
    const token = await getBitBucketToken(code);
    const userInfo = await getBitBucketUserInfo(token);

    let admin = await Admin.findUserByBitBucketId(userInfo.id);
    admin = await Admin.createThirdPartyAccount(
        admin, userInfo, 'bitbucket', '_bitbucketid', checkAdmin);

    const jwt = await admin.generateAuthToken();
    return { admin, jwt };
}

export async function signUpSaml(userInfo) {
    let admin = await Admin.findUserBySamlId(userInfo.id);
    admin = await Admin.createThirdPartyAccount(
        admin, userInfo, 'saml', '_samlid', checkAdmin);
    const jwt = await admin.generateAuthToken();
    return { admin, jwt };
}

export async function signIn(email, password) {
    const admin = await Admin.findByCredentials(email, password);
    const jwt = await admin.generateAuthToken();
    return { admin, jwt };
}

export async function loginRequestRecovery(email) {
    const admin = await getAdmin({ email });
    if (admin) {
        await admin.generateAuthCode();
        admin.save();
    }
}

export async function loginRecovery(args, remoteAddress) {
    await validate_token(args.token, remoteAddress);
    let admin = await Admin.findUserByAuthCode(args.code, true);

    if (!admin) {
        throw new NotFoundError('Account not found');
    }

    admin.code = null;
    admin.password = args.password;
    const jwt = await admin.generateAuthToken();
    return { admin, jwt };
}

export async function logout(admin) {
    admin.token = null;
    await admin.save();
}

export async function updateAccount(args, admin) {
    const updates = Object.keys(args);
    updates.forEach((update) => admin[update] = args[update]);
    return admin.save();
}

export async function leaveDomain(domainid, admin) {
    const teams = await getTeams({ domain: domainid, members: admin.id });

    if (!teams.length) {
        throw new NotFoundError('No team found for this given domain id');
    }
    
    for (const admin_team of teams) {
        let indexMmeber = admin_team.members.indexOf(admin.id);
        admin_team.members.splice(indexMmeber, 1);
        await admin_team.save();

        let indexTeam = admin.teams.indexOf(admin_team._id);
        admin.teams.splice(indexTeam, 1);
        await admin.save();
    }

    return admin;
}

export async function deleteAccount(admin) {
    const domains = await Domain.find({ owner: admin._id }).countDocuments().exec();
    if (domains > 0) {
        throw new BadRequestError(
            `This account has ${domains} Domain(s) that must be either deleted or transfered to another account.`);
    }

    return admin.deleteOne();
}