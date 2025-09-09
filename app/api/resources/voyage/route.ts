import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resources } from '@/lib/db/schema/resources';
import { embeddingsMultiModal } from '@/lib/db/schema/embeddings';
import { generateEmbeddingsVoyage } from '@/lib/ai/embedding';
import { chunkText, chunkVoyage } from '@/lib/ai/chunk';
import { imageResources } from '@/lib/db/schema/imageResources';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const name = file.name;
    const arrayBuffer = await file.arrayBuffer();
    let content = '';

    if (name.endsWith('.pdf')) {
      // Lazy import to avoid bundling on edge
      const pdfParse = (await import('pdf-parse')).default as unknown as (buffer: Buffer) => Promise<{ text: string }>;
      const data = await pdfParse(Buffer.from(arrayBuffer));
      content = data.text;
    } else if (name.endsWith('.html')) {
      content = new TextDecoder('utf-8').decode(arrayBuffer);
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    await db.transaction(async (tx) => {
        // insert resource information
        const [resource] = await tx.insert(resources).values({ fileName: name }).returning();
    
        // insert embeddings
        const chunks = chunkVoyage(content);
        const embeddings = await generateEmbeddingsVoyage(chunks);
        const embeddingIds = await tx.insert(embeddingsMultiModal)
          .values(embeddings.map((embedding) => ({ resourceId: resource.id, ...embedding })))
          .returning({ id: embeddingsMultiModal.id, originalIndex: embeddingsMultiModal.originalIndex });
    
        // insert image resource from embeddings
        const imageInserts: { embeddingId: string; imageUrl: string }[] = [];
        embeddingIds.forEach((item) => {
            const chunkImageDocument = chunks?.[item.originalIndex].image;
            if (chunkImageDocument && chunkImageDocument.length > 0) {
                imageInserts.push(...chunkImageDocument.map((chunk) => ({ embeddingId: item.id, imageUrl: chunk })));
            }
        });
        await tx.insert(imageResources).values(imageInserts);
    })

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


