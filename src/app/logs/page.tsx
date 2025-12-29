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

interface Log {
  _id: string;
  competitorId: {
    _id: string;
    name: string;
    url: string;
  };
  createdAt: string;
  impactScore: number;
  summary: string;
  changesDetected: string[];
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs');
        if (res.ok) {
            const data = await res.json();
            // Handle case where some fields might be missing if API changes
            setLogs(data); 
        }
      } catch (error) {
        console.error("Failed to fetch logs", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Execution Logs</h2>
      </div>

      <div className="rounded-md border bg-white shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Competitor</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead className="text-right">Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">Loading logs...</TableCell>
                </TableRow>
            ) : logs.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">No logs found.</TableCell>
                </TableRow>
            ) : (
                logs.map((log) => (
                    <TableRow key={log._id}>
                        <TableCell className="font-medium">
                            {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                            {log.competitorId?.name || 'Unknown'} 
                            <br/>
                            <span className="text-xs text-muted-foreground">{log.competitorId?.url}</span>
                        </TableCell>
                        <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                log.impactScore >= 7 ? 'bg-red-100 text-red-800' :
                                log.impactScore >= 4 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                            }`}>
                                {log.impactScore}
                            </span>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={log.summary}>
                            {log.summary}
                        </TableCell>
                        <TableCell className="text-right">
                            {log.changesDetected.length}
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
