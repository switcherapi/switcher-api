import mongoose from 'mongoose';

const teamInviteSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    teamid: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Team'
    }
}, {
    timestamps: true
});

teamInviteSchema.virtual('team', {
    ref: 'Team',
    localField: 'teamid',
    foreignField: '_id'
});

const TeamInvite = mongoose.model('TeamInvite', teamInviteSchema);

export default TeamInvite;