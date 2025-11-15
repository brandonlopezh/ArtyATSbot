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
  whyIWouldCall: z.string().describe('A bulleted list of reasons why a recruiter WOULD call this applicant based on their resume.'),
  whyIWouldNotCall: z.string().describe("A bulleted list of reasons why a recruiter WOULD NOT call this applicant based on their resume."),
});
export type WhyThisRatingOutput = z.infer<typeof WhyThisRatingOutputSchema>;

export async function whyThisRating(input: WhyThisRatingInput): Promise<WhyThisRatingOutput> {
  return whyThisRatingFlow(input);
}

const whyThisRatingPrompt = ai.definePrompt({
  name: 'whyThisRatingPrompt',
  input: {schema: WhyThisRatingInputSchema},
  output: {schema: WhyThisRatingOutputSchema},
  prompt: `You are Arty, an expert resume analyst. The user's resume scored {{atsRealScore}}.

  **Instructions:**
  1.  Analyze the resume against the job description.
  2.  For 'whyIWouldCall', provide a bulleted list of the strongest points of the resume that align with the job description. These are the green flags.
  3.  For 'whyIWouldNotCall', provide a bulleted list of the specific weak points, red flags, or areas for improvement that lower the score and would give a recruiter pause.
  4.  Be direct, honest, and base your feedback only on the provided text. Do not invent skills, experiences, or availability.

  **Resume:**
  {{{resumeText}}}

  **Job Description:**
  {{{jobDescriptionText}}}

  Output the reasons in JSON format.
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
