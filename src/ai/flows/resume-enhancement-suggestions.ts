'use server';

/**
 * @fileOverview A flow to recommend specific resume edits based on ATS scoring, uploaded JD and resume content.
 *
 * - resumeEnhancementSuggestions - A function that handles the resume enhancement process.
 * - ResumeEnhancementSuggestionsInput - The input type for the resumeEnhancementSuggestions function.
 * - ResumeEnhancementSuggestionsOutput - The return type for the resumeEnhancementSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ResumeEnhancementSuggestionsInputSchema = z.object({
  resumeText: z.string().describe('The text content of the resume.'),
  jobDescriptionText: z.string().describe('The text content of the job description.'),
  atsPassScore: z.number().describe('The ATS pass score of the resume.'),
  humanRecruiterScore: z.number().describe('The human recruiter score of the resume.'),
});
export type ResumeEnhancementSuggestionsInput = z.infer<
  typeof ResumeEnhancementSuggestionsInputSchema
>;

const ResumeEnhancementSuggestionsOutputSchema = z.object({
  suggestedEdits: z.string().describe('A list of suggested edits for the resume in markdown format.'),
});
export type ResumeEnhancementSuggestionsOutput = z.infer<
  typeof ResumeEnhancementSuggestionsOutputSchema
>;

export async function resumeEnhancementSuggestions(
  input: ResumeEnhancementSuggestionsInput
): Promise<ResumeEnhancementSuggestionsOutput> {
  return resumeEnhancementSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'resumeEnhancementSuggestionsPrompt',
  input: {schema: ResumeEnhancementSuggestionsInputSchema},
  output: {schema: ResumeEnhancementSuggestionsOutputSchema},
  prompt: `You are Arty, a helpful and direct career advisor. Your task is to provide specific, actionable resume edits to a user.

  **Analysis Data:**
  - **ATS Pass Score:** {{atsPassScore}}
  - **Human Recruiter Score:** {{humanRecruiterScore}}

  **Documents:**
  - **Resume:**
  {{{resumeText}}}
  - **Job Description:**
  {{{jobDescriptionText}}}

  **Instructions:**
  1.  Identify 2-3 key areas for improvement in the resume based on the job description and scores.
  2.  For each area, provide a "Before" and "After" example.
      - The "Before" should be a direct quote from the user's resume.
      - The "After" should be your revised, improved version.
  3.  Format the output using Markdown bullet points for clarity.
  4.  Adhere strictly to the Honesty Filter:
      - **DO NOT** invent skills or experiences.
      - Reframe existing experience, but do not fabricate it.
  5.  Keep the tone direct, professional, and helpful. No fluff.

  **Example Output Format:**

  *   **Weak Summary:**
      *   **Before:** "Results-driven professional with a proven track record."
      *   **After:** "Product Manager with 5 years of experience leading cross-functional teams to launch B2C mobile apps, resulting in a 40% increase in user engagement."

  *   **Vague Accomplishment:**
      *   **Before:** "Responsible for managing project budgets."
      *   **After:** "Managed a $500K project budget, delivering the project 10% under budget by optimizing vendor contracts."

  Now, generate the suggestions for the provided resume and job description.
  `,
  config: {
    temperature: 0.1,
    model: 'googleai/gemini-2.5-flash',
  },
});

const resumeEnhancementSuggestionsFlow = ai.defineFlow(
  {
    name: 'resumeEnhancementSuggestionsFlow',
    inputSchema: ResumeEnhancementSuggestionsInputSchema,
    outputSchema: ResumeEnhancementSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
