import mongoose from 'mongoose';

mongoose.set('strictQuery', false);
await mongoose.connect(process.env.MONGODB_URI);