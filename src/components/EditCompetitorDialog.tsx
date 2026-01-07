'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pencil, Plus, X } from 'lucide-react';

interface Competitor {
    _id: string;
    name: string;
    url: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    instructions?: string;
    additionalUrls?: string[];
    tags?: string[];
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
  const [twitterUrl, setTwitterUrl] = useState(competitor.twitterUrl || '');
  const [instructions, setInstructions] = useState(competitor.instructions || '');
  const [additionalUrls, setAdditionalUrls] = useState<string[]>(competitor.additionalUrls || []);
  const [newUrl, setNewUrl] = useState('');
  const [tags, setTags] = useState<string[]>(competitor.tags || []);
  const [newTag, setNewTag] = useState('');

  // Reset form when dialog opens/competitor changes
  useEffect(() => {
      if (open) {
          setName(competitor.name);
          setUrl(competitor.url);
          setLinkedinUrl(competitor.linkedinUrl || '');
          setTwitterUrl(competitor.twitterUrl || '');
          setInstructions(competitor.instructions || '');
          setAdditionalUrls(competitor.additionalUrls || []);
          setTags(competitor.tags || []);
      }
  }, [open, competitor]);

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
      const res = await fetch(`/api/competitors/${competitor._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, linkedinUrl, twitterUrl, instructions, additionalUrls, tags }),
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
            <Label htmlFor="edit-twitterUrl">X URL (Optional)</Label>
            <Input 
              id="edit-twitterUrl" 
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
