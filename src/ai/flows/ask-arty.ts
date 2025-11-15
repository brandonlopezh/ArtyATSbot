'use server';
/**
 * @fileOverview A conversational AI flow for answering user questions about their resume and a job description.
 *
 * - askArty - A function that handles the conversational Q&A.
 * - AskArtyInput - The input type for the askArty function.
 * - AskArtyOutput - The return type for the askArty function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AskArtyInputSchema = z.object({
  question: z.string().describe('The user\'s question.'),
  resumeText: z.string().describe('The text content of the resume.'),
  jobDescriptionText: z.string().describe('The text content of the job description.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe('The previous conversation history.'),
});
export type AskArtyInput = z.infer<typeof AskArtyInputSchema>;

const AskArtyOutputSchema = z.object({
  answer: z.string().describe("Gemini's answer to the user's question."),
});
export type AskArtyOutput = z.infer<typeof AskArtyOutputSchema>;

export async function askArty(input: AskArtyInput): Promise<AskArtyOutput> {
  return askArtyFlow(input);
}

const askArtyPrompt = ai.definePrompt({
  name: 'askArtyPrompt',
  input: {schema: AskArtyInputSchema},
  output: {schema: AskArtyOutputSchema},
  prompt: `You are Gemini, a friendly and insightful AI assistant. Your primary goal is to help a user understand and improve their resume in the context of a specific job description.

You have access to the user's resume and the job description they are targeting.

When the user asks a question, your response should be guided by the following principles:
1.  **Prioritize Context:** If the question is about the resume, the job, or the analysis, provide a detailed answer based on the documents provided.
2.  **Use General Knowledge:** If the question is more general (e.g., "What are common interview questions for a product manager?"), use your broader knowledge to provide a helpful answer.
3.  **Be Conversational:** Maintain a friendly, encouraging, and helpful tone. Remember the conversation history and refer to it when relevant.
4.  **Be Clear and Concise:** Format your answers using Markdown for readability (e.g., bullet points, bold text).

{{#if chatHistory}}
Here is the conversation history:
{{#each chatHistory}}
{{role}}: {{{content}}}
{{/each}}
{{/if}}

Resume:
{{{resumeText}}}

Job Description:
{{{jobDescriptionText}}}

User's Question:
"{{{question}}}"

Your Answer (as Gemini):
`,
});

const askArtyFlow = ai.defineFlow(
  {
    name: 'askArtyFlow',
    inputSchema: AskArtyInputSchema,
    outputSchema: AskArtyOutputSchema,
  },
  async input => {
    const {output} = await askArtyPrompt(input);
    return output!;
  }
);
