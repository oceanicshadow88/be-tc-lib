import { consumeMessages } from '../loader/mq';
import { processCsv } from '../service/importService';

export const startMessageConsumer = async () => {
  await consumeMessages(async (msg) => {
    if (msg) {
      const parsedMessage = JSON.parse(msg.content.toString());
      const { filePath, tenantId, ownerId } = parsedMessage;
      await processCsv(filePath, tenantId, ownerId);
    }
  });
};
