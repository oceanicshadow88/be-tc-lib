const mongoose = require('mongoose');
const { startMessageConsumer } = require('../../consumer/importProjectConsumer');
const { processCsv } = require('../../service/importService');
const Project = require('../../model/project');
const Ticket = require('../../model/ticket');
const Type = require('../../model/type');
const { memoryDb } = require('../utils/memoryDb');

// Mock RabbitMQ related modules
jest.mock('amqplib');
jest.mock('../../loader/mq', () => {
  let messageHandler = null;

  return {
    connectToRabbitMQ: jest.fn().mockResolvedValue({
      assertExchange: jest.fn(),
      assertQueue: jest.fn(),
      bindQueue: jest.fn(),
      publish: jest.fn(),
      on: jest.fn(),
    }),
    closeRabbitMQ: jest.fn(),
    consumeMessages: jest.fn().mockImplementation(async (onMessage) => {
      messageHandler = onMessage;
      // Store handler for test usage
      global.mockMessageHandler = messageHandler;
    }),
  };
});

// Mock fs.createReadStream to provide test CSV data
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    createReadStream: jest.fn(() => {
      const { Readable } = require('stream');
      // CSV data format that matches service expectations
      const csvData = `Project name,Project key,Summary,Description
Test Project,TESTPROJ,First Test Ticket,This is a detailed description of the first test ticket
Test Project,TESTPROJ,Second Test Ticket,This is a detailed description of the second test ticket
Test Project,TESTPROJ,Third Test Ticket,This is a detailed description of the third test ticket`;

      const stream = new Readable();
      stream.push(csvData);
      stream.push(null);
      return stream;
    }),
  };
});

describe('Import Project Integration Test - Real Consumer & ProcessCsv', () => {
  beforeAll(async () => {
    // Start in-memory database
    const uri = await memoryDb.start();
    process.env.MONGODB_CONNECTION = uri;
    await mongoose.connect(uri);
    expect(mongoose.connection.readyState).toBe(1);
  });

  beforeEach(async () => {
    // Clear database
    await memoryDb.clear();

    // Create required Type for testing
    const TypeModel = Type.getModel();
    await TypeModel.create({
      name: 'Story',
      slug: 'story',
      icon: '📝',
    });

    // Reset all mocks
    jest.clearAllMocks();
    global.mockMessageHandler = null;
  });

  afterAll(async () => {
    await memoryDb.stop();
  });

  describe('Consumer Message Processing', () => {
    it('should start consumer and process messages with real processCsv', async () => {
      // 1. Start consumer - this will set up real message handler
      await startMessageConsumer();

      // 2. Verify consumer started and registered message handler
      expect(global.mockMessageHandler).toBeDefined();

      // 3. Prepare test data
      const testMessage = {
        filePath: 'test/fixtures/test.csv',
        tenantId: '507f1f77bcf86cd799439011',
        ownerId: '507f1f77bcf86cd799439012',
      };

      // 4. Simulate RabbitMQ message
      const mockRabbitMQMessage = {
        content: Buffer.from(JSON.stringify(testMessage)),
        fields: {
          deliveryTag: 1,
          redelivered: false,
          exchange: 'import_exchange',
          routingKey: 'import.csv',
        },
        properties: {
          contentType: 'application/json',
          deliveryMode: 2,
        },
      };

      // 5. Call real message handler directly
      await global.mockMessageHandler(mockRabbitMQMessage);

      // 6. Wait for async processing to complete
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 7. Verify project creation
      const ProjectModel = Project.getModel();
      const projects = await ProjectModel.find({ tenant: testMessage.tenantId });

      expect(projects).toHaveLength(1);
      const project = projects[0];
      expect(project.name).toBe('Test Project');
      expect(project.key).toBe('TESTPROJ');
      expect(project.owner.toString()).toBe(testMessage.ownerId);
      expect(project.projectLead.toString()).toBe(testMessage.ownerId);
      expect(project.tenant).toBe(testMessage.tenantId);

      // 8. Verify ticket creation
      const TicketModel = Ticket.getModel();
      const tickets = await TicketModel.find({ project: project._id }).sort({ title: 1 });

      expect(tickets).toHaveLength(3);
      expect(tickets[0].title).toBe('First Test Ticket');
      expect(tickets[1].title).toBe('Second Test Ticket');
      expect(tickets[2].title).toBe('Third Test Ticket');

      // 9. Verify ticket-project association
      tickets.forEach((ticket) => {
        expect(ticket.project.toString()).toBe(project._id.toString());
      });

      // 10. Verify ticket type
      const TypeModel = Type.getModel();
      const storyType = await TypeModel.findOne({ slug: 'story' });
      tickets.forEach((ticket) => {
        expect(ticket.type.toString()).toBe(storyType._id.toString());
      });
    });

    it('should directly test processCsv function', async () => {
      const testData = {
        filePath: 'direct-test.csv',
        tenantId: '507f1f77bcf86cd799439013',
        ownerId: '507f1f77bcf86cd799439014',
      };

      // Call processCsv function directly
      await processCsv(testData.filePath, testData.tenantId, testData.ownerId);

      // Verify results
      const ProjectModel = Project.getModel();
      const project = await ProjectModel.findOne({ tenant: testData.tenantId });

      expect(project).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.key).toBe('TESTPROJ');

      const TicketModel = Ticket.getModel();
      const tickets = await TicketModel.find({ project: project._id });
      expect(tickets).toHaveLength(3);
    });
  });
});
