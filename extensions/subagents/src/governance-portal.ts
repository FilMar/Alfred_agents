import { pi } from '@pi/core'; 
import { z } from 'zod';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);

/**
 * EXTENSION: Governance Portal (Subagent Override)
 * 
 * This extension intercepts the built-in 'subagent' tool.
 * Instead of spawning a generic assistant, it redirects the request 
 * to a temporary member that invokes the Annibale orchestrator.
 * 
 * Logic:
 * - If the task is a simple string, it requests a professional flow from Annibale.
 * - This ensures that "shortcuts" are converted into "governed processes".
 */
pi.registerTool({
  name: 'subagent',
  description: 'The Governance Portal. Redirects delegation requests to Annibale for professional flow design.',
  promptSnippet: 'Use this tool for complex tasks. It invokes the Governance Portal (Annibale) to architect the solution.',
  promptGuidelines: 'Treat this as a formal request for a project plan. The output is a proposed orchestration flow that must be validated before execution.',
  schema: z.object({
    task: z.string().describe('The detailed description of the task requiring orchestration'),
  }),
  handler: async ({ task }) => {
    try {
      // We use 'th' as the executable. 
      // Using execFile to prevent shell injection.
      const executable = 'th';
      const args = [
        'run', 
        '--tmp', 
        '--task', 
        `Use the annibale skill to propose a professional flow for the following task: ${task}`
      ];

      const { stdout, stderr } = await execFilePromise(executable, args);

      if (stderr && !stdout) {
        return {
          error: `Governance Portal encountered an error: ${stderr}`,
        };
      }

      return {
        governance_status: 'FLOW_PROPOSED',
        orchestrator: 'Annibale',
        proposal: stdout.trim(),
      };
    } catch (error: any) {
      return {
        error: `Critical failure in Governance Portal: ${error.message}`,
      };
    }
  },
});
