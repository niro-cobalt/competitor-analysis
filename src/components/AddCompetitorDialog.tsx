'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';

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
  const [additionalUrls, setAdditionalUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const addUrl = () => {
      if (newUrl && !additionalUrls.includes(newUrl)) {
          setAdditionalUrls([...additionalUrls, newUrl]);
          setNewUrl('');
      }
  };

  const removeUrl = (idx: number) => {
      setAdditionalUrls(additionalUrls.filter((_, i) => i !== idx));
  };

  const addTag = () => {
      if (newTag && !tags.includes(newTag)) {
          setTags([...tags, newTag]);
          setNewTag('');
      }
  };

  const removeTag = (idx: number) => {
      setTags(tags.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, linkedinUrl, twitterUrl, instructions, additionalUrls, tags }),
      });

      if (!res.ok) throw new Error('Failed to add competitor');

      toast.success('Competitor added successfully');
      setOpen(false);
      setName('');
      setUrl('');
      setLinkedinUrl('');
      setTwitterUrl('');
      setInstructions('');
      setAdditionalUrls([]);
      setTags([]);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
          
           {/* Tags Input */}
           <div className="space-y-2">
            <Label>Tags (Optional)</Label>
            <div className="flex gap-2">
                <Input 
                    placeholder="e.g. SaaS, High Priority" 
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                />
                <Button type="button" size="icon" onClick={addTag} variant="outline">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full border border-primary/20">
                            <span>{tag}</span>
                            <button type="button" onClick={() => removeTag(idx)} className="hover:text-destructive">
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn URL (Optional)</Label>
// ... existing inputs
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
            <Label>Additional Monitored Links (Optional)</Label>
            <div className="flex gap-2">
                <Input 
                    placeholder="e.g. Careers Page or CEO LinkedIn" 
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
                />
                <Button type="button" size="icon" onClick={addUrl} variant="outline">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            {additionalUrls.length > 0 && (
                <ul className="space-y-2 mt-2">
                    {additionalUrls.map((link, idx) => (
                        <li key={idx} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                            <span className="truncate flex-1 mr-2">{link}</span>
                            <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeUrl(idx)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
            <p className="text-[10px] text-muted-foreground">Add specific pages like "Newsroom", "Pricing", or key executive profiles.</p>
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
