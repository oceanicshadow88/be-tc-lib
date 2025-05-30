import mongoose from 'mongoose';
import { config } from './config'

const connectToDb = async (): Promise<void> => {
  const db = mongoose.connection;
  db.on('connecting', () => {
    console.log('Attempting to connect to db');
  });
  db.on('connected', () => {
    console.log('db connected successfully');
  });
  db.on('disconnected', () => {
    console.log('Db connection lost');
  });
  db.on('reconnected', () => {
    console.log('Db reconnected successfully');
  });
  db.on('error', (error: Error) => {
    console.error('Db connection error', error);
    process.exit(1);
  });

  if (!config.MONGODB_CONNECTION) {
    throw new Error('MONGODB_CONNECTION env variable is not set');
  }
  await mongoose.connect(config.MONGODB_CONNECTION);
};

export default connectToDb;