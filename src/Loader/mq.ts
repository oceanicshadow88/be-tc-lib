import amqp, { Connection, Channel } from 'amqplib';

const isLocal = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local';
const RABBITMQ_URL = isLocal
  ? 'amqp://localhost'
  : process.env.RABBITMQ_URL ?? 'amqp://localhost';

let connection: Connection | null = null;
let channel: Channel | null = null;

export const connectToRabbitMQ = async (): Promise<Channel> => {
  if (channel) {
    return channel;
  }
  connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();
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