'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';
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
}

interface CompetitorCardProps {
  competitor: Competitor;
  onScanComplete: () => void;
}

export function CompetitorCard({ competitor, onScanComplete }: CompetitorCardProps) {
  const [scanning, setScanning] = useState(false);

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
    } catch (error) {
      toast.error('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  return (
    <Card className="glass-card group relative border-0 ring-1 ring-white/10 hover:ring-primary/50 transition-all duration-300 hover:bg-white/50 dark:hover:bg-white/10 overflow-hidden">
       {/* Subtle left border gradient only on hover */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="p-3 flex items-center gap-3">
        {/* Logo - Compact */}
        <div className="relative h-10 w-10 shrink-0 rounded-lg bg-white/80 dark:bg-black/40 shadow-sm ring-1 ring-white/20 flex items-center justify-center p-1.5 overflow-hidden">
             <img 
                src={competitor.logo || `https://logo.clearbit.com/${(() => { try { return new URL(competitor.url).hostname } catch { return '' } })()}`}
                alt={`${competitor.name} logo`}
                className="h-full w-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + competitor.name + '&background=random' }}
            />
        </div>

        {/* Content - Compact rows */}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-0.5">
                <Link href={`/competitor/${competitor._id}`} className="font-semibold text-sm hover:text-primary truncate flex items-center gap-1 group/title">
                    {competitor.name}
                    <ArrowUpRight className="h-3 w-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover/title:opacity-100 transition-all" />
                </Link>
                <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1 font-medium bg-white/20 px-1.5 py-0.5 rounded-full">
                    {competitor.lastScannedAt ? formatDistanceToNow(new Date(competitor.lastScannedAt), { addSuffix: true }) : 'Never scanned'}
                </span>
            </div>
            
             <div className="flex items-center gap-3 mt-1">
                 <a href={competitor.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary truncate transition-colors flex items-center gap-1">
                    {new URL(competitor.url).hostname}
                 </a>
                 
                 {competitor.linkedinUrl && (
                     <a href={competitor.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#0077b5] transition-colors">
                         <Linkedin className="h-3.5 w-3.5" />
                     </a>
                 )}

                 {competitor.twitterUrl && (
                     <a href={competitor.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                         <XIcon className="h-3 w-3" />
                     </a>
                 )}
             </div>

             {competitor.instructions && (
                 <div className="mt-2 flex items-start gap-1.5 text-[10px] text-muted-foreground bg-secondary/30 p-2 rounded-md border border-white/5">
                    <FileText className="h-3 w-3 shrink-0 text-amber-500/70 mt-0.5" />
                    <div>Instructions:</div>
                    <div className="line-clamp-2 leading-relaxed">{competitor.instructions}</div>
                 </div>
             )}
        </div>

        {/* Actions - Compact */}
        <div className="flex items-center gap-1">
             <EditCompetitorDialog 
                competitor={competitor} 
                onCompetitorUpdated={onScanComplete} 
             />
             <Button 
                onClick={handleScan} 
                disabled={scanning} 
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 rounded-full hover:bg-primary/20 text-muted-foreground hover:text-primary"
                title="Run Intelligence Scan"
            >
              {scanning ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                    <RefreshCw className="h-4 w-4" />
              )}
            </Button>
        </div>
      </div>
    </Card>
  );
}
