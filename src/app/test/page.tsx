'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { FlaskConical, Play, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TestPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleScanAll = async () => {
    setLoading(true);
    setResults(null);
    try {
      const response = await fetch('/api/scan/all', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan');
      }

      setResults(data);
      toast.success(data.summary || 'Scan complete');
    } catch (error) {
      console.error(error);
      toast.error('Scan failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
         <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <FlaskConical className="h-6 w-6 text-primary" />
                System Tests
            </h2>
            <p className="text-sm text-muted-foreground">Tools to manually trigger system functions and verify integrations.</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border-white/20">
            <CardHeader className="relative z-10 pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-primary">
                    <Play className="h-4 w-4" />
                    Global Scan
                </CardTitle>
                <CardDescription>Trigger a scan for all competitors in the database.</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
                <Button onClick={handleScanAll} disabled={loading} className="w-full shadow-md">
                    {loading ? 'Scanning...' : 'Scan All Competitors'}
                </Button>
            </CardContent>
        </Card>
      </div>

      {results && (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Results</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {new Date().toLocaleTimeString()}
                </span>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
                {results.results && results.results.length > 0 && (
                    <Card className="glass-card border-white/20 border-l-4 border-l-green-500">
                        <CardHeader className="relative z-10 pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                Success ({results.results.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="max-h-[300px] overflow-y-auto rounded-md bg-white/40 border border-white/20 p-2 scrollbar-thin">
                                <ul className="list-none space-y-1">
                                    {results.results.map((r: any, idx: number) => (
                                        <li key={idx} className="text-xs px-2 py-1.5 rounded hover:bg-white/40 flex justify-between items-center">
                                            <span className="font-medium text-foreground">{r.competitor}</span> 
                                            <span className="text-muted-foreground font-mono bg-white/50 px-1 rounded">ID: {r.scanId}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {results.errors && results.errors.length > 0 && (
                    <Card className="glass-card border-white/20 border-l-4 border-l-red-500">
                        <CardHeader className="relative z-10 pb-2">
                             <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                Failures ({results.errors.length})
                             </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="max-h-[300px] overflow-y-auto rounded-md bg-red-500/5 border border-red-500/10 p-2 scrollbar-thin">
                                 <ul className="list-none space-y-1">
                                    {results.errors.map((e: any, idx: number) => (
                                        <li key={idx} className="text-xs px-2 py-1.5 rounded hover:bg-red-500/10 text-red-700 dark:text-red-300 flex flex-col gap-1">
                                            <span className="font-bold">{e.competitor}</span>
                                            <span className="opacity-80">{e.error}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
      )}
    </div>
  );
}
