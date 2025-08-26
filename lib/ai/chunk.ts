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
