'use client';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Competitor {
  _id: string;
  name: string;
  url: string;
  logo?: string;
  lastScannedAt?: string;
  updatedAt: string;
}

interface CompetitorCardProps {
  competitor: Competitor;
  onScanComplete: () => void;
}

export function CompetitorCard({ competitor, onScanComplete }: CompetitorCardProps) {
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
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
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
           <img 
              src={competitor.logo || `https://logo.clearbit.com/${(() => { try { return new URL(competitor.url).hostname } catch { return '' } })()}`}
              alt={`${competitor.name} logo`}
              className="h-10 w-10 rounded-full object-contain bg-muted p-1 border"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + competitor.name }}
            />
           <CardTitle className="text-xl font-bold">{competitor.name}</CardTitle>
        </div>
        <Link href={`/competitor/${competitor._id}`} className="text-sm text-muted-foreground hover:underline">
          View Details
        </Link>
      </CardHeader>
      <CardContent>
        <a 
          href={competitor.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground truncate hover:underline hover:text-primary transition-colors block"
        >
            {competitor.url}
        </a>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs font-medium">Last Scan:</span>
          {competitor.lastScannedAt ? (
             <Badge variant="outline">{formatDistanceToNow(new Date(competitor.lastScannedAt), { addSuffix: true })}</Badge>
          ) : (
            <Badge variant="secondary">Never</Badge>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleScan} disabled={scanning} className="w-full" variant="outline">
          {scanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            'Scan Now'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
