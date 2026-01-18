# Chat-to-Start Implementation Plan

**Feature:** AI-guided project creation via conversational chat interface  
**Status:** Ready for implementation  
**Priority:** High (core differentiating feature)

---

## Overview

Transform the current "name input modal" project creation into a full conversational AI experience where users describe their story idea and the system elicits details, matches existing assets, and bootstraps a complete project.

> *"Chat your story into existence, then polish it to perfection."*

---

## Key Decisions

| Decision | Answer |
|----------|--------|
| **Chat Location** | Dashboard-embedded (Option A) - slide-up panel |
| **LLM Provider** | Swappable via existing `TextProvider` pattern. Priority: Ollama → Claude → OpenAI |
| **Streaming** | Yes - SSE for real-time responses |
| **Persistence** | Session history + global thread history |
| **Characters** | Global library, linked/associated with projects |
| **RAG Architecture** | Full pipeline with no-op stages (correct arch, MVP passthrough) |
| **Fallback** | Error message + fallback to simple modal |

---

## Existing Infrastructure to Leverage

### Text Generation Service
```typescript
// packages/core/src/services/text-generation.types.ts
export type TextProvider = "ollama" | "claude" | "openai";

// packages/core/src/services/text-generation.service.ts
createTextGenerationService({ provider: "ollama" })
```

### Existing Endpoints
```
POST /api/text/provider      - switch provider
GET  /api/text/providers     - list available
GET  /api/narrative/llm/status - check readiness
```

---

## User Flow

```
1. User types in chat input on Dashboard
   ↓
2. Chat panel expands, shows greeting
   ↓
3. AI asks questions (characters, setting, arc, style, scope)
   User can: answer, skip, or say "that's enough"
   ↓
4. RAG matches mentioned characters from library
   User confirms or creates new
   ↓
5. AI shows Bootstrap Confirmation:
   - Project name (editable)
   - Characters (N matched, M new)
   - Story outline
   - Page count
   - Style preset
   ↓
6. User clicks "Create Project"
   ↓
7. Bootstrap service creates all assets
   ↓
8. Navigate to /projects/:id with Storyboard view
```

---

## Components to Build

### 1. Chat UI Component (`packages/ui/src/components/chat/`)

```typescript
// ChatPanel.tsx - Main chat interface
interface ChatPanelProps {
  onProjectCreated: (projectId: string) => void;
  onClose: () => void;
}

// ChatMessage.tsx - Individual message bubble
interface ChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

// ChatInput.tsx - Input with send button
interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// BootstrapPreview.tsx - Project confirmation screen
interface BootstrapPreviewProps {
  preview: ProjectBootstrap;
  onConfirm: () => void;
  onEdit: (field: string) => void;
  onBack: () => void;
}
```

### 2. Elicitation State Machine

```typescript
type ElicitationPhase = 
  | 'greeting'      // "What would you like to create?"
  | 'characters'    // "Who are the characters?"
  | 'setting'       // "Where/when does it happen?"
  | 'arc'           // "What's the story arc?"
  | 'style'         // "What tone/style?"
  | 'scope'         // "How many pages?"
  | 'confirmation'  // Show bootstrap preview
  | 'complete';     // Project created

interface ElicitationState {
  phase: ElicitationPhase;
  gathered: {
    concept?: string;
    characters?: CharacterDraft[];
    setting?: string;
    arc?: string;
    style?: string;
    pageCount?: number;
  };
  skipped: ElicitationPhase[];
}
```

### 3. RAG Pipeline (`packages/core/src/services/rag/`)

**Full pipeline with MVP no-ops:**

