# Custom Trigger Execution Specification

This document defines the backend behavior for the custom Trigger node when a workflow is activated, manually executed, and deactivated.

The goal is to make the Trigger node the single entry point for runtime events while supporting three runtime modes:

- `schedule` - cron-based execution
- `webhook` - event-driven HTTP endpoint
- `polling` - interval-based data checks

This spec is designed to fit the existing workflow runner architecture in `server/agent_engine` and the current JSON workflow model.

## 1. Execution Model

A workflow activation creates a live trigger runtime for the workflow. The trigger runtime is responsible for:

- starting the correct event source for the selected `triggerMode`
- emitting normalized payloads into the workflow runner
- supporting one-off manual execution from the editor
- cleaning up resources when the workflow is stopped or reloaded

The trigger runtime should not execute business logic directly. It only produces input events and hands them to the workflow execution engine.

## 2. Required Backend Functions

### 2.1 `startConsumer()`

Purpose: start the active trigger source when the workflow is activated.

#### Inputs

- `workflowId`
- `triggerNode`
- `triggerConfig`
- `runtimeContext`
- `emitEvent(payload)` callback
- `registerCleanup(fn)` callback

#### Responsibilities

1. Read `triggerMode` from the trigger configuration.
2. Validate the minimum required configuration for the selected mode.
3. Start exactly one runtime source for the workflow.
4. Register cleanup handlers for all resources created by the source.
5. Emit a normalized event object whenever the source fires.
6. Mark the workflow as active and ready to receive trigger events.

#### Mode-specific behavior

##### `schedule`

- Parse the cron expression from `config.core.schedule`.
- Create a cron job using the server-side scheduler.
- On each cron tick, emit a trigger event into the workflow runner.
- If the cron expression is invalid, do not start the workflow and return a configuration error.

##### `webhook`

- Register a unique webhook endpoint for the workflow and trigger node.
- Persist the mapping between `workflowId`, `triggerNodeId`, and the generated endpoint path.
- Accept inbound HTTP requests at that endpoint.
- On each valid request, normalize the request body, headers, query parameters, and metadata into a workflow event.
- Return a fast HTTP acknowledgment to the caller after the event is accepted.

##### `polling`

- Start a repeating interval using `config.core.pollingInterval`.
- On each interval, call the configured polling source or fetch routine.
- Compare the latest result against the previous checkpoint if deduplication is enabled.
- Emit a new event only when fresh data is detected or when the configuration explicitly allows repeated emissions.

#### Output

`startConsumer()` should return a runtime handle containing:

- `status`: `started | failed`
- `mode`: the active trigger mode
- `stop()`: cleanup function
- `endpoint` or `scheduleInfo` or `pollingInfo` depending on mode
- `lastStartedAt`

---

### 2.2 `manualTriggerFunction()`

Purpose: execute the workflow once from the editor using the "Execute Workflow" button.

#### Inputs

- `workflowId`
- `workflowDefinition`
- `triggerNode`
- optional `manualInput`
- optional `selectedNodeOverride`

#### Responsibilities

1. Bypass long-lived consumers and run a single workflow execution.
2. Generate a synthetic trigger event that matches the same normalized shape used by live triggers.
3. Include editor-provided manual input, if any.
4. Run the workflow with the same downstream execution engine used for real trigger events.
5. Return the full execution result to the editor.

#### Behavior

- Manual execution must not register cron jobs, webhooks, or polling loops.
- The function should simulate one trigger event and immediately start the workflow graph.
- The function should be deterministic enough for preview/debugging, but still include timestamps and metadata so downstream nodes can inspect it.

#### Output

The returned result should include:

- `runId`
- `workflowId`
- `triggerMode: 'manual'`
- `event`
- `context`
- `nodeResults`
- `errors` if any
- `startedAt`
- `finishedAt`

---

### 2.3 `closeFunction()`

Purpose: stop the active runtime when the workflow is deactivated, reloaded, or deleted.

#### Inputs

- `workflowId`
- `runtimeHandle`
- `reason`

#### Responsibilities

1. Stop the active scheduler, webhook subscription, or polling interval.
2. Unregister any webhook route or temporary listener.
3. Clear cached execution state if it is tied to the active runtime.
4. Remove timers, in-memory references, and temporary locks.
5. Mark the workflow as inactive.

#### Mode-specific cleanup

##### `schedule`

- Clear the cron job.
- Remove the job from the scheduler registry.

##### `webhook`

- Unregister the webhook endpoint.
- Remove the path-to-workflow mapping.
- Invalidate any ephemeral signing tokens or verification keys tied to the endpoint.

##### `polling`

