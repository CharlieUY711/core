export type BuildJob = {
  domainId: string;
  scopePath: string;
};

export async function processBuildJob(job: BuildJob) {
  console.log('Processing build job:', job);
}





