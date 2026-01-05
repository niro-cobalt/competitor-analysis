'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

interface Competitor {
    _id: string;
    name: string;
    url: string;
    linkedinUrl?: string;
    instructions?: string;
}

interface EditCompetitorDialogProps {
  competitor: Competitor;
  onCompetitorUpdated: () => void;
}

export function EditCompetitorDialog({ competitor, onCompetitorUpdated }: EditCompetitorDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(competitor.name);
  const [url, setUrl] = useState(competitor.url);
  const [linkedinUrl, setLinkedinUrl] = useState(competitor.linkedinUrl || '');
  const [instructions, setInstructions] = useState(competitor.instructions || '');

  // Reset form when dialog opens/competitor changes
  useEffect(() => {
      if (open) {
          setName(competitor.name);
          setUrl(competitor.url);
          setLinkedinUrl(competitor.linkedinUrl || '');
          setInstructions(competitor.instructions || '');
      }
  }, [open, competitor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/competitors/${competitor._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, linkedinUrl, instructions }),
      });

      if (!res.ok) throw new Error('Failed to update competitor');

      toast.success('Competitor updated successfully');
      setOpen(false);
      onCompetitorUpdated();
    } catch (error) {
      toast.error('Error updating competitor');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 shrink-0 rounded-full hover:bg-primary/20 text-muted-foreground hover:text-primary"
            title="Edit Competitor Details"
        >
            <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Competitor Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input 
              id="edit-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-url">Website URL</Label>
            <Input 
              id="edit-url" 
              type="url" 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-linkedinUrl">LinkedIn URL (Optional)</Label>
            <Input 
              id="edit-linkedinUrl" 
              type="url" 
              placeholder="https://linkedin.com/company/example" 
              value={linkedinUrl} 
              onChange={(e) => setLinkedinUrl(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-instructions">Analysis Instructions (Optional)</Label>
            <textarea 
              id="edit-instructions" 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="E.g. Focus on pricing changes only..."
              value={instructions} 
              onChange={(e) => setInstructions(e.target.value)} 
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
