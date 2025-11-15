'use server';

import { atsScoreCalculation, type AtsScoreCalculationOutput } from '@/ai/flows/ats-score-calculation';
import { resumeEnhancementSuggestions, type ResumeEnhancementSuggestionsOutput } from '@/ai/flows/resume-enhancement-suggestions';
import { whyThisRating, type WhyThisRatingOutput } from '@/ai/flows/why-this-rating';
import { askArty, type AskArtyOutput, type AskArtyInput } from '@/ai/flows/ask-arty';

export type AnalysisInput = {
  name: string;
  resumeText: string;
  jobDescriptionText: string;
};


export type AnalysisResult = {
  scores: AtsScoreCalculationOutput;
  suggestions: ResumeEnhancementSuggestionsOutput;
  ratingExplanation: WhyThisRatingOutput;
  resumeText: string;
  jobDescriptionText: string;
};

export async function getAtsAnalysis(
  values: AnalysisInput
): Promise<{ success: true; data: AnalysisResult } | { success: false; error: string }> {
    try {
        const { name, resumeText, jobDescriptionText } = values;

        const scores = await atsScoreCalculation({ resumeText, jobDescriptionText });

        const [suggestions, ratingExplanation] = await Promise.all([
            resumeEnhancementSuggestions({
                resumeText,
                jobDescriptionText,
                atsPassScore: scores.atsPassScore,
                humanRecruiterScore: scores.humanRecruiterScore,
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
                resumeText,
                jobDescriptionText
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

export async function askArtyAction(
    input: Omit<AskArtyInput, 'chatHistory'>,
    chatHistory: AskArtyInput['chatHistory']
): Promise<{ success: true; data: AskArtyOutput } | { success: false; error: string }> {
    try {
        const result = await askArty({ ...input, chatHistory });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in askArtyAction:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, error: `Arty is having trouble thinking. ${errorMessage}` };
    }
}
