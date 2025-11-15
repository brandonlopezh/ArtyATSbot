'use server';

/**
 * @fileOverview A flow to calculate an ATS score based on a resume and job description.
 *
 * - atsScoreCalculation - A function that calculates the ATS score.
 * - AtsScoreCalculationInput - The input type for the atsScoreCalculation function.
 * - AtsScoreCalculationOutput - The return type for the atsScoreCalculation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AtsScoreCalculationInputSchema = z.object({
  resumeText: z.string().describe('The text content of the resume.'),
  jobDescriptionText: z.string().describe('The text content of the job description.'),
});
export type AtsScoreCalculationInput = z.infer<typeof AtsScoreCalculationInputSchema>;

const AtsScoreCalculationOutputSchema = z.object({
  atsPassScore: z.number().describe('The ATS pass score (0-100).'),
  humanRecruiterScore: z.number().describe('The human recruiter score (0-100).'),
  atsRealScore: z.number().describe('The combined ATS real score (0-100).'),
});
export type AtsScoreCalculationOutput = z.infer<typeof AtsScoreCalculationOutputSchema>;

export async function atsScoreCalculation(input: AtsScoreCalculationInput): Promise<AtsScoreCalculationOutput> {
  return atsScoreCalculationFlow(input);
}

const atsScoreCalculationPrompt = ai.definePrompt({
  name: 'atsScoreCalculationPrompt',
  input: {schema: AtsScoreCalculationInputSchema},
  output: {schema: AtsScoreCalculationOutputSchema},
  prompt: `You are an expert ATS and resume evaluator. Given the following resume and job description, calculate the ATS pass score, human recruiter score, and combined ATS real score based on the scoring system v3.0.

Scoring System v3.0:
ATS Pass Score (0-100%)
Measures: \"Will this get past the ATS bot?\"
Breakdown:
Hard Skills Match: 40%
Experience Depth: 25%
Soft Skills/Keywords: 20%
Education: 10%
Format/Parsing: 5%
Penalties:
2-column resume = -20 pts
Keyword stuffing >4% = -15 pts
Missing critical (required) keywords = -10 pts each
Admin-as-tech = -15 pts
\"Learning\" when hands-on required = -20 pts

Human Recruiter Score (0-100%)
Measures: \"Will a human recruiter want to interview this person?\"
Breakdown:
Authenticity (40 points)
Does this sound like a real person or a keyword robot?
Impact Demonstration (20 points)
Do bullets prove value or just list tasks?
Skills Proof (10 points)
Are listed skills backed by experience bullets?
Red Flag Detection (30 points)
What kills recruiter interest immediately?

ATS Real Score (Combined)
ATS Real Score = (ATS Pass Score × 0.4) + (Human Recruiter Score × 0.6)

Resume:
{{{resumeText}}}

Job Description:
{{{jobDescriptionText}}}

Output the scores in JSON format.
`, 
});

const atsScoreCalculationFlow = ai.defineFlow(
  {
    name: 'atsScoreCalculationFlow',
    inputSchema: AtsScoreCalculationInputSchema,
    outputSchema: AtsScoreCalculationOutputSchema,
  },
  async input => {
    const {output} = await atsScoreCalculationPrompt(input);
    return output!;
  }
);
