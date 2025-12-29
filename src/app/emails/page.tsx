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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Mail, RefreshCw, XCircle, CheckCircle } from 'lucide-react';

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
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Mail className="h-6 w-6 text-primary" />
                Email History
            </h2>
            <p className="text-sm text-muted-foreground">Log of all daily briefings sent to subscribers.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
        </Button>
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[180px]">Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="text-right">Content</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 opacity-50" />
                                Loading history...
                            </TableCell>
                        </TableRow>
                    ) : logs.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No emails sent yet.</TableCell>
                        </TableRow>
                    ) : (
                        logs.map((log) => (
                            <TableRow key={log._id} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium whitespace-nowrap text-xs text-muted-foreground">
                                    {format(new Date(log.sentAt), 'MMM d, yyyy HH:mm')}
                                </TableCell>
                                <TableCell className="font-medium text-sm">{log.subject}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{log.recipient}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5">
                                        {log.status === 'sent' ? (
                                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                        ) : (
                                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                                        )}
                                        <Badge variant={log.status === 'sent' ? 'secondary' : 'destructive'} className="h-5 px-1.5 text-[10px] font-normal uppercase tracking-wide">
                                            {log.status}
                                        </Badge>
                                    </div>
                                    {log.error && <p className="text-[10px] text-red-500 mt-1 truncate max-w-[150px]">{log.error}</p>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-7 text-xs">View Html</Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                            <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: log.content }} />
                                        </DialogContent>
                                    </Dialog>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </Card>
    </div>
  );
}
