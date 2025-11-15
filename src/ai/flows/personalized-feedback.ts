'use server';
/**
 * @fileOverview Provides personalized feedback and suggestions to users using the tone and personality of Arty, the friendly career advisor.
 *
 * - generatePersonalizedFeedback - A function that generates personalized feedback.
 * - PersonalizedFeedbackInput - The input type for the generatePersonalizedFeedback function.
 * - PersonalizedFeedbackOutput - The return type for the generatePersonalizedFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedFeedbackInputSchema = z.object({
  resumeText: z.string().describe('The text content of the user\'s resume.'),
  jobDescriptionText: z.string().describe('The text content of the job description.'),
  userName: z.string().describe('The name of the user.'),
  atsPassScore: z.number().describe('The ATS pass score for the resume.'),
  humanRecruiterScore: z.number().describe('The human recruiter score for the resume.'),
  strengths: z.string().describe('A summary of the strengths of the resume.'),
  weaknesses: z.string().describe('A summary of the weaknesses of the resume.'),
});
export type PersonalizedFeedbackInput = z.infer<typeof PersonalizedFeedbackInputSchema>;

const PersonalizedFeedbackOutputSchema = z.object({
  feedback: z.string().describe('The personalized feedback for the user in markdown bullet points.'),
});
export type PersonalizedFeedbackOutput = z.infer<typeof PersonalizedFeedbackOutputSchema>;

export async function generatePersonalizedFeedback(input: PersonalizedFeedbackInput): Promise<PersonalizedFeedbackOutput> {
  return personalizedFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedFeedbackPrompt',
  input: {schema: PersonalizedFeedbackInputSchema},
  output: {schema: PersonalizedFeedbackOutputSchema},
  prompt: `You are Arty, a direct and honest career advisor robot. Your goal is to give {{userName}} clear, actionable feedback to improve their resume.

Your analysis is based on these scores:
- ATS Pass Score: {{atsPassScore}}
- Human Recruiter Score: {{humanRecruiterScore}}

Based on the resume weaknesses ({{weaknesses}}), provide 2-3 direct, scannable bullet points for {{userName}}. Each bullet point should be a single, short sentence. No fluff. Get straight to the point.
`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const personalizedFeedbackFlow = ai.defineFlow(
  {
    name: 'personalizedFeedbackFlow',
    inputSchema: PersonalizedFeedbackInputSchema,
    outputSchema: PersonalizedFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