```
┌────────────────────────────────────────────────────────────────────┐
│                      RAG PIPELINE                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. QUERY UNDERSTANDING                                             │
│     ├─ Intent Classification (MVP: regex/keyword)                   │
│     ├─ Entity Extraction (MVP: name matching)                       │
│     └─ Query Expansion (MVP: no-op passthrough)                     │
│                                                                     │
│  2. RETRIEVAL                                                       │
│     ├─ Exact Match (MVP: SQL ILIKE on name)                         │
│     ├─ Fuzzy Match (MVP: no-op, returns empty)                      │
│     └─ Semantic Search (MVP: no-op, returns empty)                  │
│                                                                     │
│  3. RANKING                                                         │
│     ├─ Relevance Scoring (MVP: exact=1.0, fuzzy=0.5)                │
│     ├─ Recency Boost (MVP: no-op)                                   │
│     └─ Usage Frequency (MVP: no-op)                                 │
│                                                                     │
│  4. POST-PROCESSING                                                 │
│     ├─ Deduplication (MVP: by ID)                                   │
│     ├─ Context Assembly (MVP: just return matches)                  │
│     └─ Confidence Thresholding (MVP: return all)                    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

**Interface:**
```typescript
interface RAGPipeline {
  queryUnderstanding: QueryUnderstandingStage;
  retrieval: RetrievalStage;
  ranking: RankingStage;
  postProcessing: PostProcessingStage;
}

interface RetrievalStage {
  exactMatch(query: string, options: RetrievalOptions): Promise<Match[]>;
  fuzzyMatch(query: string, options: RetrievalOptions): Promise<Match[]>;
  semanticSearch(query: string, options: RetrievalOptions): Promise<Match[]>;
}
```

---

## Database Schema

```sql
-- Chat threads (global, can span multiple projects)
CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),  -- nullable for anon
  title TEXT,  -- auto-generated or user-set
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual chat sessions (one per "project creation attempt")
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
  elicitation_state JSONB NOT NULL DEFAULT '{}',
  resulting_project_id UUID REFERENCES projects(id),  -- null until bootstrap
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP  -- null if abandoned
);

-- Messages (belong to session, but queryable by thread)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,  -- suggestions, asset_matches, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Link characters to projects (many-to-many)
CREATE TABLE project_characters (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  role TEXT,  -- "protagonist", "supporting", etc.
  PRIMARY KEY (project_id, character_id)
);
```

### Thread vs Session

| Concept | Purpose |
|---------|---------|
| **Thread** | Persistent conversation history. User can return to old threads. |
| **Session** | One attempt to create a project. Tracks elicitation state. |
| **Message** | Individual chat message. Belongs to session. |

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat/threads` | GET | List user's chat threads |
| `/api/chat/threads` | POST | Create new thread |
| `/api/chat/threads/:id` | GET | Get thread with sessions |
| `/api/chat/sessions` | POST | Start new session in thread |
| `/api/chat/sessions/:id` | GET | Get session with messages |
| `/api/chat/sessions/:id/messages` | POST | Send message (streaming response) |
| `/api/chat/sessions/:id/bootstrap` | POST | Create project from session |
| `/api/rag/characters` | GET | Search characters (uses RAG pipeline) |

---

## Streaming Implementation

### Server (Hono + SSE)
```typescript
import { streamSSE } from "hono/streaming";

chatRoutes.post("/sessions/:id/messages", async (c) => {
  const { content } = await c.req.json();
  const session = await getSession(c.req.param("id"));
  
  return streamSSE(c, async (stream) => {
    const textService = createTextGenerationService();
    
    for await (const chunk of textService.streamGenerate(prompt)) {
      await stream.writeSSE({ data: chunk });
    }
    
    await stream.writeSSE({ 
      event: "complete",
      data: JSON.stringify({ suggestions, assetMatches })
    });
  });
});
```

### Client (React Hook)
```typescript
function useChatStream(sessionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);

  const sendMessage = async (content: string) => {
    setStreaming(true);
    const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });

    const reader = response.body?.getReader();
    let assistantMessage = "";

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      
      const chunk = new TextDecoder().decode(value);
      assistantMessage += chunk;
      setMessages(prev => updateLastMessage(prev, assistantMessage));
    }
    
    setStreaming(false);
  };

  return { messages, sendMessage, streaming };
}
```

---

