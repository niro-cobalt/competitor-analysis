'use client';

import { useEffect, useState } from 'react';
import { AddCompetitorDialog } from '@/components/AddCompetitorDialog';
import { CompetitorCard } from '@/components/CompetitorCard';
import { Toaster } from 'sonner';

interface Competitor {
  _id: string;
  name: string;
  url: string;
  logo?: string;
  lastScannedAt?: string;
  updatedAt: string;
}

import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CalendarDays, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

// ... imports

interface EmailLog {
  _id: string;
  subject: string;
  recipient: string;
  status: 'sent' | 'failed';
  content: string;
  sentAt: string;
}

export default function Dashboard() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningAll, setScanningAll] = useState(false);
  const [latestEmail, setLatestEmail] = useState<EmailLog | null>(null);

  const fetchCompetitors = async () => {
    try {
      const res = await fetch('/api/competitors');
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data);
      }
    } catch (error) {
      console.error('Failed to load competitors', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestEmail = async () => {
      try {
          const res = await fetch('/api/emails');
          if (res.ok) {
              const data = await res.json();
              if (data && data.length > 0) {
                  setLatestEmail(data[0]);
              }
          }
      } catch (error) {
          console.error("Failed to fetch latest email", error);
      }
  }

  useEffect(() => {
    fetchCompetitors();
    fetchLatestEmail();
  }, []);

  const handleScanAll = async () => {
    // ... existing handleScanAll logic ...
    setScanningAll(true);
    try {
        const res = await fetch('/api/scan/all', {
            method: 'POST',
        });
        if (!res.ok) throw new Error('Bulk scan failed');
        const data = await res.json();
        toast.success(data.summary || 'Bulk scan completed');
        fetchCompetitors();
        fetchLatestEmail(); // Refresh email after scan
    } catch (error) {
        toast.error('Failed to perform bulk scan');
    } finally {
        setScanningAll(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-6 relative overflow-hidden flex flex-col h-screen">
      {/* Mesh Gradient Background reused from global css but can be reinforced here if needed, 
          but body global style should handle it. 
      */}
      
      <div className="max-w-[1600px] w-full mx-auto space-y-6 relative z-10 flex flex-col flex-1 h-full">
        <header className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl text-foreground drop-shadow-md">Competitor Watch</h1>
            <p className="text-muted-foreground mt-1 text-base font-medium">Track competitor updates with Gemini AI.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
                onClick={handleScanAll} 
                disabled={scanningAll} 
                className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105"
            >
                {scanningAll ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning All...
                    </>
                ) : (
                    <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Scan All
                    </>
                )}
            </Button>
            <AddCompetitorDialog onCompetitorAdded={fetchCompetitors} />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
            {/* Left Column: Latest Summary (7 cols) */}
            <div className="lg:col-span-8 flex flex-col h-full min-h-0">
                 {latestEmail ? (
                    <Card className="glass-card overflow-hidden border-0 ring-1 ring-white/20 shadow-xl relative flex flex-col h-full">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10 bg-white/40 dark:bg-black/40 backdrop-blur-md border-b border-white/10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                                        Latest Intelligence Briefing
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                        Generated {formatDistanceToNow(new Date(latestEmail.sentAt), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-xs font-mono bg-background/50 px-2 py-1 rounded border border-white/10 text-muted-foreground">
                                    {latestEmail.recipient}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 bg-white/60 dark:bg-black/20 flex-1 overflow-hidden relative">
                            <div className="h-full overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                                <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-h1:text-2xl prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-lg shadow-sm bg-white p-8 rounded-xl border border-border/50 mx-auto max-w-4xl" dangerouslySetInnerHTML={{ __html: latestEmail.content }} />
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="glass-card h-full flex items-center justify-center p-10 border-dashed border-2 border-white/20">
                        <div className="text-center space-y-2 text-muted-foreground">
                            <Mail className="h-10 w-10 mx-auto opacity-20" />
                            <p>No intelligence reports generated yet.</p>
                        </div>
                    </Card>
                )}
            </div>

            {/* Right Column: Competitor List (5 cols) */}
            <div className="lg:col-span-4 flex flex-col h-full min-h-0">
                <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-hide space-y-4">
                     {loading ? (
                        <p className="text-muted-foreground text-center py-10 animate-pulse text-lg">Loading competitors...</p>
                    ) : competitors.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-white/20 rounded-lg bg-white/5">
                        <h3 className="text-xl font-semibold text-foreground">No competitors tracked yet</h3>
                        <p className="text-muted-foreground mb-4">Add your first competitor to start tracking changes.</p>
                        <AddCompetitorDialog onCompetitorAdded={fetchCompetitors} />
                        </div>
                    ) : (
                        competitors.map((comp) => (
                        <CompetitorCard 
                            key={comp._id} 
                            competitor={comp} 
                            onScanComplete={() => { fetchCompetitors(); fetchLatestEmail(); }} 
                        />
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>
      <Toaster />
    </main>
  );
}
