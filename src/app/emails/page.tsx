'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface EmailLog {
  _id: string;
  subject: string;
  recipient: string;
  status: 'sent' | 'failed';
  error?: string;
  content: string;
  sentAt: string;
}

export default function EmailHistoryPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch('/api/emails');
        if (res.ok) {
            const data = await res.json();
            setLogs(data); 
        }
      } catch (error) {
        console.error("Failed to fetch email logs", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Email History</h2>
      </div>

      <div className="rounded-md border bg-white shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">Loading history...</TableCell>
                </TableRow>
            ) : logs.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">No emails sent yet.</TableCell>
                </TableRow>
            ) : (
                logs.map((log) => (
                    <TableRow key={log._id}>
                        <TableCell className="font-medium whitespace-nowrap">
                            {format(new Date(log.sentAt), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>{log.subject}</TableCell>
                        <TableCell className="text-muted-foreground">{log.recipient}</TableCell>
                        <TableCell>
                            <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                                {log.status}
                            </Badge>
                             {log.error && <p className="text-xs text-red-500 mt-1">{log.error}</p>}
                        </TableCell>
                        <TableCell className="text-right">
                             <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">View Content</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: log.content }} />
                                </DialogContent>
                             </Dialog>
                        </TableCell>
                    </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
