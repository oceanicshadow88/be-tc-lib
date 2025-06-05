/* eslint-disable no-secrets/no-secrets */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  ENVIRONMENT: process.env.ENVIRONMENT,
  MONGODB_CONNECTION: process.env.MONGODB_CONNECTION,
  RABBITMQ_CONNECTION: process.env.RABBITMQ_CONNECTION ?? '',
};

export default config;
