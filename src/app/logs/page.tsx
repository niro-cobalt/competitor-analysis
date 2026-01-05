'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, isToday, isYesterday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FileText, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Log {
  _id: string;
  competitorName: string;
  status: 'success' | 'failed';
  scannedAt: string;
  durationMs: number;
  changesDetected: number;
  error?: string;
}

type GroupBy = 'none' | 'date' | 'competitor' | 'status';
type SortKey = 'scannedAt' | 'changesDetected';
type SortDirection = 'asc' | 'desc';

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ 
      key: 'scannedAt', 
      direction: 'desc' 
  });

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

  const handleSort = (key: SortKey) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
      }));
  };

  const processedLogs = useMemo(() => {
    let sorted = [...logs].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'scannedAt') {
             aValue = new Date(a.scannedAt).getTime();
             bValue = new Date(b.scannedAt).getTime();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    if (groupBy === 'none') return { 'All Logs': sorted };

    const grouped: Record<string, Log[]> = {};
    
    sorted.forEach(log => {
        let key = '';
        if (groupBy === 'date') {
            const date = new Date(log.scannedAt);
            if (isToday(date)) key = 'Today';
            else if (isYesterday(date)) key = 'Yesterday';
            else key = format(date, 'MMM d, yyyy');
        } else if (groupBy === 'competitor') {
            key = log.competitorName;
        } else if (groupBy === 'status') {
            key = log.status.toUpperCase();
        }
        
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(log);
    });

    return grouped;
  }, [logs, groupBy, sortConfig]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
         <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Execution Logs
            </h2>
            <p className="text-sm text-muted-foreground">Detailed record of all competitor scanning activities.</p>
        </div>
        
        <div className="flex items-center gap-2">
             <div className="flex items-center gap-2 bg-background border rounded-md px-2 py-1">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Group by:</span>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                    <SelectTrigger className="h-8 w-[130px] border-0 shadow-none focus:ring-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="competitor">Competitor</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
            </Button>
        </div>
      </div>

      <div className="space-y-8">
        {loading ? (
             <Card className="p-12 text-center text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 opacity-50" />
                Loading logs...
            </Card>
        ) : Object.entries(processedLogs).map(([group, groupLogs]) => (
            <div key={group} className="space-y-3">
                {groupBy !== 'none' && (
                    <div className="flex items-center gap-2 pl-1">
                        <div className="h-6 w-1 bg-primary rounded-full" />
                        <h3 className="font-semibold text-lg">{group}</h3>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] rounded-full px-2">
                            {groupLogs.length}
                        </Badge>
                    </div>
                )}
                
                <Card className="overflow-hidden border-border/60 shadow-sm">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead className="w-[180px]">
                                    Date
                                </TableHead>
                                <TableHead>Competitor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Duration</TableHead>
                                <TableHead 
                                    className="text-right cursor-pointer hover:bg-muted/50 transition-colors select-none group"
                                    onClick={() => handleSort('changesDetected')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Changes
                                        {sortConfig.key === 'changesDetected' && (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                        )}
                                    </div>
                                </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupLogs.map((log) => (
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
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        ))}
        {!loading && logs.length === 0 && (
             <Card className="p-12 text-center text-muted-foreground border-dashed">
                No logs found.
            </Card>
        )}
      </div>
    </div>
  );
}
