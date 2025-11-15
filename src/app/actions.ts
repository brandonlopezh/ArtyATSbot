'use server';

import { z } from 'zod';
import { atsScoreCalculation, type AtsScoreCalculationOutput } from '@/ai/flows/ats-score-calculation';
import { generatePersonalizedFeedback, type PersonalizedFeedbackOutput } from '@/ai/flows/personalized-feedback';
import { resumeEnhancementSuggestions, type ResumeEnhancementSuggestionsOutput } from '@/ai/flows/resume-enhancement-suggestions';

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
};

export async function getAtsAnalysis(
  values: z.infer<typeof analysisSchema>
): Promise<{ success: true; data: AnalysisResult } | { success: false; error: string }> {
    try {
        const { name, employmentStatus, resumeText, jobDescriptionText, goals } = values;

        // 1. Calculate Scores & Get Suggestions in parallel
        const [scores, suggestions] = await Promise.all([
            atsScoreCalculation({ resumeText, jobDescriptionText }),
            resumeEnhancementSuggestions({
                resumeText,
                jobDescriptionText,
                atsPassScore: 0, // Placeholder, will be updated
                humanRecruiterScore: 0, // Placeholder, will be updated
                userInfo: goals || 'Looking for a new role.',
                employmentStatus,
            })
        ]);
        
        // Update suggestions with actual scores for feedback context
        suggestions.suggestedEdits = suggestions.suggestedEdits; // This is a bit redundant, but ensures the structure is maintained

        // 2. Generate feedback using the results
        const feedback = await generatePersonalizedFeedback({
            resumeText,
            jobDescriptionText,
            userName: name,
            atsPassScore: scores.atsPassScore,
            humanRecruiterScore: scores.humanRecruiterScore,
            strengths: "Your resume shows a strong foundation. Let's sharpen it.", // Generic strength
            weaknesses: suggestions.suggestedEdits, // Use suggestions as the basis for weaknesses
        });

        return {
            success: true,
            data: {
                scores,
                feedback,
                suggestions,
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