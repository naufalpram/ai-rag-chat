import { encode } from 'gpt-tokenizer';
import * as cheerio from 'cheerio';

const MAX_TOKENS_PER_CHUNK = 1000;

export const chunkHtml = (html: string) => {
  const $ = cheerio.load(html);
  const chunks = [];
  let currentChunk = "";
  $('div.page-content').children().each((_, element) => {
    const el = $(element);
    if (el.is('h1')) {
      if (currentChunk.trim() !== "") chunks.push(currentChunk.trim());
      currentChunk = el.text() + "\n\n";
    } else {
      const elementText = el.text().trim();
      if (elementText) {
        const textToAppend = elementText + "\n\n";
        const potentialChunk = currentChunk + textToAppend;
        if (encode(potentialChunk).length > MAX_TOKENS_PER_CHUNK) {
          chunks.push(currentChunk.trim());
          currentChunk = textToAppend;
        } else {
          currentChunk = potentialChunk;
        }
      }
    }
  });
  if (currentChunk.trim() !== "") chunks.push(currentChunk.trim());
  return chunks;
}

export const chunkVoyage = (html: string) => {
  const $ = cheerio.load(html);
  const chunks: Array<{ text: string[]; image?: string[] }> = [];
  let currentText: string[] = [];
  let currentImages: string[] = [];

  const pushChunk = () => {
    if (currentText.length > 0 || currentImages.length > 0) {
      const chunk: { text: string[]; image?: string[] } = {
        text: [...currentText],
      };
      if (currentImages.length > 0) {
        chunk.image = [...currentImages];
      }
      chunks.push(chunk);
      currentText = [];
      currentImages = [];
    }
  };

  $('div.page-content').children().each((_, element) => {
    const el = $(element);

    // If it's a heading, treat as a chunk boundary
    if (el.is('h1') || el.is('h2')) {
      pushChunk();
      const headingText = el.text().trim();
      if (headingText) currentText.push(headingText);
    } else if (el.is('img')) {
      const src = el.attr('src');
      if (src) currentImages.push(src);
    } else {
      // Check for images inside other elements
      const imgs = el.find('img');
      if (imgs.length > 0) {
        imgs.each((_, img) => {
          const src = $(img).attr('src');
          if (src) currentImages.push(src);
        });
      }
      const text = el.text();
      if (text) {
        // Split by newlines, trim, and add each non-empty line as a separate item
        text.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed) currentText.push(trimmed);
        });
      }
    }
  });

  pushChunk();
  return chunks;
};

export const chunkText = (text: string) => {
  const chunks = [];
  const sentences = text.split(/(?<=[.?!])\s+/);
  let currentChunk = "";
  for (const sentence of sentences) {
    const potentialChunk = currentChunk + sentence + " ";
    if (encode(potentialChunk).length > MAX_TOKENS_PER_CHUNK) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence + " ";
    } else {
      currentChunk = potentialChunk;
    }
  }
  if (currentChunk.trim() !== "") chunks.push(currentChunk.trim());
  return chunks;
}
