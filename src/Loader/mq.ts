import amqp, { Channel, ChannelModel } from 'amqplib';
import config from './config';

const RABBITMQ_URL = config.RABBITMQ_CONNECTION;

const EXCHANGE_NAME = 'import_exchange';
const QUEUE_NAME = 'import_queue';
const ROUTING_KEY = 'import.csv';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export const connectToRabbitMQ = async (): Promise<Channel> => {
  if (channel) {
    return channel;
  }
  connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

  channel.on('error', (err) => {
    console.error('RabbitMQ channel error:', err);
    channel = null;
  });
  channel.on('close', () => {
    console.warn('RabbitMQ channel closed');
    channel = null;
  });
  return channel;
};

export const closeRabbitMQ = async (): Promise<void> => {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
  }
};

export const consumeMessages = async (onMessage: (msg: amqp.ConsumeMessage | null) => void) => {
  console.log('22222222222');

  await channel?.consume(QUEUE_NAME, (msg) => {
    if (msg) {
      onMessage(msg);
      channel?.ack(msg);
    }
  });
};
