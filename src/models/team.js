import mongoose from 'mongoose';
import { Role, ActionTypes, RouterTypes } from './role';
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
        type: mongoose.Schema.Types.ObjectId
    }]
})

export async function addDefaultRole(action, team) {
    const roleAllRouter = new Role({
        action,
        router: RouterTypes.ALL
    })
    await roleAllRouter.save();
    team.roles.push(roleAllRouter._id);
}

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