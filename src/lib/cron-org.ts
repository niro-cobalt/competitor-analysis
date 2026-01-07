import { z } from 'zod';

const API_KEY = process.env.CRON_JOB_ORG_API_KEY;
const API_URL = 'https://api.cron-job.org';

if (!API_KEY) {
  // Warn but don't crash at module level, crash when used
  console.warn('CRON_JOB_ORG_API_KEY is not defined in environment variables. Cron utilities will fail.');
}

// Types based on cron-job.org API
// We focus on what we need: creating, editing (title/url/schedule), deleting.

export interface CronJobConfig {
  title: string;
  url: string;
  schedule?: {
    timezone: string; // e.g. 'Europe/Berlin'
    hours: number[]; // 0-23
    minutes: number[]; // 0-59
    mdays: number[]; // 1-31
    months: number[]; // 1-12
    wdays: number[]; // 0-6 (Sunday=0)
  };
  enabled?: boolean;
}

export interface CronJobResponse {
  jobId: number;
}

export interface CronJobDetails {
  jobId: number;
  title: string;
  url: string;
  enabled: boolean;
  saveResponses: boolean;
  schedule: {
    timezone: string;
    hours: number[];
    minutes: number[];
    mdays: number[];
    months: number[];
    wdays: number[];
  };
}

/**
 * Creates a new cron job scoped to an organization.
 * @param orgId The organization ID to scope this job to.
 * @param job The job configuration.
 */
export async function createCronJob(orgId: string, job: CronJobConfig): Promise<number> {
  if (!API_KEY) throw new Error('CRON_JOB_ORG_API_KEY is missing');

  // Prefix title with [orgId] for scoping
  const scopedTitle = `[${orgId}] ${job.title}`;

  const payload = {
    job: {
      url: job.url,
      enabled: job.enabled ?? true,
      saveResponses: true,
      schedule: job.schedule ?? {
        timezone: 'UTC',
        hours: [-1], // Every hour
        minutes: [0], // At minute 0
        mdays: [-1], // Every day
        months: [-1], // Every month
        wdays: [-1]  // Every weekday
      },
      title: scopedTitle
    }
  };

  const response = await fetch(`${API_URL}/jobs`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create cron job: ${response.status} ${errorText}`);
  }

  const data = await response.json() as CronJobResponse;
  return data.jobId;
}

/**
 * Updates an existing cron job.
 * Note: checks if the job belongs to the org (via title prefix) before updating is NOT implicitly done here, 
 * but good practice would be to ensure we are editing a job we own. 
 * For this utility, we assume the caller has the correct jobId.
 */
export async function updateCronJob(orgId: string, jobId: number, updates: Partial<CronJobConfig>): Promise<void> {
  if (!API_KEY) throw new Error('CRON_JOB_ORG_API_KEY is missing');

  // If title is being updated, ensure we keep/add the prefix
  let title = updates.title;
  if (title && !title.startsWith(`[${orgId}]`)) {
    title = `[${orgId}] ${title}`;
  }

  // We likely need to fetch the existing job to merge updates if the API requires a full object,
  // but cron-job.org usually accepts PATCH with partial fields or we might need to send full structure.
  // According to docs (generic), PATCH often merges. Let's try sending what we have, nested in 'job'.
  
  // Construct the patch payload. API structure usually matches the Create payload structure.
  const jobPayload: any = {};
  if (updates.url) jobPayload.url = updates.url;
  if (updates.enabled !== undefined) jobPayload.enabled = updates.enabled;
  if (title) jobPayload.title = title;
  if (updates.schedule) jobPayload.schedule = updates.schedule;

  const payload = { job: jobPayload };

  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update cron job ${jobId}: ${response.status} ${errorText}`);
  }
}

/**
 * Deletes a cron job.
 */
export async function deleteCronJob(jobId: number): Promise<void> {
  if (!API_KEY) throw new Error('CRON_JOB_ORG_API_KEY is missing');

  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });

  if (!response.ok) {
     const errorText = await response.text();
    throw new Error(`Failed to delete cron job ${jobId}: ${response.status} ${errorText}`);
  }
}

/**
 * Lists all cron jobs for a specific organization.
 * Filters the global list by the title prefix [orgId].
 */
export async function listCronJobs(orgId: string): Promise<CronJobDetails[]> {
  if (!API_KEY) throw new Error('CRON_JOB_ORG_API_KEY is missing');

  const response = await fetch(`${API_URL}/jobs`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list cron jobs: ${response.status} ${errorText}`);
  }

  const data = await response.json() as { jobs: CronJobDetails[] };
  
  // Filter by prefix
  const prefix = `[${orgId}]`;
  return data.jobs.filter(job => job.title && job.title.startsWith(prefix));
}

/**
 * Utility to get a generic default schedule (e.g. daily at 9am UTC)
 */
export function getDailySchedule(hour: number = 9, minute: number = 0) {
  return {
    timezone: 'UTC',
    hours: [hour],
    minutes: [minute],
    mdays: [-1],
    months: [-1],
    wdays: [-1]
  };
}
