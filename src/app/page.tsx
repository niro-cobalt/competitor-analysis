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

export default function Dashboard() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Competitor Watch</h1>
            <p className="text-muted-foreground mt-2">Track competitor updates with Gemini AI.</p>
          </div>
          <AddCompetitorDialog onCompetitorAdded={fetchCompetitors} />
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <p className="text-muted-foreground col-span-full text-center py-10">Loading competitors...</p>
          ) : competitors.length === 0 ? (
            <div className="col-span-full text-center py-20 border-2 border-dashed rounded-lg">
              <h3 className="text-xl font-semibold">No competitors tracked yet</h3>
              <p className="text-muted-foreground mb-4">Add your first competitor to start tracking changes.</p>
              <AddCompetitorDialog onCompetitorAdded={fetchCompetitors} />
            </div>
          ) : (
            competitors.map((comp) => (
              <CompetitorCard 
                key={comp._id} 
                competitor={comp} 
                onScanComplete={fetchCompetitors} 
              />
            ))
          )}
        </div>
      </div>
      <Toaster />
    </main>
  );
}
