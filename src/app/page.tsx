'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Sparkles, Bot, ArrowLeft, Upload, Briefcase, Minus, Plus, Send } from 'lucide-react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { marked } from 'marked';


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getAtsAnalysis, type AnalysisResult, askArtyAction } from '@/app/actions';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ACCEPTED_FILE_TYPES = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

const formSchema = z.object({
  name: z.string().min(1, { message: "Please tell Arty your name!" }),
  employmentStatus: z.string().min(1, { message: "Please select your employment status." }),
  resumeFile: z
    .any()
    .refine((files): files is FileList => files instanceof FileList && files.length > 0, 'Please upload your resume.')
    .refine((files): files is FileList => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 4MB.`)
    .refine(
      (files): files is FileList => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      '.docx, and .txt files are accepted.'
    ),
  jobDescriptionText: z.string().min(100, { message: "Please paste the full job description." }),
  goals: z.string().optional(),
});


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
      jobDescriptionText: '',
      goals: '',
    },
  });

  const isLoading = step === 'loading';
  const resumeFileRef = form.register("resumeFile");

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            reader.onload = (event) => {
                try {
                    const arrayBuffer = event.target?.result;
                    if (arrayBuffer) {
                        const zip = new PizZip(arrayBuffer);
                        const doc = new Docxtemplater(zip, {
                            paragraphLoop: true,
                            linebreaks: true,
                        });
                        const text = doc.getFullText();
                        resolve(text);
                    } else {
                        reject(new Error('Could not read file buffer.'));
                    }
                } catch (error) {
                    console.error('Error parsing docx file:', error);
                    reject(new Error('Failed to parse .docx file. The file might be corrupted or in an unsupported format.'));
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (file.type === 'text/plain') {
             reader.onload = () => resolve(reader.result as string);
             reader.onerror = () => reject(reader.error);
             reader.readAsText(file);
        }
         else {
            reject(new Error('Unsupported file type. Please use .docx or .txt'));
        }
    });
};


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setStep('loading');

    try {
      const resumeFile = values.resumeFile[0];
      const resumeText = await readFileAsText(resumeFile);

      const result = await getAtsAnalysis({
        name: values.name,
        employmentStatus: values.employmentStatus,
        resumeText: resumeText,
        jobDescriptionText: values.jobDescriptionText,
        goals: values.goals,
      });

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
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
       toast({
        variant: 'destructive',
        title: 'Error processing file.',
        description: `There was a problem reading your resume file. ${errorMessage}`,
      });
      setStep('input');
    }
  }

  const handleGoBack = () => {
    setAnalysisResult(null);
    form.reset();
    setStep('input');
  };
  
  const handleTryAgain = async (newResumeFile: File) => {
    setStep('loading');
    try {
        const currentValues = form.getValues();
        const resumeText = await readFileAsText(newResumeFile);
        
        const result = await getAtsAnalysis({
            ...currentValues,
            resumeText,
        });

        if (result.success) {
            setAnalysisResult(result.data);
            setStep('results');
        } else {
            toast({
                variant: 'destructive',
                title: 'Analysis Failed',
                description: result.error,
            });
            setStep('results'); // Go back to showing previous results
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({
            variant: 'destructive',
            title: 'Error processing new resume',
            description: errorMessage,
        });
        setStep('results'); // Go back to showing previous results
    }
};


  const renderContent = () => {
    switch (step) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center h-96">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        );
      case 'results':
        return analysisResult && <ResultsDisplay result={analysisResult} onBack={handleGoBack} onTryAgain={handleTryAgain} />;
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
                name="resumeFile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Upload className="w-4 h-4" /> Upload Your Resume
                    </FormLabel>
                    <FormControl>
                      <div className="relative p-2 border border-input rounded-md">
                        <Input type="file" accept=".docx,.txt" {...resumeFileRef} className="w-full" />
                      </div>
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

  const getCardTexts = () => {
    switch(step) {
      case 'results':
        return {
          title: "Analysis Report",
          description: "Arty has meticulously analyzed your resume. Let's dive into the results."
        }
      case 'loading':
        return {
          title: "Analyzing...",
          description: "Arty is on the case..."
        }
      case 'input':
      default:
        return {
          title: "Let's Get Started!",
          description: ""
        }
    }
  }

  const { title, description } = getCardTexts();

  return (
    <div className="flex flex-col items-center min-h-screen p-4 bg-background text-foreground sm:p-6 md:p-10">
      <header className="relative flex flex-col items-center w-full max-w-4xl gap-2 mb-8 text-center">
        <div className="flex items-center gap-3">
          <Bot className="w-10 h-10 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground">ATS Real Score ✨</h1>
        </div>
        <p className="italic text-muted-foreground">w/ Arty the Career Search companion</p>
        <div className="absolute top-0 right-0">
          <ThemeToggle />
        </div>
      </header>
      <Card className="w-full max-w-4xl shadow-2xl animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
        <CardHeader>
          <CardTitle className="text-2xl">
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
      <footer className="mt-8 text-sm text-center text-muted-foreground">
        <p>Powered by AI. Designed with ❤️.</p>
      </footer>
    </div>
  );
}

function ResultsDisplay({ result, onBack, onTryAgain }: { result: AnalysisResult; onBack: () => void; onTryAgain: (file: File) => void; }) {
  
  const suggestionsHtml = React.useMemo(() => marked(result.suggestions.suggestedEdits), [result.suggestions.suggestedEdits]);
  const whyIWouldMoveForwardHtml = React.useMemo(() => marked(result.ratingExplanation.whyIWouldMoveForward), [result.ratingExplanation.whyIWouldMoveForward]);
  const whyIWouldNotMoveForwardHtml = React.useMemo(() => marked(result.ratingExplanation.whyIWouldNotMoveForward), [result.ratingExplanation.whyIWouldNotMoveForward]);


  return (
    <div className="space-y-8 animate-in fade-in-0 duration-500">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Analyze Another
      </Button>

      <div className="flex flex-col items-center gap-6">
        <div className="w-full">
             <ScoreCard
                title="ATS Real Score ✨"
                score={result.scores.atsRealScore}
                description="This is the score that matters. It shows your true chances of getting an interview."
                isPrimary
                isCenter
            />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 w-full">
            <ScoreCard title="ATS Pass Score" score={result.scores.atsPassScore} description="Will you get past the bot?" />
            <ScoreCard
                title="Human Recruiter Score"
                score={result.scores.humanRecruiterScore}
                description="Will a human want to talk to you?"
            />
        </div>
      </div>

      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suggestions">Enhancements Needed</TabsTrigger>
          <TabsTrigger value="why-rating">Arty, would you give me an interview?</TabsTrigger>
        </TabsList>
        
        <TabsContent value="suggestions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Enhancement Suggestions</CardTitle>
              <CardDescription>Here are specific, actionable edits to improve your scores.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="p-4 space-y-4 prose max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-li:my-1 prose-strong:text-foreground" dangerouslySetInnerHTML={{ __html: suggestionsHtml }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="why-rating" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Arty, would you give me an interview?</CardTitle>
                    <CardDescription>Arty's breakdown of what's affecting your score.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 rounded-md bg-secondary/50">
                        <div className="flex items-center gap-2 font-semibold text-green-600">
                            <Plus className="h-5 w-5"/>
                            <span>Why I would move forward with your application</span>
                        </div>
                        <div className="prose prose-sm max-w-none dark:prose-invert mt-2 border-l-2 pl-4 ml-2 border-green-600/30" dangerouslySetInnerHTML={{ __html: whyIWouldMoveForwardHtml }} />
                    </div>
                     <div className="p-4 rounded-md bg-secondary/50">
                        <div className="flex items-center gap-2 font-semibold text-red-600">
                             <Minus className="h-5 w-5" />
                             <span>Why I wouldn't move forward with your application</span>
                        </div>
                        <div className="prose prose-sm max-w-none dark:prose-invert mt-2 border-l-2 pl-4 ml-2 border-red-600/30" dangerouslySetInnerHTML={{ __html: whyIWouldNotMoveForwardHtml }} />
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
       <TryAgain onTryAgain={onTryAgain} />
       <AskArtyFloater result={result} />

    </div>
  );
}

function ScoreCard({ title, score, description, isPrimary = false, isCenter = false }: { title: string; score: number; description: string; isPrimary?: boolean, isCenter?: boolean }) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const getScoreColorClass = (value: number) => {
    if (value >= 70) return 'text-primary';
    return 'text-destructive';
  };
  
    const scoreSizeClass = isCenter ? "text-7xl" : "text-5xl";
    const titleSizeClass = isCenter ? "text-2xl" : "text-lg";

  return (
    <Card className={cn("flex flex-col", isCenter && "bg-secondary/30")}>
      <CardHeader className={cn(isCenter && "items-center")}>
        <CardTitle className={cn("font-bold", titleSizeClass, isPrimary && "text-primary")}>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col justify-center flex-grow">
        <div className="flex items-center justify-center gap-4">
          <div
            className={cn(
              "font-bold tracking-tighter",
              scoreSizeClass,
              getScoreColorClass(score)
            )}
          >
            {score}
            <span className={cn("text-muted-foreground", isCenter ? "text-4xl" : "text-3xl")}>%</span>
          </div>
        </div>
        <Progress value={progress} className={cn("h-3 mt-4", isPrimary && "[&>div]:bg-primary")} />
      </CardContent>
    </Card>
  );
}

function TryAgain({ onTryAgain }: { onTryAgain: (file: File) => void }) {
    const [file, setFile] = React.useState<File | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            setFile(files[0]);
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleResubmit = async () => {
        if (!file) return;
        setIsUploading(true);
        await onTryAgain(file);
        setIsUploading(false);
        setFile(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <Card className="mt-8 bg-secondary/50">
            <CardHeader>
                <CardTitle>Made changes to your resume?</CardTitle>
                <CardDescription>Upload your new version to see how your score has improved.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                 <Button onClick={handleButtonClick} variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    {file ? 'Change File' : 'Upload New Resume'}
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".docx,.txt" />
                {file && <span className="text-sm text-muted-foreground">{file.name}</span>}
                 {file && (
                    <Button onClick={handleResubmit} disabled={isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Re-Analyze
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

type ChatMessage = {
    role: 'user' | 'model';
    content: string;
};

function AskArtyFloater({ result }: { result: AnalysisResult }) {
    const [open, setOpen] = React.useState(false);
    const [chatHistory, setChatHistory] = React.useState<ChatMessage[]>([]);
    const [question, setQuestion] = React.useState('');
    const [isThinking, setIsThinking] = React.useState(false);
    const { toast } = useToast();
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if(scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
      }
    }, [chatHistory])

    const handleAskArty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || isThinking) return;

        const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: question }];
        setChatHistory(newHistory);
        setQuestion('');
        setIsThinking(true);

        const response = await askArtyAction({
            question,
            resumeText: result.resumeText,
            jobDescriptionText: result.jobDescriptionText,
        }, chatHistory);

        setIsThinking(false);

        if (response.success) {
            setChatHistory([...newHistory, { role: 'model', content: response.data.answer }]);
        } else {
            toast({
                variant: 'destructive',
                title: 'Arty is having trouble thinking.',
                description: response.error,
            });
             setChatHistory(chatHistory); // revert history
        }
    };


    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50 animate-in fade-in-0 zoom-in-50 duration-500">
                    <div className="flex flex-col items-center">
                        <Bot className="h-8 w-8" />
                        <span className="text-xs">Ask Arty</span>
                    </div>
                </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col">
                <SheetHeader>
                    <SheetTitle>Ask Arty</SheetTitle>
                    <SheetDescription>
                        Have questions about your resume or the job? Arty is here to help!
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                    <div className="space-y-4">
                        {chatHistory.map((chat, index) => (
                            <div key={index} className={cn("flex items-start gap-3", chat.role === 'user' ? 'justify-end' : '')}>
                                {chat.role === 'model' && <Bot className="h-6 w-6 text-primary flex-shrink-0" />}
                                <div className={cn("p-3 rounded-lg max-w-sm", chat.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                    <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: marked(chat.content) }} />
                                </div>
                            </div>
                        ))}
                         {isThinking && (
                            <div className="flex items-start gap-3">
                                <Bot className="h-6 w-6 text-primary flex-shrink-0" />
                                <div className="p-3 rounded-lg bg-muted">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <form onSubmit={handleAskArty} className="flex items-center gap-2 pt-4">
                    <Input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="e.g., How can I improve my skills section?"
                        disabled={isThinking}
                    />
                    <Button type="submit" size="icon" disabled={isThinking || !question.trim()}>
                        {isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}