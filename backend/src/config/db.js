import mongoose from 'mongoose';

export async function connectDb(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    maxPoolSize: 50, // enough headroom for bursts of concurrent requests per API instance
    serverSelectionTimeoutMS: 5000,
  });
  // Build indexes up front. Unique indexes are part of our correctness guarantees
  // (no duplicate registrations / payments), so we don't start without them.
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
  return mongoose.connection;
}

export function disconnectDb() {
  return mongoose.disconnect();
}