- Clear the polling interval.
- Cancel any in-flight fetch if the transport supports cancellation.
- Persist the latest checkpoint if checkpointing is enabled.

#### Output

- `status`: `closed | failed`
- `workflowId`
- `closedAt`
- `reason`
- `cleanupErrors` if any

## 3. Trigger Event Input Format

Every trigger emission, regardless of mode, must be normalized to a common payload structure before it enters the workflow runner.

```json
{
  "runId": "run_123",
  "workflowId": "workflow_abc",
  "triggerNodeId": "trigger_1",
  "triggerMode": "webhook",
  "timestamp": "2026-05-21T12:00:00.000Z",
  "source": {
    "type": "webhook",
    "name": "Custom Trigger",
    "eventName": "webhook_received"
  },
  "data": {
    "body": {},
    "headers": {},
    "query": {},
    "params": {}
  },
  "meta": {
    "requestId": "req_123",
    "attempt": 1,
    "dedupeKey": "optional-deduplication-key"
  }
}
```

## 4. How Data Is Emitted Into the Workflow

The trigger should emit data through the workflow runner as the initial context object.

Recommended runtime flow:

1. Build the normalized trigger event.
2. Store it in the run context under a trigger-specific key.
3. Execute the downstream graph starting from the trigger node.
4. Make trigger output available to downstream nodes by reference.

### Output contract from the Trigger node

The Trigger node should emit a structured object with a stable envelope and a mode-specific payload. For the "Weekly Sales Report" trigger, the payload should be shaped so downstream nodes can consume either simplified business data or the raw source response without needing to re-query the source.

#### Base envelope

```json
{
  "ok": true,
  "triggerMode": "schedule",
  "triggerType": "weekly_sales_report",
  "runId": "run_123",
  "workflowId": "workflow_abc",
  "triggerNodeId": "trigger_1",
  "timestamp": "2026-05-21T12:00:00.000Z",
  "event": {},
  "output": {},
  "meta": {}
}
```

#### Output schema for a Weekly Sales Report trigger

```json
{
  "output": {
    "mode": "simplified",
    "summary": {
      "reportName": "Weekly Sales Report",
      "period": {
        "start": "2026-05-11",
        "end": "2026-05-17"
      },
      "currency": "USD",
      "totals": {
        "grossSales": 12450.75,
        "netSales": 11123.4,
        "ordersCount": 42,
        "itemsSold": 128,
        "refundsTotal": 210.5,
        "discountsTotal": 435.0,
        "taxTotal": 112.85
      },
      "topProducts": [
        {
          "productId": "sku_1042",
          "name": "Premium Running Shoes",
          "quantity": 18,
          "revenue": 1890.0
        },
        {
          "productId": "sku_2201",
          "name": "Hydration Bottle",
          "quantity": 24,
          "revenue": 720.0
        }
      ]
    },
    "records": [
      {
        "orderId": "ord_1001",
        "orderDate": "2026-05-12T10:15:00.000Z",
        "customer": {
          "customerId": "cus_501",
          "name": "Ava Patel",
          "email": "ava@example.com",
          "segment": "returning"
        },
        "channel": "shopify",
        "region": "NA",
        "currency": "USD",
        "items": [
          {
            "productId": "sku_1042",
            "name": "Premium Running Shoes",
            "category": "Footwear",
            "quantity": 1,
            "unitPrice": 105.0,
            "discount": 5.0,
            "lineTotal": 100.0
          }
        ],
        "orderTotal": 100.0,
        "tax": 8.25,
        "shipping": 6.99,
        "status": "paid"
      }
    ]
  }
}
```

#### Multiple items support

- When the source returns more than one sale, `output.records` must be an array of normalized sales entries.
- Each record should represent one order, invoice, or sale event depending on the source system.
- Each record may contain its own `items` array so the downstream workflow can analyze order-level and line-item-level data.
- If the source returns a single aggregate report, `output.records` may still contain one summary record for consistency.

#### Raw output option

When `config.output.includeRawData` is enabled, the trigger should include a `raw` object alongside the simplified payload.

```json
{
  "output": {
    "mode": "raw",
    "summary": {
      "reportName": "Weekly Sales Report",
      "period": {
        "start": "2026-05-11",
        "end": "2026-05-17"
      }
    },
    "records": [
      {
        "orderId": "ord_1001",
        "orderTotal": 100.0
      }
    ],
    "raw": {
      "provider": "shopify",
      "fetchedAt": "2026-05-21T12:00:00.000Z",
      "response": {
        "orders": [],
        "metadata": {
          "page": 1,
          "pageSize": 50,
          "nextCursor": null
        }
      }
    }
  }
}
```

