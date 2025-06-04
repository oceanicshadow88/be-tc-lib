const mongoose = require('mongoose');
const amqp = require('amqplib');
const { memoryDb } = require('./utils/memoryDb');

// 模拟 amqplib
jest.mock('amqplib', () => {
  const mockChannel = {
    assertExchange: jest.fn().mockResolvedValue(undefined),
    assertQueue: jest.fn().mockResolvedValue(undefined),
    bindQueue: jest.fn().mockResolvedValue(undefined),
    consume: jest.fn(),
    ack: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const mockConnection = {
    createChannel: jest.fn().mockResolvedValue(mockChannel),
    close: jest.fn().mockResolvedValue(undefined),
  };

  return {
    connect: jest.fn().mockImplementation((url = 'amqp://localhost') => {
      return Promise.resolve(mockConnection);
    }),
  };
});

// 在所有测试之前设置
beforeAll(async () => {
  const uri = await memoryDb.start();
  process.env.MONGODB_CONNECTION = uri;
  process.env.RABBITMQ_CONNECTION = 'amqp://localhost';

  // 确保数据库连接成功
  await mongoose.connect(uri);
});

// 在每个测试之前清理数据库
beforeEach(async () => {
  await memoryDb.clear();
});

// 在所有测试之后清理
afterAll(async () => {
  await memoryDb.stop();
});
