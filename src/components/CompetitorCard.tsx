'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { EditCompetitorDialog } from '@/components/EditCompetitorDialog';
import { Loader2, RefreshCw, Zap, ArrowUpRight, Linkedin, FileText, Info, Pencil } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Custom X icon component since generic Lucide might vary or user wants specific branding
const XIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <title>X</title>
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
);


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

interface CompetitorCardProps {
  competitor: Competitor;
  onScanComplete: () => void;
}

// Simple hash for consistent tag colors
const getTagColor = (tag: string) => {
    const colors = [
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
        "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
        "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
        "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800",
        "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
        "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export function CompetitorCard({ competitor, onScanComplete }: CompetitorCardProps) {
  const [scanning, setScanning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    // Fetch latest summary
    const fetchSummary = async () => {
        try {
            const res = await fetch(`/api/competitors/${competitor._id}/summary`);
            if (res.ok) {
                const data = await res.json();
                if (data.summary) {
                    setSummary(data.summary);
                } else {
                    // Try to generate if missing
                    generateSummary();
                }
            }
        } catch (e) { console.error('Error fetching summary', e); }
    };
    fetchSummary();
  }, [competitor._id]);

  const generateSummary = async () => {
      setLoadingSummary(true);
      try {
          const res = await fetch(`/api/competitors/${competitor._id}/summary`, { method: 'POST' });
          if (res.ok) {
              const data = await res.json();
              setSummary(data.summary);
          }
      } catch (e) { console.error('Error generating summary', e); }
      finally { setLoadingSummary(false); }
  }

  const handleScan = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setScanning(true);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorId: competitor._id }),
      });

      if (!res.ok) throw new Error('Scan failed');

      toast.success('Scan completed');
      onScanComplete();
      // Regenerate summary after scan
      generateSummary();
    } catch (error) {
        toast.error('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  return (
    <Card className="flex flex-col h-full bg-card border-border shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Header: Logo, Name, Links */}
        <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 w-full">
                <div className="h-12 w-12 shrink-0 rounded-lg bg-background border border-border shadow-sm flex items-center justify-center p-2 overflow-hidden">
                    <img 
                        src={competitor.logo || `https://logo.clearbit.com/${(() => { try { return new URL(competitor.url).hostname } catch { return '' } })()}`}
                        alt={`${competitor.name} logo`}
                        className="h-full w-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + competitor.name + '&background=random' }}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between w-full">
                         <h3 className="font-semibold text-lg hover:text-primary transition-colors truncate pr-2">
                            <Link href={`/competitor/${competitor._id}`}>
                                {competitor.name}
                            </Link>
                        </h3>
                        <EditCompetitorDialog 
                            competitor={competitor} 
                            onCompetitorUpdated={onScanComplete} 
                        />
                    </div>
                   
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 mb-2">
                        <a href={competitor.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline truncate max-w-[150px]">
                            {new URL(competitor.url).hostname}
                        </a>
                         {/* Social Links Small */}
                         <div className="flex gap-2 border-l pl-2 border-border/50">
                             {competitor.linkedinUrl && (
                                <a href={competitor.linkedinUrl} target="_blank" className="hover:text-[#0077b5]"><Linkedin className="h-3.5 w-3.5" /></a>
                             )}
                             {competitor.twitterUrl && (
                                <a href={competitor.twitterUrl} target="_blank" className="hover:text-foreground"><XIcon className="h-3.5 w-3.5" /></a>
                             )}
                        </div>
                    </div>

                     {/* Tags */}
                     {competitor.tags && competitor.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {competitor.tags.map((tag) => (
                                <span 
                                    key={tag} 
                                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getTagColor(tag)}`}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Weekly Summary */}
        <div className="bg-muted/30 rounded-lg p-3 border border-dashed border-border flex-1">
             <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                 <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
                 Weekly Update
             </div>
             
             {loadingSummary ? (
                 <div className="space-y-2 animate-pulse">
                     <div className="h-3 bg-muted rounded w-full"></div>
                     <div className="h-3 bg-muted rounded w-5/6"></div>
                     <div className="h-3 bg-muted rounded w-2/3"></div>
                 </div>
             ) : summary ? (
                 <p className="text-sm leading-relaxed text-foreground/80">
                     {summary}
                 </p>
             ) : (
                <p className="text-xs text-muted-foreground italic">
                    No significant updates recorded yet.
                </p>
             )}
        </div>
      </div>

      {/* Footer: Actions */}
      <div className="bg-muted/20 border-t border-border p-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
             {competitor.lastScannedAt ? (
                 <>Updated {formatDistanceToNow(new Date(competitor.lastScannedAt), { addSuffix: true })}</>
             ) : 'Never scanned'}
          </span>
          <Button 
                onClick={handleScan} 
                disabled={scanning} 
                size="sm"
                variant="default"
                className="h-8 text-xs font-medium"
            >
              {scanning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Scanning
                  </>
              ) : (
                    <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Scan Now
                    </>
              )}
            </Button>
      </div>
    </Card>
  );
}
