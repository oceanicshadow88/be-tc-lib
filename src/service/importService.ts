import csv from 'csv-parser';
import fs from 'fs';
import stream from 'stream';
import mongoose from 'mongoose';
import * as Project from '../model/project';
import * as Ticket from '../model/ticket';
import { JSONContent } from '@tiptap/core';
import * as Type from '../model/type';
import { promiseHooks } from 'v8';

export const convertPlainTextToTipTapNodes = (rawDescription: string): string => {
  const lines = rawDescription.split('\n');
  const content: JSONContent[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const headingMatch = trimmedLine.match(/^h([1-6])\.\s*(.*)$/);
    if (headingMatch) {
      const level = parseInt(headingMatch[1], 10);
      const text = headingMatch[2].trim();

      if (text) {
        content.push({
          type: 'heading',
          attrs: { level },
          content: [{ type: 'text', text }],
        });
      }
    } else {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: trimmedLine }],
      });
    }
  }

  const doc: JSONContent = {
    type: 'doc',
    content,
  };

  return JSON.stringify(doc);
};

function createInputStream(input: Buffer | string): stream.Readable {
  if (!input) throw new Error('Invalid CSV input');
  if (Buffer.isBuffer(input)) {
    const inputStream = new stream.PassThrough();
    inputStream.end(input);
    return inputStream;
  }
  return fs.createReadStream(input);
}

function buildProjectObjectRequiredOnly(ticket: any, tenantId: string, ownerId?: string) {
  return {
    name: ticket['Project name'] ?? '',
    key: ticket['Project key'] ?? '',
    projectLead: new mongoose.Types.ObjectId(ownerId),
    owner: new mongoose.Types.ObjectId(ownerId),
    tenant: tenantId,
  };
}

function buildTicketObjectRequiredOnly(ticket: any, typeId: string, projectId: string) {
  const description = convertPlainTextToTipTapNodes(ticket.Description ?? '');
  return {
    title: ticket.Summary ?? '',
    project: new mongoose.Types.ObjectId(projectId),
    type: new mongoose.Types.ObjectId(typeId),
    description: description ?? '',
  };
}

async function handleParsedCsv(
  firstRow: any,
  tickets: any[],
  tenantId: string,
  ownerId: string | undefined,
  batchSize: number,
) {
  console.log('handleParsedCsv 222222');
  // Ensure database connection is established
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    throw new Error('Database connection not established 111111111');
  }

  const ProjectModel = Project.getModel();
  const TicketModel = Ticket.getModel();
  const TypeModel = Type.getModel();

  try {
    const projectObject = buildProjectObjectRequiredOnly(firstRow, tenantId, ownerId);
    const project = await ProjectModel.create([projectObject]);

    console.log('project', ProjectModel);

    let batch: any[] = [];
    let ticketInsertPromises: Promise<any>[] = [];

    const type = await TypeModel.findOne({ slug: 'story' });
    if (!type) {
      throw new Error('Type not found');
    }
    const typeId = type._id;

    for (const ticketRow of tickets) {
      const ticketObj = buildTicketObjectRequiredOnly(ticketRow, typeId, project[0]._id.toString());
      batch.push(ticketObj);

      if (batch.length === batchSize) {
        ticketInsertPromises.push(TicketModel.insertMany(batch));
        batch = [];
      }
    }

    if (batch.length > 0) {
      ticketInsertPromises.push(TicketModel.insertMany(batch));
    }

    await Promise.all(ticketInsertPromises);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('CSV import failed', error);

    throw error;
  }
}

export async function processCsv(
  inputFilePath: string,
  tenantId: string,
  ownerId?: string,
  batchSize = 5000,
): Promise<void> {
  console.log('processCsv1111111');
  const inputStream = createInputStream(inputFilePath);
  let firstRow: any = null;
  const tickets: any[] = [];

  await new Promise<void>((resolve, reject) => {
    inputStream
      .pipe(csv())
      .on('data', (row) => {
        firstRow ??= row;
        tickets.push(row);
      })
      .on('end', () => {
        handleParsedCsv(firstRow, tickets, tenantId, ownerId, batchSize)
          .then(resolve)
          .catch(reject);
      })
      .on('error', (err) => reject(err));
  });
  // eslint-disable-next-line no-console
  console.log('Project and ticket imported successfully');
}
