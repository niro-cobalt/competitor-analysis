'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { CompetitorCard } from '@/components/CompetitorCard';
import { AddCompetitorDialog } from '@/components/AddCompetitorDialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, Tag, X, Send } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { ManageSubscribersDialog } from '@/components/ManageSubscribersDialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

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
  tags?: string[];
}

export default function DashboardClient({ user }: { user: any }) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningAll, setScanningAll] = useState(false);
  const [sendingSlack, setSendingSlack] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = Array.from(new Set(competitors.flatMap(c => c.tags || []))).sort();

  const filteredCompetitors = selectedTags.length === 0
    ? competitors
    : competitors.filter(c => selectedTags.some(tag => c.tags?.includes(tag)));

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

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

  const handleSendToSlack = async () => {
    setSendingSlack(true);
    try {
      const res = await fetch('/api/slack/send', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send to Slack');
      toast.success(`Report sent to #${data.channel}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send to Slack');
    } finally {
      setSendingSlack(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-6 md:p-10 relative overflow-y-auto w-full">
       <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
              <Breadcrumb className="mb-2">
                <BreadcrumbList>
                    <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
                </Breadcrumb>
             <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Competitor Watch</h1>
             <p className="text-muted-foreground mt-1 text-base">Monitor your market landscape.</p>
          </div>

          <div className="flex items-center gap-3">
             <ManageSubscribersDialog />
             <Button
                variant="outline"
                onClick={handleSendToSlack}
                disabled={sendingSlack}
             >
                {sendingSlack ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                    </>
                ) : (
                    <>
                    <Send className="mr-2 h-4 w-4" />
                    Send to Slack
                    </>
                )}
             </Button>
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

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
        )}

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
                {filteredCompetitors.map((comp) => (
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
