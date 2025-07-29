'use server';

import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from '@/lib/db/schema/resources';
import { db } from '../db';
import { generateEmbeddings } from '../ai/embedding';
import { embeddings as embeddingsTable } from '../db/schema/embeddings';

export const createResource = async (input: NewResourceParams) => {
  try {
    const { content } = insertResourceSchema.parse(input);
    // console.log(content)
    const [resource] = await db
      .insert(resources)
      .values({ content })
      .returning();

    console.log(resource)
    
    const embeddings = await generateEmbeddings(content);
    const embeddingEntries = embeddings.map(embedding => ({
      resourceId: resource.id,
      ...embedding,
    }));
    const [embds] = await db.insert(embeddingsTable).values(embeddingEntries).returning();
    
    console.log('embedding:', embds);

    return 'Resource successfully created and embedded.';
  } catch (error) {
    return error instanceof Error && error.message.length > 0
      ? error.message
      : 'Error, please try again.';
  }
};