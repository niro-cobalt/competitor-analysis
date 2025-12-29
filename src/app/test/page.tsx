'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

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
    <div className="p-8">
      <div className="flex items-center justify-between space-y-2 mb-8">
        <h2 className="text-3xl font-bold tracking-tight">System Tests</h2>
        <div className="flex items-center space-x-2">
            
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader>
                <CardTitle>Global Scan</CardTitle>
                <CardDescription>Trigger a scan for all competitors in the database.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleScanAll} disabled={loading} className="w-full">
                    {loading ? 'Scanning...' : 'Scan All Competitors'}
                </Button>
            </CardContent>
        </Card>
      </div>

      {results && (
        <div className="mt-8 space-y-4">
            <h3 className="text-xl font-bold">Results</h3>
            
            {results.results && results.results.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-green-600">Success</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-5">
                            {results.results.map((r: any, idx: number) => (
                                <li key={idx}><strong>{r.competitor}</strong>: Scan ID {r.scanId}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {results.errors && results.errors.length > 0 && (
                <Card>
                    <CardHeader>
                         <CardTitle className="text-red-600">Failures</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-5">
                            {results.errors.map((e: any, idx: number) => (
                                <li key={idx}><strong>{e.competitor}</strong>: {e.error}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
      )}
    </div>
  );
}
