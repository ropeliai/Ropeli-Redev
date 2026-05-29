const API_BASE = '/api';

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const error = typeof data === 'string' ? data : data?.error || 'Request failed';
    throw new Error(error);
  }

  return data;
}

export async function activateTrigger(workflowId, nodeId, config) {
  return requestJson(`/workflows/${encodeURIComponent(workflowId)}/triggers/${encodeURIComponent(nodeId)}/activate`, {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function deactivateTrigger(workflowId, nodeId) {
  return requestJson(`/workflows/${encodeURIComponent(workflowId)}/triggers/${encodeURIComponent(nodeId)}/deactivate`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function manualExecuteTrigger(workflowId, nodeId, manualInput = {}) {
  return requestJson(`/workflows/${encodeURIComponent(workflowId)}/triggers/${encodeURIComponent(nodeId)}/manual-execute`, {
    method: 'POST',
    body: JSON.stringify({ manualInput }),
  });
}

export async function getTriggerStatus(workflowId, nodeId) {
  const result = await requestJson(`/workflows/${encodeURIComponent(workflowId)}/triggers/status`, {
    method: 'GET',
  });

  if (nodeId && Array.isArray(result?.data?.activeTriggers)) {
    return {
      ...result,
      data: {
        ...result.data,
        activeTrigger: result.data.activeTriggers.find((trigger) => trigger.nodeId === nodeId) || null,
      },
    };
  }

  return result;
}
