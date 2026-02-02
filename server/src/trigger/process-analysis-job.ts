import { task } from "@trigger.dev/sdk";

export const processAnalysisJobTask = task({
  id: "process-analysis-job",
  run: async (payload: { jobId: string }) => {
    const { processAnalysisJob } = await import("../services/analysis.service.js");
    await processAnalysisJob(payload.jobId);
  },
});
