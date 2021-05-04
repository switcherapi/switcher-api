import Slack from '../models/slack';

export async function getSlack(enterprise_id, team_id) {
    const query = Slack.findOne();

    if (enterprise_id) {
        query.where('enterprise_id', enterprise_id);
    } else {
        query.where('team_id', team_id);
    }

    return query.exec();
}

export async function createSlackInstallation(args) {
    // Remove old installation
    await deleteSlack(args.enterprise_id, args.team_id);

    // Create new slack instance
    let slackInstallation = new Slack({...args});
    return slackInstallation.save();
}

export async function deleteSlack(enterprise_id, team_id) {
    const slack = await getSlack(enterprise_id, team_id);
    if (slack)
        return slack.remove();
}