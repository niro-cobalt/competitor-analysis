'use client';

import { useEffect, useState } from 'react';
import { AddCompetitorDialog } from '@/components/AddCompetitorDialog';
import { ManageSubscribersDialog } from '@/components/ManageSubscribersDialog';
import { CompetitorCard } from '@/components/CompetitorCard';
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Competitor {
  _id: string;
  name: string;
  url: string;
  logo?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  instructions?: string;
  lastScannedAt?: string;
  updatedAt: string;
}

interface EmailLog {
  _id: string;
  subject: string;
  recipient: string;
  status: 'sent' | 'failed';
  content: string;
  structuredData?: Array<{
    competitor: string;
    summary: string;
    changes: string[];
    impactScore: number;
  }>;
  sentAt: string;
}

export default function DashboardClient({ user }: { user: any }) {
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
    setScanningAll(true);
    try {
        const res = await fetch('/api/scan/all', {
            method: 'POST',
        });
        if (!res.ok) throw new Error('Bulk scan failed');
        const data = await res.json();
        toast.success(data.summary || 'Bulk scan completed');
        fetchCompetitors();
        fetchLatestEmail(); 
    } catch (error) {
        toast.error('Failed to perform bulk scan');
    } finally {
        setScanningAll(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-6 relative overflow-hidden flex flex-col h-screen">
       <header className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
             <div>
                <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl text-foreground drop-shadow-md">Competitor Watch</h1>
                <p className="text-muted-foreground mt-1 text-base font-medium">Track competitor updates with Gemini AI.</p>
             </div>
          </div>

          <div className="flex items-center gap-3">
             <ManageSubscribersDialog />
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 mt-6">
            {/* Left Column: Latest Summary (7 cols) */}
            <div className="lg:col-span-8 flex flex-col h-full min-h-0">
                {latestEmail ? (
                    <div className="flex flex-col h-full relative group">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <div className="flex items-baseline gap-3">
                                <h2 className="text-xl font-bold tracking-tight text-foreground/80 group-hover:text-primary transition-colors">
                                    Latest Intelligence
                                </h2>
                                <span className="text-xs text-muted-foreground font-medium">
                                    {formatDistanceToNow(new Date(latestEmail.sentAt), { addSuffix: true })}
                                </span>
                            </div>
                            <div className="p-1 rounded-full bg-primary/5 text-primary/50">
                                <Mail className="h-4 w-4" />
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-hidden relative rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors">
                             <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                                <div className="p-4 space-y-4">
                                    {latestEmail.structuredData ? (
                                        latestEmail.structuredData.map((item, idx) => (
                                            <div key={idx} className="p-4 rounded-lg bg-black/20 border border-white/5 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-bold text-lg text-foreground">{item.competitor}</h3>
                                                    {item.impactScore > 0 && (
                                                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                                            Impact: {item.impactScore}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
                                                {item.changes && item.changes.length > 0 && (
                                                    <div className="mt-2 pl-3 border-l-2 border-primary/30">
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {item.changes.map((change, cIdx) => (
                                                                <li key={cIdx} className="text-xs text-foreground/80">{change}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div 
                                            className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-md bg-transparent" 
                                            dangerouslySetInnerHTML={{ __html: latestEmail.content }} 
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-10 border-2 border-dashed border-white/10 rounded-xl text-muted-foreground">
                        <Mail className="h-10 w-10 mb-2 opacity-20" />
                        <p>No intelligence reports generated yet.</p>
                    </div>
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
      <Toaster />
    </main>
  );
}