## Fallback Strategy

```typescript
async function handleChatMessage(sessionId: string, content: string) {
  const textService = createTextGenerationService();
  const providers = await textService.listProviders();
  const available = providers.find(p => p.available);
  
  if (!available) {
    return {
      type: "fallback",
      message: "AI assistant unavailable. Would you like to create a project manually?",
      showSimpleModal: true
    };
  }
  
  return processWithAI(sessionId, content);
}
```

---

## Implementation Phases

### Phase 1: Chat UI + Mock Backend
- [ ] `ChatPanel` component on dashboard
- [ ] Slide-up panel UX
- [ ] `ChatMessage`, `ChatInput` components
- [ ] Mock streaming responses (no real AI)
- [ ] Basic state management

### Phase 2: Real Backend + Streaming
- [ ] `/api/chat/sessions/:id/messages` with SSE
- [ ] Integration with `TextGenerationService`
- [ ] Elicitation state machine
- [ ] System prompts for each phase

### Phase 3: Persistence
- [ ] Database migrations
- [ ] Thread/session CRUD endpoints
- [ ] Resume abandoned sessions
- [ ] Thread history sidebar

### Phase 4: RAG Pipeline
- [ ] Pipeline interface definition
- [ ] MVP implementations (exact match)
- [ ] Character search endpoint
- [ ] UI for confirming matches

### Phase 5: Bootstrap
- [ ] `BootstrapPreview` component
- [ ] Multi-asset creation transaction
- [ ] Project + characters + outline + pages
- [ ] Navigate to workspace

---

## File Structure

```
packages/
├── core/src/
│   ├── services/
│   │   ├── chat/
│   │   │   ├── chat.service.ts
│   │   │   ├── elicitation.state-machine.ts
│   │   │   └── bootstrap.service.ts
│   │   └── rag/
│   │       ├── pipeline.ts
│   │       ├── stages/
│   │       │   ├── query-understanding.ts
│   │       │   ├── retrieval.ts
│   │       │   ├── ranking.ts
│   │       │   └── post-processing.ts
│   │       └── index.ts
│   └── db/
│       └── schema.ts  # Add new tables
│
├── server/src/
│   └── rest/routes/
│       └── chat.ts
│
└── ui/src/
    ├── components/
    │   └── chat/
    │       ├── ChatPanel.tsx
    │       ├── ChatMessage.tsx
    │       ├── ChatInput.tsx
    │       ├── BootstrapPreview.tsx
    │       ├── ThreadHistory.tsx
    │       └── index.ts
    ├── api/hooks/
    │   └── useChat.ts
    └── routes/
        └── index.tsx  # Add chat panel to dashboard
```

---

## Testing Strategy

### Unit Tests
- Elicitation state machine transitions
- RAG pipeline stages (with mocks)
- Bootstrap service

### Integration Tests
- Chat API endpoints
- Streaming responses
- Database persistence

### E2E Tests (Flow 2)
- Enable skipped tests in `flow-2-project-creation.spec.ts`
- Section 2.5: Chat-to-Start
- Section 2.6: RAG / Asset Matching
- Section 2.7: Project Bootstrap Output

---

## References

- **User Flows Spec:** `_bmad-output/planning-artifacts/user-flows-spec.md` (Flow 2)
- **Wireframes:** `_bmad-output/planning-artifacts/wireframes.md` (Flow 2 sections)
- **Existing Tests:** `packages/ui/e2e/specs/flow-2-project-creation.spec.ts`
- **Text Generation:** `packages/core/src/services/text-generation.service.ts`

---

## Getting Started

```bash
# 1. Create feature branch
git checkout -b feat/chat-to-start

# 2. Start with Phase 1 - Chat UI
cd packages/ui
# Create components/chat/ directory
# Build ChatPanel, ChatMessage, ChatInput

# 3. Add to Dashboard
# Edit src/routes/index.tsx to include ChatPanel

# 4. Test with mock responses before wiring backend
```

---

**Let's build it!**
