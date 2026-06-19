import mongoose from 'mongoose';
import { config } from './config.js';

mongoose.set('strictQuery', true);

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(config.mongodbUri);
  return mongoose.connection;
}

export { mongoose };
