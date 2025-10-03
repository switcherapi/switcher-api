import mongoose from 'mongoose';
import { Permission, RouterTypes } from './permission.js';
import Admin from './admin.js';

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 30,
        minlength: 2
    },
    active: {
        type: Boolean,
        required: true,
        default: true
    },
    domain: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Domain'
    },
    permissions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission'
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }]
});

teamSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (_doc, ret) {
        if (ret.members_list) {
            ret.members = ret.members_list;
            delete ret.members_list;
        }
        return ret;
    }
};

teamSchema.virtual('members_list', {
    ref: 'Admin',
    localField: 'members',
    foreignField: '_id'
});

export async function addDefaultPermission(action, team) {
    const permissionAllRouter = new Permission({
        action,
        router: RouterTypes.ALL
    });
    await permissionAllRouter.save();
    team.permissions.push(permissionAllRouter._id);
}

const existTeam = async (team) => {
    if (team.__v === undefined) {
        const foundTeam = await Team.find({ name: team.name, domain: team.domain }).exec();
        return foundTeam.length > 0;
    }
    return false;
};

teamSchema.pre('validate', async function (next) {
    // Verify if team already exists
    if (await existTeam(this)) {
        const err = new Error(`Unable to complete the operation. Team '${this.name}' already exists for this Domain`);
        next(err);
    }

    next();
});

teamSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    await Permission.deleteMany({ _id: { $in: this.permissions } }).exec();

    const membersToRemve = await Admin.find({ teams: this._id }).exec();
    for (const member of membersToRemve) {
        const indexValue = member.teams.indexOf(this._id);
        member.teams.splice(indexValue, 1);
        member.save();
    }

    next();
});

export const Team = mongoose.model('Team', teamSchema);