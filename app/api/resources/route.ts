import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resources } from '@/lib/db/schema/resources';
import { embeddings as embeddingsTable } from '@/lib/db/schema/embeddings';
import { generateEmbeddings } from '@/lib/ai/embedding';

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

    const [resource] = await db.insert(resources).values({ fileName: name }).returning();
    if (!resource?.id) {
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
    }

    const fileType = name.endsWith('.pdf') ? 'pdf' : 'html';
    const embeddings = await generateEmbeddings(content, fileType);
    await db.insert(embeddingsTable).values(
      embeddings.map((embedding) => ({ resourceId: resource.id, ...embedding }))
    );

    return NextResponse.json({ ok: true, resourceId: resource.id });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


