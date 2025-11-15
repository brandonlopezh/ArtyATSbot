'use server';

/**
 * @fileOverview A flow to explain the reasoning behind the ATS and recruiter scores.
 *
 * - whyThisRating - A function that generates an explanation for the scores.
 * - WhyThisRatingInput - The input type for the whyThisRating function.
 * - WhyThisRatingOutput - The return type for the whyThisRating function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WhyThisRatingInputSchema = z.object({
  resumeText: z.string().describe('The text content of the resume.'),
  jobDescriptionText: z.string().describe('The text content of the job description.'),
  atsRealScore: z.number().describe('The combined ATS real score (0-100).'),
});
export type WhyThisRatingInput = z.infer<typeof WhyThisRatingInputSchema>;

const WhyThisRatingOutputSchema = z.object({
  explanation: z.string().describe('A detailed explanation for the score in markdown format.'),
  recruiterPerspective: z.string().describe("What a recruiter would think about the resume's weak points."),
});
export type WhyThisRatingOutput = z.infer<typeof WhyThisRatingOutputSchema>;

export async function whyThisRating(input: WhyThisRatingInput): Promise<WhyThisRatingOutput> {
  return whyThisRatingFlow(input);
}

const whyThisRatingPrompt = ai.definePrompt({
  name: 'whyThisRatingPrompt',
  input: {schema: WhyThisRatingInputSchema},
  output: {schema: WhyThisRatingOutputSchema},
  prompt: `You are Arty, an expert resume analyst. The user has a resume that scored {{atsRealScore}} and they want to know why.

  **Instructions:**
  1.  Analyze the resume against the job description.
  2.  Identify the top 2-3 specific areas in the resume that are most likely responsible for lowering the score. These could be missing keywords, unclear impact, poor formatting, etc.
  3.  For your 'explanation' output, provide a clear, bulleted list of these weak points. Be direct.
  4.  For the 'recruiterPerspective' output, write a short paragraph explaining what a human recruiter might think when seeing these issues. Frame it as "A recruiter might think...".

  **Resume:**
  {{{resumeText}}}

  **Job Description:**
  {{{jobDescriptionText}}}

  Output the explanation and recruiter perspective in JSON format.
  `,
});

const whyThisRatingFlow = ai.defineFlow(
  {
    name: 'whyThisRatingFlow',
    inputSchema: WhyThisRatingInputSchema,
    outputSchema: WhyThisRatingOutputSchema,
  },
  async input => {
    const {output} = await whyThisRatingPrompt(input);
    return output!;
  }
);
