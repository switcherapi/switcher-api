import mongoose from 'mongoose';
import { Role, RouterTypes } from './role';
import Admin from './admin';

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
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
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }]
})

teamSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret, options) {
        if (ret.members_list) {
            ret.members = ret.members_list
            delete ret.members_list
        }
        return ret
    }
}

teamSchema.virtual('members_list', {
    ref: 'Admin',
    localField: 'members',
    foreignField: '_id'
})

export async function addDefaultRole(action, team) {
    const roleAllRouter = new Role({
        action,
        router: RouterTypes.ALL
    })
    await roleAllRouter.save();
    team.roles.push(roleAllRouter._id);
}

const existTeam = async (team) => {
    if (team.__v === undefined) {
        const foundTeam = await Team.find({ name: team.name, domain: team.domain })
        return foundTeam.length > 0
    }
    return false
}


teamSchema.pre('validate', async function (next) {
    const team = this

    // Verify if team already exist
    if (await existTeam(team)) {
        const err = new Error(`Unable to complete the operation. Team '${team.name}' already exist for this Domain`)
        next(err);
    }

    next()
})

teamSchema.pre('remove', async function (next) {
    const team = this
    await Role.deleteMany({ _id: { $in: team.roles } })

    const membersToRemve = await Admin.find({ teams: team._id });
    membersToRemve.forEach(member => {
        const indexValue = member.teams.indexOf(team._id);
        member.teams.splice(indexValue);
        member.save();
    })

    next()
})

export const Team = mongoose.model('Team', teamSchema);