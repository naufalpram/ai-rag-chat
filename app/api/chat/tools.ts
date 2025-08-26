// import { createResource } from "@/lib/actions/resources";
import { findRelevantContent } from "@/lib/ai/embedding";
import { tool } from "ai";
import z from "zod";

// export const addResource = tool({
//     description: `add a resource to your knowledge base.
//       If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
//     inputSchema: z.object({
//       content: z
//         .string()
//         .describe('the content or resource to add to the knowledge base'),
//     }),
//     execute: async ({ content }) => createResource({ content })
// });

export const getInformation = tool({
    description: `get information from your knowledge base to answer questions.`,
    inputSchema: z.object({
      question: z.string().describe('the users question'),
    }),
    outputSchema: z.array(z.object({
        name: z.string(),
        similarity: z.number()
    })),
    execute: async ({ question }) => findRelevantContent(question),
})
