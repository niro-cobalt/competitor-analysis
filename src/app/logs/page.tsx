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
import { Card } from '@/components/ui/card';
import { FileText, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Log {
  _id: string;
  competitorName: string;
  status: 'success' | 'failed';
  scannedAt: string;
  durationMs: number;
  changesDetected: number;
  error?: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs');
        if (res.ok) setLogs(await res.json());
      } catch (error) {
        console.error("Failed to fetch logs", error);
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
                <FileText className="h-6 w-6 text-primary" />
                Execution Logs
            </h2>
            <p className="text-sm text-muted-foreground">Detailed record of all competitor scanning activities.</p>
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
                    <TableHead>Competitor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Changes</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 opacity-50" />
                                Loading logs...
                            </TableCell>
                        </TableRow>
                    ) : logs.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No logs found.</TableCell>
                        </TableRow>
                    ) : (
                        logs.map((log) => (
                            <TableRow key={log._id} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium whitespace-nowrap text-xs text-muted-foreground">
                                    {format(new Date(log.scannedAt), 'MMM d, yyyy HH:mm:ss')}
                                </TableCell>
                                <TableCell className="font-medium text-sm">{log.competitorName}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5">
                                        {log.status === 'success' ? (
                                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                        ) : (
                                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                                        )}
                                        <Badge variant={log.status === 'success' ? 'secondary' : 'destructive'} className="h-5 px-1.5 text-[10px] font-normal uppercase tracking-wide">
                                            {log.status}
                                        </Badge>
                                    </div>
                                    {log.error && <p className="text-[10px] text-red-500 mt-1 truncate max-w-[200px]">{log.error}</p>}
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground font-mono">
                                    {(log.durationMs / 1000).toFixed(2)}s
                                </TableCell>
                                <TableCell className="text-right">
                                    {log.changesDetected > 0 ? (
                                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">{log.changesDetected} changes</Badge>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">-</span>
                                    )}
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
