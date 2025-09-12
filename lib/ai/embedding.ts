import { embed, embedMany } from 'ai';
import { google } from '@ai-sdk/google';
import { cosineDistance, desc, eq, gt, sql } from 'drizzle-orm';
import { embeddings } from '../db/schema/embeddings';
import { db } from '../db';
import { chunkHtml, chunkText } from './chunk';
import { resources } from '../db/schema/resources';
import { GetInformationOutput } from '@/app/api/chat/tools';

const embeddingModel = google.textEmbeddingModel('text-embedding-004');

const generateChunks = (input: string): string[] => {
  return input
    .trim()
    .split('.')
    .filter(i => i !== '');
};

export const generateEmbeddings = async (
  value: string,
  sourceFileType: 'pdf' | 'html'
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = sourceFileType === 'pdf' ? chunkText(value) : chunkHtml(value);
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
    const input = value.replaceAll('\\n', ' ');
    const { embedding } = await embed({
      model: embeddingModel,
      value: input,
    });
    return embedding;
  };

export const findRelevantContent = async (userQuery: string) => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(
    embeddings.embedding,
    userQueryEmbedded,
  )})`;
  const similarGuides = await db
    .select({ 
      name: embeddings.content, 
      similarity,
      fileName: resources.fileName 
    })
    .from(embeddings)
    .innerJoin(resources, eq(embeddings.resourceId, resources.id))
    .where(gt(similarity, 0.5))
    .orderBy(t => desc(t.similarity))
    .limit(4);

  const sources = new Set(similarGuides.map((guide) => guide.fileName.split('.')[0]));
  const guides = similarGuides.map((guide) => ({ text: guide.name, similarity: guide.similarity }));
  return { sources: Array.from(sources), guides };
}; 