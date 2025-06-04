const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

class MemoryDb {
  static instance = null;
  mongod = null;

  constructor() {}

  static getInstance() {
    if (!MemoryDb.instance) {
      MemoryDb.instance = new MemoryDb();
    }
    return MemoryDb.instance;
  }

  async start() {
    if (!this.mongod) {
      this.mongod = await MongoMemoryServer.create();
    }
    return this.mongod.getUri();
  }

  async stop() {
    if (this.mongod) {
      await mongoose.connection.close();
      await this.mongod.stop();
      this.mongod = null;
    }
  }

  async clear() {
    if (mongoose.connection.readyState === 1) {
      const collections = await mongoose.connection.db.collections();
      for (const collection of collections) {
        await collection.deleteMany({});
      }
    }
  }
}

const memoryDb = MemoryDb.getInstance();

module.exports = { memoryDb };