#### Simplified output option

When `config.output.simplifyOutput` is enabled, the trigger should emit only the fields most likely to be used by downstream nodes:

- `summary`
- `records`
- `totals`
- `topProducts`
- `meta`

The simplified form should omit transport-specific details, pagination metadata, and nested raw provider response objects.

#### Downstream access examples

- `{{node_1.output.summary.totals.grossSales}}`
- `{{node_1.output.records[0].customer.email}}`
- `{{node_1.output.records[0].items[0].name}}`
- `{{node_1.output.raw.response.metadata.nextCursor}}`

```json
{
  "ok": true,
  "triggerMode": "webhook",
  "event": {
    "data": {},
    "meta": {},
    "source": {}
  },
  "output": {
    "mode": "simplified",
    "summary": {
      "reportName": "Weekly Sales Report"
    },
    "records": [],
    "totals": {},
    "topProducts": [],
    "raw": null
  }
}
```

Downstream nodes should be able to reference the trigger output through workflow expressions such as:

- `{{node_1.event.data.body}}`
- `{{node_1.output.payload}}`
- `{{node_1.meta.requestId}}`

## 5. Error Handling Strategy

Trigger execution must fail loudly for invalid configuration and recover gracefully for transient runtime issues.

### Configuration errors

Examples:

- missing schedule expression
- invalid cron syntax
- missing webhook path
- invalid polling interval
- unsupported trigger mode

Behavior:

- fail startup immediately
- do not register the consumer
- return a descriptive configuration error
- surface the error to logs and the UI

### Runtime errors

Examples:

- webhook handler exception
- polling request timeout
- scheduler execution error
- downstream workflow execution failure

Behavior:

- capture the error with workflow/run metadata
- mark the current run as failed
- preserve the trigger runtime unless the error is fatal
- retry only when the mode and node configuration explicitly allow retries

### Retry policy

- `schedule`: retry only if the downstream workflow failed and retry is enabled in the workflow configuration
- `webhook`: do not auto-retry the inbound HTTP request after acknowledgement; retries are handled by the external caller
- `polling`: retry the polling request using a bounded backoff policy if the polling source is temporarily unavailable

### Logging requirements

Logs should include:

- `workflowId`
- `triggerNodeId`
- `triggerMode`
- `runId`
- `requestId` or `jobId`
- error message and stack trace where safe

Secrets must never be written to logs.

## 6. Secure Credential Handling

Credentials must be treated as sensitive runtime inputs, not plain workflow data.

### Storage rules

- Do not store raw secrets in the workflow event payload.
- Prefer secret references such as environment variables, vault keys, or encrypted credential records.
- Persist only credential IDs or secret pointers in the workflow JSON when possible.

### Resolution rules

- Resolve credentials at runtime inside the backend only.
- Decrypt or hydrate secrets immediately before making the external call.
- Pass secrets to connectors in memory only.
- Never echo secret values back to the client, logs, or emitted workflow output.

### Redaction rules

When serializing runtime state:

- mask API keys
- mask passwords
- mask bearer tokens
- mask OAuth refresh/access tokens
- redact authorization headers

### Mode-specific credential usage

##### `schedule`

- usually no external credential is required unless the scheduled action calls another service
- any downstream service credentials should be resolved only when that downstream node executes

##### `webhook`

- webhook signing secrets should be stored securely and used for request verification
- incoming request verification should reject invalid signatures before workflow execution

##### `polling`

- polling source credentials should be retrieved at each poll cycle or cached only in memory for the active runtime
- credentials should be rotated or refreshed using secure backend facilities if supported

## 7. Recommended Runtime State

A trigger runtime handle should keep only the minimum required state:

- workflow ID
- trigger node ID
- trigger mode
- stop/cleanup function
- scheduler or listener reference
- last execution timestamp
- checkpoint reference for polling

Do not keep user secrets in the handle.

## 8. Deactivation and Lifecycle Guarantees

When `closeFunction()` runs, the system must guarantee:

- no future cron ticks for that workflow
- no active webhook listeners for that workflow
- no polling interval remains alive
- no duplicate consumers exist after restart
- cleanup is idempotent

Calling `closeFunction()` more than once should be safe.

## 9. Implementation Notes

This spec maps cleanly to the current architecture:

- the workflow runner executes the graph
- the Trigger node is the entry node
- the backend trigger manager is responsible for lifecycle and source registration
- the editor uses `manualTriggerFunction()` for one-off execution

The spec intentionally keeps mode-specific logic behind a common trigger lifecycle so the UI, workflow JSON, and backend runtime remain aligned.
