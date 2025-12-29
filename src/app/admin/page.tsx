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

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        <p className="text-muted-foreground">Manage newsletter subscriptions.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Add Subscriber</CardTitle>
                <CardDescription>Manually add an email to the newsletter list.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input 
                        type="email" 
                        placeholder="Email address" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Button onClick={handleSubscribe}>Subscribe</Button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Current Subscribers ({subscribers.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="max-h-[400px] overflow-y-auto rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Joined</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscribers.map((sub) => (
                                <TableRow key={sub._id}>
                                    <TableCell>{sub.email}</TableCell>
                                    <TableCell className="text-right">
                                        {format(new Date(sub.createdAt), 'MMM d, yyyy')}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {subscribers.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center h-20 text-muted-foreground">
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
