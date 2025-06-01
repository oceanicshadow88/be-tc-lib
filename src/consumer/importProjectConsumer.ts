import { consumeMessages } from '../loader/mq';
import { processCsv } from '../service/importService';

export const startMessageConsumer = async () => {
  await consumeMessages((msg) => {
    if (msg) {
      console.log('消息内容字符串:', msg.content.toString());
      const parsedMessage = JSON.parse(msg.content.toString());
      console.log(parsedMessage);
      const { filePath, tenantId, ownerId } = parsedMessage;
      processCsv(filePath, tenantId, ownerId);
    }
  });
};
