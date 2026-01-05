'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AddCompetitorDialogProps {
  onCompetitorAdded: () => void;
}

export function AddCompetitorDialog({ onCompetitorAdded }: AddCompetitorDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [instructions, setInstructions] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, linkedinUrl, twitterUrl, instructions }),
      });

      if (!res.ok) throw new Error('Failed to add competitor');

      toast.success('Competitor added successfully');
      setOpen(false);
      setName('');
      setUrl('');
      setLinkedinUrl('');
      setTwitterUrl('');
      setInstructions('');
      onCompetitorAdded();
    } catch (error) {
      toast.error('Error adding competitor');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Competitor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track New Competitor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name" 
              placeholder="Example Corp" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <Input 
              id="url" 
              type="url" 
              placeholder="https://example.com" 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn URL (Optional)</Label>
            <Input 
              id="linkedinUrl" 
              type="url" 
              placeholder="https://linkedin.com/company/example" 
              value={linkedinUrl} 
              onChange={(e) => setLinkedinUrl(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twitterUrl">X URL (Optional)</Label>
            <Input 
              id="twitterUrl" 
              type="url" 
              placeholder="https://x.com/example" 
              value={twitterUrl} 
              onChange={(e) => setTwitterUrl(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructions">Analysis Instructions (Optional)</Label>
            <textarea 
              id="instructions" 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="E.g. Focus on pricing changes only, or ignore blog posts."
              value={instructions} 
              onChange={(e) => setInstructions(e.target.value)} 
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Adding...' : 'Start Tracking'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
