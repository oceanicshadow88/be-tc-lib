const mongoose = require('mongoose');
const amqp = require('amqplib');
const { startMessageConsumer } = require('../../consumer/importProjectConsumer');
const Project = require('../../model/project');
const Ticket = require('../../model/ticket');
const Type = require('../../model/type');
const { memoryDb } = require('../utils/memoryDb');

const EXCHANGE_NAME = 'import_exchange';
const QUEUE_NAME = 'import_queue';
const ROUTING_KEY = 'import.csv';

jest.mock('amqplib');

describe('Import Project Microservice Integration Test', () => {
  let mockChannel;
  beforeAll(async () => {
    const uri = await memoryDb.start();
    process.env.MONGODB_CONNECTION = uri;
    await mongoose.connect(uri);
    expect(mongoose.connection.readyState).toBe(1);
  });

  beforeEach(async () => {
    await memoryDb.clear();
    const TypeModel = Type.getModel();
    await TypeModel.create({
      name: 'Story',
      slug: 'story',
      icon: '📝',
    });
  });

  afterAll(async () => {
    await memoryDb.stop();
  });

  it('should create project and tickets in DB after message', async () => {
    jest.clearAllMocks();

    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue(undefined),
      assertQueue: jest.fn().mockResolvedValue({ queue: 'test-queue' }),
      bindQueue: jest.fn().mockResolvedValue(undefined),
      // consume: jest.fn().mockImplementation((queue, callback) => {
      //   mockChannel.callback = callback;
      // }),
      publish: jest.fn().mockImplementation((exchange, routingKey, content, options) => {
        if (mockChannel.callback) {
          const message = {
            content: content,
            fields: {
              exchange,
              routingKey,
            },
            properties: options,
          };
          mockChannel.callback(message);
        }
      }),
      ack: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      purgeQueue: jest.fn().mockResolvedValue(undefined),
    };

    const mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn().mockResolvedValue(undefined),
    };

    amqp.connect.mockResolvedValue(mockConnection); 

    await startMessageConsumer();

    const testData = {
      filePath: 'test/fixtures/test.csv',
      tenantId: '62e333606fb0da0a12dcfe78',
      ownerId: '62e333606fb0da0a12dcfe78',
    };

    await mockChannel.publish(EXCHANGE_NAME, ROUTING_KEY, Buffer.from(JSON.stringify(testData)));

    await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms更保险一点

    const ProjectModel = Project.getModel();
    const project = await ProjectModel.findOne({ tenant: testData.tenantId });
    expect(project).toBeDefined();
    expect(project?.name).toBe('Test Project');
    expect(project?.key).toBe('TEST');

    const TicketModel = Ticket.getModel();
    const tickets = await TicketModel.find({ project: project?._id });
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets[0].title).toBe('Test Ticket');
  });
});
