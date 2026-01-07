import { createCronJob, listCronJobs, updateCronJob, deleteCronJob, getDailySchedule } from '../src/lib/cron-org';

const TEST_ORG_ID = 'test_org_123';
const TEST_URL = 'https://example.com/api/test-cron';

async function main() {
  console.log('--- Starting Cron Utils Test ---');

  if (!process.env.CRON_JOB_ORG_API_KEY) {
    console.error('Error: CRON_JOB_ORG_API_KEY not set.');
    process.exit(1);
  }

  try {
    // 1. Create
    console.log(`\n1. Creating cron job for org: ${TEST_ORG_ID}`);
    const jobId = await createCronJob(TEST_ORG_ID, {
      title: 'Integration Test Job',
      url: TEST_URL,
      schedule: getDailySchedule(10, 30) // 10:30 UTC
    });
    console.log(`✅ Job created. ID: ${jobId}`);

    // 2. List
    console.log(`\n2. Listing jobs for org: ${TEST_ORG_ID}`);
    const jobs = await listCronJobs(TEST_ORG_ID);
    console.log(`Found ${jobs.length} jobs.`);
    const createdJob = jobs.find(j => j.jobId === jobId);
    
    if (createdJob) {
        console.log(`✅ Found our job: ${createdJob.title} (ID: ${createdJob.jobId})`);
    } else {
        console.error(`❌ Could not find the created job in the list!`);
    }

    // 3. Update
    if (createdJob) {
        console.log(`\n3. Updating job ${jobId}...`);
        await updateCronJob(TEST_ORG_ID, jobId, {
            title: 'Integration Test Job (Updated)',
            enabled: false
        });
        console.log(`✅ Job updated.`);

        // Verify update
        const updatedJobs = await listCronJobs(TEST_ORG_ID);
        const updatedJob = updatedJobs.find(j => j.jobId === jobId);
        if (updatedJob?.title.includes('(Updated)') && updatedJob.enabled === false) {
             console.log(`✅ Verified update: ${updatedJob.title}, Enabled: ${updatedJob.enabled}`);
        } else {
             console.error(`❌ Update verification failed. Got: ${JSON.stringify(updatedJob)}`);
        }
    }

    // 4. Delete
    console.log(`\n4. Deleting job ${jobId}...`);
    await deleteCronJob(jobId);
    console.log(`✅ Job deleted.`);

    // Verify deletion
    const finalJobs = await listCronJobs(TEST_ORG_ID);
    const deletedJob = finalJobs.find(j => j.jobId === jobId);
    if (!deletedJob) {
        console.log(`✅ Verified deletion. Job is gone.`);
    } else {
        console.error(`❌ Job still exists!`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  console.log('\n--- Test Finished ---');
}

main();
