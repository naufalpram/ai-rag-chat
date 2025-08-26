'use server';

import {
  resources,
} from '@/lib/db/schema/resources';
import { db } from '../db';
import { generateEmbeddings } from '../ai/embedding';
import { embeddings as embeddingsTable } from '../db/schema/embeddings';

interface ResourceParams {
  content: string;
  fileName: string;
  sourceFileType: 'pdf' | 'html';
}

export const createResource = async ({ content, fileName, sourceFileType }: ResourceParams) => {
  try {
    const [resource] = await db
      .insert(resources)
      .values({ fileName })
      .returning();

    if (!resource.id) {
      throw new Error('Failed to create new resource');
    }
    
    const embeddings = await generateEmbeddings(content, sourceFileType);
    await db.insert(embeddingsTable).values(
      embeddings.map(embedding => ({
        resourceId: resource.id,
        ...embedding,
      }))
    );

    return 'Resource successfully created and embedded.';
  } catch (error) {
    console.error('Error creating resource:', error);
    return error instanceof Error && error.message.length > 0
      ? error.message
      : 'Error, please try again.';
  }
};