1️⃣ chat.types.ts – Single Source of Truth (Types Layer)
What this file is for

This file defines all TypeScript types and interfaces used by the chat system.

Think of it as:

“The contract that all chat-related files must obey.”

What lives here

Typically:

ChatMessage type

Message kinds (text, typing, config_form, files, design, etc.)

ProjectConfig type (build types + integrations)

Any shared enums or unions

Why it is critical

Prevents “Property does not exist on type” errors

Ensures Builder.tsx, ChatPanel.tsx, ChatMessage.tsx, ConfigForm.tsx all agree on message structure

Fixes errors like:

Property 'content' does not exist

Cannot redeclare block-scoped variable 'messages'

Example responsibility
export type ChatMessage =
  | { kind: "text"; role: "user" | "assistant"; content: string }
  | { kind: "typing"; role: "assistant" }
  | { kind: "config_form"; role: "assistant" }
  | { kind: "files"; role: "user"; files: File[] }
  | { kind: "design"; role: "user"; design: any };

Rule

🚫 No React code here
✅ Only types & interfaces

2️⃣ ChatMessage.tsx – Render ONE Message
What this file is for

This component renders a single chat message bubble, based on its kind.

Think of it as:

“Given ONE message, how should it look?”

What it does

Receives one ChatMessage

Switches on message.kind

Renders the correct UI:

text bubble

typing dots

config form

file chips

Figma card

Why this file exists

Keeps JSX clean

Avoids giant if / switch blocks inside Builder

Makes styling easier

Example responsibility
if (message.kind === "typing") {
  return <TypingDots />;
}

if (message.kind === "files") {
  return <FileChips files={message.files} />;
}

Rule

🚫 No state, no business logic
✅ Pure rendering logic only

3️⃣ ConfigForm.tsx – Project Setup UI (Checkboxes)
What this file is for

This is the interactive configuration step:

Build type selection

Integration selection

Continue button

Think:

“This is the onboarding wizard inside chat.”

What it does

Shows styled checkboxes

Updates projectConfig

Locks itself after submit

Calls onConfigSubmit()

Why it exists

Keeps config logic out of chat rendering

Makes config reusable and isolated

Prevents chat message clutter

Example responsibility
<input
  type="checkbox"
  checked={projectConfig.integrations.includes("Auth")}
  onChange={() => toggleIntegration("Auth")}
/>

Rule

🚫 No chat state here
✅ Only config selection & submit

4️⃣ ChatPanel.tsx – Chat Orchestrator
What this file is for

This is the container for the entire chat flow.

Think:

“This file loops over messages and decides what to show.”

What it does

Receives messages[]

Maps messages → ChatMessage

Injects ConfigForm when needed

Handles scrolling behavior

Why this file exists

Keeps Builder.tsx smaller

Separates layout from logic

Centralizes chat UI

Example responsibility
{messages.map((msg, i) => (
  <ChatMessage key={i} message={msg} />
))}

Rule

🚫 No message creation here
✅ Only rendering + wiring

5️⃣ How All Files Work Together (Flow Diagram)
Builder.tsx
│
│  (owns state)
│  messages[], projectConfig, draft/save logic
│
▼
ChatPanel.tsx
│
│  (loops messages)
│
▼
ChatMessage.tsx
│
│  (renders ONE message)
│
├── text bubble
├── typing dots
├── files UI
├── design UI
└── ConfigForm.tsx
       │
       └── updates projectConfig