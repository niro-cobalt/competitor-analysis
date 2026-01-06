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

  useEffect(() => {
    fetchCompetitors();
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
    } catch (error) {
        toast.error('Failed to perform bulk scan');
    } finally {
        setScanningAll(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-6 md:p-10 relative overflow-y-auto w-full">
       <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
             <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Competitor Watch</h1>
             <p className="text-muted-foreground mt-1 text-base">Monitor your market landscape.</p>
          </div>

          <div className="flex items-center gap-3">
             <ManageSubscribersDialog />
             <Button 
                onClick={handleScanAll} 
                disabled={scanningAll} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all"
            >
                {scanningAll ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
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

        {loading ? (
             <div className="flex justify-center py-20">
                 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
        ) : competitors.length === 0 ? (
            <div className="text-center py-32 border-2 border-dashed border-muted rounded-xl bg-muted/30">
                <h3 className="text-xl font-semibold text-foreground">No competitors tracked yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto mt-2">Add your first competitor to start tracking changes and receiving AI summaries.</p>
                <AddCompetitorDialog onCompetitorAdded={fetchCompetitors} />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {competitors.map((comp) => (
                    <CompetitorCard 
                        key={comp._id} 
                        competitor={comp} 
                        onScanComplete={fetchCompetitors} 
                    />
                ))}
            </div>
        )}
      <Toaster />
    </main>
  );
}
