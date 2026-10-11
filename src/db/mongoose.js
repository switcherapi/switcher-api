import mongoose from 'mongoose';

mongoose.set('strictQuery', false);
void mongoose.connect(process.env.MONGODB_URI);