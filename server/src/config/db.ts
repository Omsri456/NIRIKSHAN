import mongoose from 'mongoose';
import { env } from './env';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.MONGO_URI, {
      dbName: env.MONGO_DB_NAME,
    });
    console.log(`✅ MongoDB connected → ${env.MONGO_DB_NAME}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}
