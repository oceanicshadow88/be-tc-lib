const mongoose = require('mongoose');
const amqp = require('amqplib');
const { connectToRabbitMQ } = require('../../loader/mq');
const { startMessageConsumer } = require('../../consumer/importProjectConsumer');
const { processCsv } = require('../../service/importService');
const Project = require('../../model/project');
const Ticket = require('../../model/ticket');
const Type = require('../../model/type');
const { memoryDb } = require('../utils/memoryDb');

const EXCHANGE_NAME = 'import_exchange';
const QUEUE_NAME = 'import_queue';
const ROUTING_KEY = 'import.csv';

// Mock RabbitMQ
jest.mock('../../loader/mq', () => {
  const mockChannel = {
    assertExchange: jest.fn().mockResolvedValue(undefined),
    assertQueue: jest.fn().mockResolvedValue(undefined),
    bindQueue: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(undefined),
    purgeQueue: jest.fn().mockResolvedValue(undefined),
    consume: jest.fn(),
    ack: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  };

  return {
    connectToRabbitMQ: jest.fn().mockResolvedValue(mockChannel),
    consumeMessages: jest.fn().mockImplementation((onMessage) => {
      mockChannel.consume.mockImplementation((queue, callback) => {
        mockChannel.onMessage = callback;
      });
    }),
  };
});

describe('Import Project Microservice Integration Test', () => {
  let channel;

  beforeAll(async () => {
    // 启动内存数据库
    const uri = await memoryDb.start();
    process.env.MONGODB_CONNECTION = uri;
    await mongoose.connect(uri);

    // 验证数据库连接
    expect(mongoose.connection.readyState).toBe(1);

    channel = await connectToRabbitMQ();
  });

  beforeEach(async () => {
    // 清理数据库
    await memoryDb.clear();

    // 创建测试数据
    const TypeModel = Type.getModel();
    await TypeModel.create({
      name: 'Story',
      slug: 'story',
      icon: '📝',
    });

    // 清空队列
    await channel.purgeQueue(QUEUE_NAME);
  });

  afterAll(async () => {
    await memoryDb.stop();
  });

  describe('Message Publisher', () => {
    it('should successfully publish message to exchange', async () => {
      const testData = {
        filePath: 'test/fixtures/test.csv',
        tenantId: '62e333606fb0da0a12dcfe78',
        ownerId: '62e333606fb0da0a12dcfe78',
      };

      // 发送消息
      await channel.publish(EXCHANGE_NAME, ROUTING_KEY, Buffer.from(JSON.stringify(testData)));

      // 验证消息发送
      expect(channel.publish).toHaveBeenCalledWith(
        EXCHANGE_NAME,
        ROUTING_KEY,
        Buffer.from(JSON.stringify(testData)),
      );
    });
  });

  describe('Message Consumer', () => {
    it('should setup consumer correctly', async () => {
      await startMessageConsumer();

      // 验证消费者设置
      expect(channel.consume).toHaveBeenCalledWith(QUEUE_NAME, expect.any(Function));
      const messageHandler = channel.consume.mock.calls[0][1];
      expect(typeof messageHandler).toBe('function');
    });

    it('should process message and create project', async () => {
      const testData = {
        filePath: 'test/fixtures/test.csv',
        tenantId: '62e333606fb0da0a12dcfe78',
        ownerId: '62e333606fb0da0a12dcfe78',
      };

      // 启动消费者
      await startMessageConsumer();

      // 模拟消息接收
      if (channel.onMessage) {
        const message = {
          content: Buffer.from(JSON.stringify(testData)),
        };
        await channel.onMessage(message);
      }

      // 等待处理完成
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 验证项目创建
      const ProjectModel = Project.getModel();
      const project = await ProjectModel.findOne({ tenant: testData.tenantId });
      expect(project).toBeDefined();
      expect(project?.name).toBe('Test Project');
      expect(project?.key).toBe('TEST');

      // 验证票据创建
      const TicketModel = Ticket.getModel();
      const tickets = await TicketModel.find({ project: project?._id });
      expect(tickets.length).toBeGreaterThan(0);
      expect(tickets[0].title).toBe('Test Ticket');
    });

    it('should handle invalid message data', async () => {
      await startMessageConsumer();

      // 模拟接收无效消息
      if (channel.onMessage) {
        const message = {
          content: Buffer.from('invalid json'),
        };
        await channel.onMessage(message);
      }

      // 等待处理完成
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 验证没有创建任何项目
      const ProjectModel = Project.getModel();
      const projects = await ProjectModel.find({});
      expect(projects.length).toBe(0);
    });
  });
});
