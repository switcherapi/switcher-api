import mongoose from 'mongoose';

mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGODB_URI);