'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Sparkles, Bot, ArrowLeft, Upload, Briefcase, Minus, Plus, Send, CornerDownLeft } from 'lucide-react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { marked } from 'marked';


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getAtsAnalysis, askArtyAction, type AnalysisResult, type AskArtyInput } from '@/app/actions';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';


const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ACCEPTED_FILE_TYPES = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

const formSchema = z.object({
  name: z.string().min(1, { message: "Please tell Arty your name!" }),
  resumeFile: z
    .any()
    .refine((files): files is FileList => files instanceof FileList && files.length > 0, 'Please upload your resume.')
    .refine((files): files is FileList => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 4MB.`)
    .refine(
      (files): files is FileList => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      '.docx, and .txt files are accepted.'
    ),
  jobDescriptionText: z.string().min(100, { message: "Please paste the full job description." }),
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
      jobDescriptionText: '',
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
        resumeText: resumeText,
        jobDescriptionText: values.jobDescriptionText,
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
              </div>
              
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
  const [isChatOpen, setIsChatOpen] = React.useState(false);
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
      
      <div className="text-center">
         <Button onClick={() => setIsChatOpen(true)} size="lg" className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <Sparkles className="w-5 h-5 mr-2" />
            Ask Arty
        </Button>
      </div>

       <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="sm:max-w-[625px] h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bot /> Ask Arty</DialogTitle>
            <DialogDescription>
              Have questions about your resume, the job description, or your analysis? Arty is here to help.
            </DialogDescription>
          </DialogHeader>
          <AskArtyChat
            resumeText={result.resumeText}
            jobDescriptionText={result.jobDescriptionText}
            initialQuestion={`Gemini, why is my resume rating ${result.scores.atsRealScore}%?`}
          />
        </DialogContent>
      </Dialog>


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

function AskArtyChat({ resumeText, jobDescriptionText, initialQuestion }: { resumeText: string; jobDescriptionText: string; initialQuestion: string }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState(initialQuestion);
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const chatHistory = messages;

    try {
      const result = await askArtyAction(
        { question: input, resumeText, jobDescriptionText },
        chatHistory
      );

      if (result.success) {
        const modelMessage: ChatMessage = { role: 'model', content: result.data.answer };
        setMessages(prev => [...prev, modelMessage]);
      } else {
        const errorMessage: ChatMessage = { role: 'model', content: `Sorry, something went wrong: ${result.error}` };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = { role: 'model', content: `Sorry, an unexpected error occurred.` };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4 -mx-6" ref={scrollAreaRef}>
        <div className="space-y-4 pr-6">
          {messages.map((message, index) => (
            <div key={index} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[75%] rounded-lg px-3 py-2',
                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: marked(message.content) as string}} />
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <DialogFooter className="pt-4">
        <form onSubmit={handleSend} className="flex items-center w-full space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Arty anything..."
            disabled={isLoading}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                handleSend(e);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogFooter>
    </div>
  );
}

