import mongoose from 'mongoose';
import History from '../../src/models/history';

export const domainId = new mongoose.Types.ObjectId();
export const element1Id = new mongoose.Types.ObjectId();
export const element2Id = new mongoose.Types.ObjectId();

export const addHistory = async (domainId, elementId, oldValue, newValue, date) => {
    const history = {
        id: new mongoose.Types.ObjectId(),
        domainId,
        elementId,
        oldValue,
        newValue,
        date,
        updatedBy: 'FIXTURE'
    };

    await new History(history).save();
};

export const setupDatabase = async () => {
     await History.deleteMany().exec();
};