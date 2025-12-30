'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2, Plus, Users } from 'lucide-react';

interface Subscriber {
  _id: string;
  email: string;
  createdAt: string;
}

export function ManageSubscribersDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subscribers');
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data);
      }
    } catch (error) {
      console.error('Failed to load subscribers', error);
      toast.error('Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSubscribers();
    }
  }, [open]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    setAdding(true);
    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });

      if (!res.ok) throw new Error('Failed to add');

      toast.success('Subscriber added');
      setNewEmail('');
      fetchSubscribers();
    } catch (error) {
      toast.error('Failed to add subscriber');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`Are you sure you want to remove ${email}?`)) return;

    try {
      const res = await fetch('/api/subscribers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error('Failed to delete');

      toast.success('Subscriber removed');
      fetchSubscribers();
    } catch (error) {
      toast.error('Failed to remove subscriber');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            Manage Subscribers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Mailing List</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
            {/* Add New */}
            <form onSubmit={handleAdd} className="flex gap-2 items-end">
                <div className="grid w-full gap-1.5">
                    <Label htmlFor="email">Add Subscriber</Label>
                    <Input 
                        id="email" 
                        type="email" 
                        placeholder="email@example.com" 
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                    />
                </div>
                <Button type="submit" disabled={adding}>
                    {adding ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Plus className="h-4 w-4" />}
                </Button>
            </form>

            <div className="border-t pt-4">
                <Label className="mb-2 block">Current Subscribers ({subscribers.length})</Label>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                    {loading && subscribers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
                    ) : subscribers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No subscribers yet.</p>
                    ) : (
                        subscribers.map((sub) => (
                            <div key={sub._id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 border">
                                <span className="text-sm truncate max-w-[250px]">{sub.email}</span>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                    onClick={() => handleDelete(sub.email)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
