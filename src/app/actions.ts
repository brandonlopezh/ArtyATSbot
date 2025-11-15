'use server';

import { z } from 'zod';
import { atsScoreCalculation, type AtsScoreCalculationOutput } from '@/ai/flows/ats-score-calculation';
import { generatePersonalizedFeedback, type PersonalizedFeedbackOutput } from '@/ai/flows/personalized-feedback';
import { resumeEnhancementSuggestions, type ResumeEnhancementSuggestionsOutput } from '@/ai/flows/resume-enhancement-suggestions';
import { automatedResumeRevisionTool, type AutomatedResumeRevisionToolOutput } from '@/ai/flows/automated-resume-revision-tool';

const analysisSchema = z.object({
  name: z.string(),
  employmentStatus: z.string(),
  resumeText: z.string(),
  jobDescriptionText: z.string(),
  goals: z.string().optional(),
});


export type AnalysisResult = {
  scores: AtsScoreCalculationOutput;
  feedback: PersonalizedFeedbackOutput;
  suggestions: ResumeEnhancementSuggestionsOutput;
  revision: AutomatedResumeRevisionToolOutput;
};

export async function getAtsAnalysis(
  values: z.infer<typeof analysisSchema>
): Promise<{ success: true; data: AnalysisResult } | { success: false; error: string }> {
    try {
        const { name, employmentStatus, resumeText, jobDescriptionText, goals } = values;

        // 1. Calculate Scores - This is the foundation
        const scores = await atsScoreCalculation({ resumeText, jobDescriptionText });

        // 2. Get enhancement suggestions (which we can use as "weaknesses" for feedback)
        const suggestions = await resumeEnhancementSuggestions({
            resumeText,
            jobDescriptionText,
            atsPassScore: scores.atsPassScore,
            humanRecruiterScore: scores.humanRecruiterScore,
            userInfo: goals || 'Looking for a new role.',
            employmentStatus,
        });

        // 3. Run feedback and revision in parallel now that we have dependencies
        const [feedback, revision] = await Promise.all([
            generatePersonalizedFeedback({
                resumeText,
                jobDescriptionText,
                userName: name,
                atsPassScore: scores.atsPassScore,
                humanRecruiterScore: scores.humanRecruiterScore,
                strengths: "Your resume shows a strong foundation and your experience is clearly laid out. Let's build on that!",
                weaknesses: suggestions.suggestedEdits, // Use suggestions as the basis for weaknesses
            }),
            automatedResumeRevisionTool({
                resume: resumeText,
                jobDescription: jobDescriptionText,
                userName: name,
                userCommunicationStyle: 'casual', // Assuming casual for Arty's persona
            })
        ]);

        return {
            success: true,
            data: {
                scores,
                feedback,
                suggestions,
                revision,
            },
        };
    } catch (error) {
        console.error('Error in getAtsAnalysis:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during analysis.';
        return {
            success: false,
            error: `AI analysis failed. ${errorMessage}`,
        };
    }
}
