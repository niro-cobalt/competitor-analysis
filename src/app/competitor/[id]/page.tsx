'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Competitor {
  _id: string;
  name: string;
  url: string;
  lastScannedAt?: string;
}

interface Scan {
  _id: string;
  scannedAt: string;
  summary: string;
  changesDetected: string[];
  impactScore: number;
  status?: string;
}

export default function CompetitorDetails() {
  const params = useParams();
  const id = params.id as string;
  
  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [compRes, scansRes] = await Promise.all([
          fetch(`/api/competitors/${id}`),
          fetch(`/api/competitors/${id}/scans`)
        ]);

        if (compRes.ok) {
          setCompetitor(await compRes.json());
        }
        if (scansRes.ok) {
          const allScans: Scan[] = await scansRes.json();
          // Filter out failed scans for the history view
          setScans(allScans.filter(s => s.status !== 'failed'));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      loadData();
    }
  }, [id]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  if (!competitor) {
    return <div className="p-8">Competitor not found</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
        
        <header className="border-b pb-6">
          <h1 className="text-3xl font-bold">{competitor.name}</h1>
          <a href={competitor.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            {competitor.url}
          </a>
        </header>

        <section>
          <h2 className="text-xl font-semibold mb-4">Update History</h2>
          <div className="space-y-6">
            {scans.length === 0 ? (
               <p className="text-muted-foreground">No scans yet.</p>
            ) : (
              scans.map((scan) => (
                <Card key={scan._id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                         <CardTitle className="text-lg">
                           Scan Report - {format(new Date(scan.scannedAt), 'PPP p')}
                         </CardTitle>
                         <CardDescription>
                           Impact Score: <Badge variant={scan.impactScore > 5 ? 'destructive' : 'secondary'}>{scan.impactScore}/10</Badge>
                         </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-1 text-sm uppercase tracking-wide text-muted-foreground">Summary</h4>
                      <p className="text-sm leading-relaxed">{scan.summary}</p>
                    </div>
                    
                    {scan.changesDetected.length > 0 && (
                      <div>
                        <Separator className="my-3"/>
                        <h4 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">Detected Changes</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm bg-muted/50 p-4 rounded-md">
                          {scan.changesDetected.map((change, idx) => (
                            <li key={idx} className="leading-relaxed">{change}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
