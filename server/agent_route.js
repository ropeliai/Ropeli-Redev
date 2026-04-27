import express from 'express';
import { generateWorkflowWithOllama } from './agent_engine/generator.js';
import { executeWorkflow } from './agent_engine/index.js';

const router = express.Router();

/**
 * Route to generate the workflow graph configuration
 */
router.post('/generate', async (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  try {
    const workflowConfig = await generateWorkflowWithOllama(prompt);
    res.json({ success: true, workflow: workflowConfig });
  } catch (error) {
    console.error("Agent workflow generation failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Route to execute a generated workflow graph
 */
router.post('/execute', async (req, res) => {
  const { workflow } = req.body;

  if (!workflow || !workflow.nodes || !workflow.edges) {
    return res.status(400).json({ error: "Valid workflow configuration is required." });
  }

  try {
    const executionResult = await executeWorkflow(workflow);
    res.json({ success: true, result: executionResult });
  } catch (error) {
    console.error("Agent workflow execution failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
