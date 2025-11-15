'use server';
/**
 * @fileOverview This file defines a Genkit flow for automated resume revision, specifically offering automated summary rewriting and key term enhancement suggestions.
 *
 * - automatedResumeRevisionTool - A function that handles the automated resume revision process.
 * - AutomatedResumeRevisionToolInput - The input type for the automatedResumeRevisionTool function.
 * - AutomatedResumeRevisionToolOutput - The return type for the automatedResumeRevisionTool function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutomatedResumeRevisionToolInputSchema = z.object({
  resume: z.string().describe('The text content of the resume.'),
  jobDescription: z.string().describe('The text content of the job description.'),
  userName: z.string().describe('The name of the user.'),
  userCommunicationStyle: z.string().describe('The communication style of the user (casual or formal).'),
});
export type AutomatedResumeRevisionToolInput = z.infer<typeof AutomatedResumeRevisionToolInputSchema>;

const AutomatedResumeRevisionToolOutputSchema = z.object({
  revisedSummary: z.string().describe('The revised summary for the resume.'),
  enhancedKeyTerms: z.array(z.string()).describe('The enhanced key terms for the resume.'),
  explanation: z.string().describe('Explanation of the changes made to the summary.'),
});
export type AutomatedResumeRevisionToolOutput = z.infer<typeof AutomatedResumeRevisionToolOutputSchema>;

export async function automatedResumeRevisionTool(input: AutomatedResumeRevisionToolInput): Promise<AutomatedResumeRevisionToolOutput> {
  return automatedResumeRevisionToolFlow(input);
}

const automatedResumeRevisionToolPrompt = ai.definePrompt({
  name: 'automatedResumeRevisionToolPrompt',
  input: {schema: AutomatedResumeRevisionToolInputSchema},
  output: {schema: AutomatedResumeRevisionToolOutputSchema},
  prompt: `You are Arty, a friendly career advisor. You are helping {{{userName}}} revise their resume to better match a job description. Take on the persona of a successful corporate friend, using emojis, and keeping responses short and punchy.

  Instructions:
  1.  Rewrite the resume summary to be punchy and under 65 words. Use the candidate's natural voice, which is {{{userCommunicationStyle}}}.
  2.  Identify key terms from the job description that are missing or could be emphasized more in the resume. Suggest these terms.
  3. Explain the changes made to the summary in a concise way.

  Here is the resume:
  {{{resume}}}

  Here is the job description:
  {{{jobDescription}}}

  Output the revised summary, enhanced key terms, and an explanation of changes.
  `,
});

const automatedResumeRevisionToolFlow = ai.defineFlow(
  {
    name: 'automatedResumeRevisionToolFlow',
    inputSchema: AutomatedResumeRevisionToolInputSchema,
    outputSchema: AutomatedResumeRevisionToolOutputSchema,
  },
  async input => {
    const {output} = await automatedResumeRevisionToolPrompt(input);
    return output!;
  }
);
