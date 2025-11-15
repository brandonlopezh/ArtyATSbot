# ArtyATSbot

An AI-powered resume analysis tool that helps job seekers optimize their resumes for Applicant Tracking Systems (ATS). Features "Arty," a friendly AI career advisor powered by Google's Gemini model.

## Features

- **ATS Score Calculation** - Comprehensive scoring using a dual-metric system (ATS Pass Score + Human Recruiter Score)
- **Resume & Job Description Parsing** - Extracts and analyzes key information from resumes (.docx) and job descriptions
- **Personalized AI Feedback** - Get honest, actionable advice from Arty
- **Interactive Chat** - Ask questions about your resume analysis
- **Resume Enhancement** - Specific recommendations to improve your ATS score

## Quick Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local file
echo "GOOGLE_GENAI_API_KEY=your_key_here" > .env.local

# 3. Run the app
npm run dev
```

## Requirements

- Node.js 20+
- Google AI API key (get one at https://aistudio.google.com/app/apikey)

## Development

**Run Next.js app:**
```bash
npm run dev
```
Then visit http://localhost:3000

**Run with Genkit Dev UI** (for testing AI flows):
```bash
npm run genkit:dev
```

## Environment Variables

Create a `.env.local` file in the root directory:

```
GOOGLE_GENAI_API_KEY=your_google_ai_api_key
```
