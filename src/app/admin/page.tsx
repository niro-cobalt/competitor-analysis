'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Subscriber {
  _id: string;
  email: string;
  createdAt: string;
}

import { ShieldCheck, UserPlus, Users, Trash2 } from 'lucide-react';

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscribers = async () => {
    try {
      const res = await fetch('/api/subscribers');
      if (res.ok) {
        setSubscribers(await res.json());
      }
    } catch (error) {
       console.error(error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const handleSubscribe = async () => {
    if (!email) return;

    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        toast.success('Subscribed successfully');
        setEmail('');
        fetchSubscribers();
      } else {
         toast.error('Failed to subscribe');
      }
    } catch (error) {
      toast.error('Error subscribing');
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

        if (res.ok) {
            toast.success('Subscriber removed');
            fetchSubscribers();
        } else {
            toast.error('Failed to remove subscriber');
        }
    } catch (error) {
        toast.error('Error removing subscriber');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
         <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                Admin Dashboard
            </h2>
            <p className="text-sm text-muted-foreground">Manage newsletter subscriptions and system settings.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card border-white/20">
            <CardHeader className="relative z-10 pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-primary">
                    <UserPlus className="h-4 w-4" />
                    Add Subscriber
                </CardTitle>
                <CardDescription>Manually add an email to the newsletter list.</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input 
                        type="email" 
                        placeholder="Email address" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-white/50 border-white/30 focus:bg-white/80 transition-all dark:bg-black/20"
                    />
                    <Button onClick={handleSubscribe} className="shadow-md shrink-0">Subscribe</Button>
                </div>
            </CardContent>
        </Card>

        <Card className="glass-card border-white/20 h-full">
            <CardHeader className="relative z-10 pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-primary">
                    <Users className="h-4 w-4" />
                    Current Subscribers ({subscribers.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 p-0">
                <div className="max-h-[350px] overflow-y-auto border-t border-white/10 scrollbar-thin scrollbar-thumb-primary/10">
                    <Table>
                        <TableHeader className="bg-white/20 backdrop-blur-sm sticky top-0 z-10">
                            <TableRow className="hover:bg-transparent border-white/10">
                                <TableHead className="text-foreground/80 font-semibold h-10 text-xs uppercase tracking-wider">Email</TableHead>
                                <TableHead className="text-right text-foreground/80 font-semibold h-10 text-xs uppercase tracking-wider">Joined</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscribers.map((sub) => (
                                <TableRow key={sub._id} className="hover:bg-white/20 border-white/10 transition-colors">
                                    <TableCell className="font-medium text-sm py-2.5">{sub.email}</TableCell>
                                    <TableCell className="text-right text-muted-foreground text-xs py-2.5">
                                        {format(new Date(sub.createdAt), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right py-2.5">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                            onClick={() => handleDelete(sub.email)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {subscribers.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground text-sm">
                                        No subscribers yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
