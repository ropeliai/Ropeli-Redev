const API_BASE = '/api';

async function requestJson(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const rawText = await response.text();

    if (!response.ok) {
      let errorMessage = 'Request failed';

      if (isJson) {
        try {
          const parsed = rawText ? JSON.parse(rawText) : null;
          errorMessage = parsed?.error || parsed?.message || errorMessage;
        } catch {
          errorMessage = 'Trigger status unavailable';
        }
      }

      if (!isJson && rawText) {
        errorMessage = 'Trigger status unavailable';
      }

      throw new Error(errorMessage);
    }

    if (!rawText) {
      return {};
    }

    if (!isJson) {
      return { message: rawText };
    }

    try {
      return JSON.parse(rawText);
    } catch {
      return {};
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[triggerService] request failed', { url, path, error: error instanceof Error ? error.message : String(error) });
    }

    throw error instanceof Error ? error : new Error('Trigger status unavailable');
  }
}

export async function activateTrigger(workflowId: string, nodeId: string, config: unknown) {
  return requestJson(`/workflows/${encodeURIComponent(workflowId)}/triggers/${encodeURIComponent(nodeId)}/activate`, {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function deactivateTrigger(workflowId: string, nodeId: string) {
  return requestJson(`/workflows/${encodeURIComponent(workflowId)}/triggers/${encodeURIComponent(nodeId)}/deactivate`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function manualExecuteTrigger(workflowId: string, nodeId: string, manualInput: unknown = {}) {
  return requestJson(`/workflows/${encodeURIComponent(workflowId)}/triggers/${encodeURIComponent(nodeId)}/manual-execute`, {
    method: 'POST',
    body: JSON.stringify({ manualInput }),
  });
}

export async function getTriggerStatus(workflowId: string, nodeId: string) {
  const statusPath = `/workflows/${encodeURIComponent(workflowId)}/triggers/status${nodeId ? `?nodeId=${encodeURIComponent(nodeId)}` : ''}`;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[triggerService] getTriggerStatus', { workflowId, nodeId, url: `${API_BASE}${statusPath}` });
  }

  const result = await requestJson(statusPath, {
    method: 'GET',
  });

  if (nodeId && Array.isArray(result?.data?.activeTriggers)) {
    return {
      ...result,
      data: {
        ...result.data,
        activeTrigger: result.data.activeTriggers.find((trigger: any) => trigger.nodeId === nodeId) || null,
      },
    };
  }

  return result;
}
