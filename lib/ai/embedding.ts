import { embed, embedMany } from 'ai';
import { google } from '@ai-sdk/google';
import { MultimodalEmbeddingInput, voyage } from 'voyage-ai-provider';
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';
import { embeddings, embeddingsMultiModal } from '../db/schema/embeddings';
import { imageResources } from '../db/schema/imageResources';
import { db } from '../db';
import { chunkHtml, chunkText } from './chunk';

const embeddingModel = google.textEmbeddingModel('text-embedding-004');
const voyageEmbeddingModel = voyage.multimodalEmbeddingModel('voyage-multimodal-3');

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

type MultiModalChunks = {
  text: string[];
  image?: string[];
}[];

export const generateEmbeddingsVoyage = async (
  chunks: MultiModalChunks
): Promise<Array<{ embedding: number[]; content: string; originalIndex: number; }>> => {
  const { embeddings } = await embedMany<MultimodalEmbeddingInput>({
    model: voyageEmbeddingModel,
    values: chunks,
    providerOptions: {
      voyage: {
        inputType: 'document',
        outputDimension: 1024
      }
    }
  });
  return embeddings.map((e, i) => ({ content: chunks[i].text.join('\n'), originalIndex: i, embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
    const input = value.replaceAll('\\n', ' ');
    const { embedding } = await embed({
      model: embeddingModel,
      value: input,
    });
    return embedding;
  };

export const generateEmbeddingVoyage = async (value: string): Promise<number[]> => {
    const input = value.replaceAll('\\n', ' ');
    const { embedding } = await embed({
      model: voyageEmbeddingModel,
      value: input,
      providerOptions: {
        voyage: {
          inputType: 'query',
          outputDimension: 1024
        }
      }
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
    .select({ name: embeddings.content, similarity })
    .from(embeddings)
    .where(gt(similarity, 0.5))
    .orderBy(t => desc(t.similarity))
    .limit(4);
  return similarGuides;
};

export const findRelevantContentMultiModal = async (userQuery: string) => {
  const userQueryEmbedded = await generateEmbeddingVoyage(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(
    embeddingsMultiModal.embedding,
    userQueryEmbedded,
  )})`;

  // Join embeddingsMultiModal with imageResources to get imageUrls for each guide
  const similarGuides = await db
    .select({
      text: embeddingsMultiModal.content,
      similarity,
      imageUrls: sql<string[]>`
        coalesce(
          array_agg(${imageResources.imageUrl}) 
          filter (where ${imageResources.embeddingId} = ${embeddingsMultiModal.id}),
          '{}'
        )
      `
    })
    .from(embeddingsMultiModal)
    .leftJoin(
      imageResources,
      sql`${imageResources.embeddingId} = ${embeddingsMultiModal.id}`
    )
    .where(gt(similarity, 0.5))
    .groupBy(embeddingsMultiModal.id)
    .orderBy(t => desc(t.similarity))
    .limit(4);

  return similarGuides;
};