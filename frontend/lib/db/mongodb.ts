import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable");
}

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const client = new MongoClient(uri, options);
const clientPromise = global._mongoClientPromise ?? client.connect();

if (process.env.NODE_ENV !== "production") {
  global._mongoClientPromise = clientPromise;
}

export async function getDb() {
  const connectedClient = await clientPromise;
  return connectedClient.db();
}
