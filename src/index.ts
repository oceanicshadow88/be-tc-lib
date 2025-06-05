import connectToDb from './loader/db';
import { connectToRabbitMQ } from './loader/mq';
import { startMessageConsumer } from './consumer/importProjectConsumer';

const init = async () => {
  await connectToDb();
  await connectToRabbitMQ();
  await startMessageConsumer();
};

init();
