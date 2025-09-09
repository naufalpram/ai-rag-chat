import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { embeddingsMultiModal } from "./embeddings";

export const imageResources = pgTable("imageResources", {
    id: varchar("id", { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    imageUrl: text("image_url").notNull(),
    embeddingId: varchar('embedding_id', { length: 191 }).references(
        () => embeddingsMultiModal.id,
        { onDelete: 'cascade' },
      ),
  });