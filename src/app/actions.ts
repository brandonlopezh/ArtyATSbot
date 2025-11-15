'use server';

import { z } from 'zod';
import { atsScoreCalculation, type AtsScoreCalculationOutput } from '@/ai/flows/ats-score-calculation';
import { generatePersonalizedFeedback, type PersonalizedFeedbackOutput } from '@/ai/flows/personalized-feedback';
import { resumeEnhancementSuggestions, type ResumeEnhancementSuggestionsOutput } from '@/ai/flows/resume-enhancement-suggestions';
import { whyThisRating, type WhyThisRatingOutput } from '@/ai/flows/why-this-rating';


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
  ratingExplanation: WhyThisRatingOutput;
};

export async function getAtsAnalysis(
  values: z.infer<typeof analysisSchema>
): Promise<{ success: true; data: AnalysisResult } | { success: false; error: string }> {
    try {
        const { name, employmentStatus, resumeText, jobDescriptionText, goals } = values;

        const scores = await atsScoreCalculation({ resumeText, jobDescriptionText });

        // 1. Calculate Scores & Get Suggestions in parallel
        const [suggestions, feedback, ratingExplanation] = await Promise.all([
            resumeEnhancementSuggestions({
                resumeText,
                jobDescriptionText,
                atsPassScore: scores.atsPassScore,
                humanRecruiterScore: scores.humanRecruiterScore,
                userInfo: goals || 'Looking for a new role.',
                employmentStatus,
            }),
            generatePersonalizedFeedback({
                resumeText,
                jobDescriptionText,
                userName: name,
                atsPassScore: scores.atsPassScore,
                humanRecruiterScore: scores.humanRecruiterScore,
                strengths: "Your resume shows a strong foundation. Let's sharpen it.", // Generic strength
                weaknesses: "Based on the analysis, here are areas to focus on.", // Generic weakness, real suggestions are in the other flow
            }),
            whyThisRating({
                resumeText,
                jobDescriptionText,
                atsRealScore: scores.atsRealScore,
            }),
        ]);
        

        return {
            success: true,
            data: {
                scores,
                feedback,
                suggestions,
                ratingExplanation,
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
