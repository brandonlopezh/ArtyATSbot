'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Loader2, Sparkles, Bot, FileText, Briefcase, ArrowLeft, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getAtsAnalysis, type AnalysisResult, formSchema } from '@/app/actions';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type Step = 'input' | 'loading' | 'results';

export default function AtsRealScorePage() {
  const [step, setStep] = React.useState<Step>('input');
  const [analysisResult, setAnalysisResult] = React.useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      employmentStatus: '',
      resumeText: '',
      jobDescriptionText: '',
      goals: '',
    },
  });

  const isLoading = step === 'loading';

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setStep('loading');
    const result = await getAtsAnalysis(values);
    if (result.success) {
      setAnalysisResult(result.data);
      setStep('results');
    } else {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: result.error,
      });
      setStep('input');
    }
  }

  const handleGoBack = () => {
    setAnalysisResult(null);
    setStep('input');
  };

  const renderContent = () => {
    switch (step) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center h-96">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <h2 className="text-2xl font-semibold">Arty is working its magic...</h2>
            <p className="text-muted-foreground">Analyzing your resume against the job description. Hold tight! 🚀</p>
          </div>
        );
      case 'results':
        return analysisResult && <ResultsDisplay result={analysisResult} onBack={handleGoBack} />;
      case 'input':
      default:
        return (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What's your name? 😊</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Alex Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="employmentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Are you currently employed? 🤔</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="employed">Yes, I'm currently employed</SelectItem>
                          <SelectItem value="unemployed">No, I'm looking for a new role</SelectItem>
                          <SelectItem value="student">I'm a student</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="resumeText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Your Resume
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste your full resume text here..."
                        className="h-48 font-code"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobDescriptionText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Job Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the full job description here..."
                        className="h-48 font-code"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="goals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Any specific goals? (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 'pivot into product management', 'get a senior role'" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 mr-2" />
                )}
                Analyze My Resume
              </Button>
            </form>
          </Form>
        );
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 bg-background sm:p-6 md:p-10">
      <header className="flex items-center gap-3 mb-8 text-center">
        <Bot className="w-10 h-10 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground">ATS Real Score with Arty</h1>
      </header>
      <Card className="w-full max-w-4xl shadow-2xl animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
        <CardHeader>
          <CardTitle className="text-2xl">
            {step === 'input' ? "Let's Get Started!" : "Here's Your Analysis"}
          </CardTitle>
          <CardDescription>
            {step === 'input'
              ? "What's up! I'm Arty, your ATS Job Helper. Let's beat the bots and impress recruiters. 🚀"
              : "Arty's analysis is complete. Let's dive into the results."}
          </CardDescription>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
      <footer className="mt-8 text-sm text-center text-muted-foreground">
        <p>Powered by AI. Designed with ❤️.</p>
      </footer>
    </div>
  );
}

function ResultsDisplay({ result, onBack }: { result: AnalysisResult; onBack: () => void }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-accent';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-destructive';
  };
  
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to Clipboard!',
      description: `${label} has been copied.`,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-500">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Analyze Another
      </Button>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <ScoreCard
          title="ATS Real Score"
          score={result.scores.atsRealScore}
          description="Your real chance of getting an interview."
          isPrimary
        />
        <ScoreCard title="ATS Pass Score" score={result.scores.atsPassScore} description="Will you get past the bot?" />
        <ScoreCard
          title="Human Recruiter Score"
          score={result.scores.humanRecruiterScore}
          description="Will a human want to talk to you?"
        />
      </div>

      <Tabs defaultValue="feedback" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="feedback">Arty's Feedback</TabsTrigger>
          <TabsTrigger value="suggestions">Enhancements</TabsTrigger>
          <TabsTrigger value="revision">Auto-Revise</TabsTrigger>
        </TabsList>
        
        <TabsContent value="feedback" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar>
                  <AvatarImage src="https://picsum.photos/seed/arty/40/40" alt="Arty" />
                  <AvatarFallback>🤖</AvatarFallback>
                </Avatar>
                <div className="p-4 rounded-lg bg-secondary">
                  <p className="whitespace-pre-wrap">{result.feedback.feedback}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Enhancement Suggestions</CardTitle>
              <CardDescription>Here are specific, actionable edits to improve your scores.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 space-y-4 prose prose-sm text-foreground max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2">
                 <p className="whitespace-pre-wrap">{result.suggestions.suggestedEdits}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revision" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Automated Revision Tool</CardTitle>
              <CardDescription>Arty has rewritten your summary and found key terms to add.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-2 font-semibold text-md">Revised Summary ✨</h3>
                <div className="relative p-4 rounded-md bg-secondary">
                  <p className="italic">{result.revision.revisedSummary}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(result.revision.revisedSummary, 'Revised summary')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                 <p className="mt-2 text-sm text-muted-foreground">{result.revision.explanation}</p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-md">Enhanced Key Terms 🔑</h3>
                <div className="flex flex-wrap gap-2">
                  {result.revision.enhancedKeyTerms.map((term, index) => (
                    <Badge key={index} variant="outline" className="font-code">{term}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScoreCard({ title, score, description, isPrimary = false }: { title: string; score: number; description: string; isPrimary?: boolean }) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const getScoreColorClass = (value: number) => {
    if (value >= 80) return 'text-accent';
    if (value >= 60) return 'text-yellow-500';
    return 'text-destructive';
  };

  return (
    <Card className={cn("flex flex-col", isPrimary && "bg-primary/10 border-primary")}>
      <CardHeader>
        <CardTitle className={cn("text-lg", isPrimary && "text-primary")}>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col justify-center flex-grow">
        <div className="flex items-center justify-center gap-4">
          <div
            className={cn(
              "text-5xl font-bold tracking-tighter",
              isPrimary ? "text-primary" : getScoreColorClass(score)
            )}
          >
            {score}
            <span className="text-3xl text-muted-foreground">%</span>
          </div>
        </div>
        <Progress value={progress} className={cn("h-2 mt-4", isPrimary && "[&>div]:bg-primary")} />
      </CardContent>
    </Card>
  );
}
