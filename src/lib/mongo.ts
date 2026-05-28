import { MongoClient, Db } from "mongodb";
import { mongoConfig } from "./config";

// Cache the client across hot-reloads in dev and across invocations in prod.
const globalForMongo = globalThis as unknown as {
  _mongoClient?: MongoClient;
  _mongoClientPromise?: Promise<MongoClient>;
};

function clientPromise(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(mongoConfig.uri());
    globalForMongo._mongoClient = client;
    globalForMongo._mongoClientPromise = client.connect();
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(mongoConfig.db());
}

export const COLLECTIONS = {
  sessions: "sessions",
} as const;
