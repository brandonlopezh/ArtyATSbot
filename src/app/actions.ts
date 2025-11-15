'use server';

import { atsScoreCalculation, type AtsScoreCalculationOutput } from '@/ai/flows/ats-score-calculation';
import { resumeEnhancementSuggestions, type ResumeEnhancementSuggestionsOutput } from '@/ai/flows/resume-enhancement-suggestions';
import { whyThisRating, type WhyThisRatingOutput } from '@/ai/flows/why-this-rating';

export type AnalysisInput = {
  name: string;
  employmentStatus: string;
  resumeText: string;
  jobDescriptionText: string;
  goals?: string;
};


export type AnalysisResult = {
  scores: AtsScoreCalculationOutput;
  suggestions: ResumeEnhancementSuggestionsOutput;
  ratingExplanation: WhyThisRatingOutput;
};

export async function getAtsAnalysis(
  values: AnalysisInput
): Promise<{ success: true; data: AnalysisResult } | { success: false; error: string }> {
    try {
        const { name, employmentStatus, resumeText, jobDescriptionText, goals } = values;

        const scores = await atsScoreCalculation({ resumeText, jobDescriptionText });

        const [suggestions, ratingExplanation] = await Promise.all([
            resumeEnhancementSuggestions({
                resumeText,
                jobDescriptionText,
                atsPassScore: scores.atsPassScore,
                humanRecruiterScore: scores.humanRecruiterScore,
                userInfo: goals || 'Looking for a new role.',
                employmentStatus,
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
