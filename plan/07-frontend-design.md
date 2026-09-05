# NexusFlow — Frontend Design

## Design philosophy

Dark-mode first. Clean, dense information display — like Linear or Vercel's dashboard. Glassmorphism accents on cards. Smooth animated transitions. Data-rich without feeling cluttered. Every cloud operation visible in real time.

---

## Color system

```
Background (base)   #0a0a0f   — near black, slightly blue-tinted
Surface             #111118   — cards, panels
Surface raised      #1a1a24   — hover states, dropdowns
Border              #2a2a3a   — card borders, dividers
Border subtle       #1e1e2e   — table row separators

Text primary        #f0f0f5   — headings, primary content
Text secondary      #8b8ba0   — labels, subtitles
Text muted          #555568   — timestamps, metadata

Accent purple       #6366f1   — primary brand, CTA buttons
Accent purple light #818cf8   — hover states, links
Accent purple dim   #3730a3   — badge backgrounds

AWS orange          #ff9900
Azure blue          #0078d4
GCP blue            #4285f4
OCI red             #c74634

Success             #22c55e
Warning             #f59e0b
Error               #ef4444
Info                #3b82f6

Gradient (hero)     from-#6366f1 via-#818cf8 to-#a78bfa
```

---

## Typography

```
Font family:   Inter (Google Fonts)
Monospace:     JetBrains Mono (code, IDs, keys)

Heading 1:   32px / 700 / tight tracking
Heading 2:   24px / 600
Heading 3:   18px / 600
Body:        14px / 400 / 1.6 line height
Small:       12px / 400
Caption:     11px / 400 / muted color
Code:        13px / 400 / monospace
```

---

## Pages

### Page 1 — Landing / Login (unauthenticated)

Full-screen hero. Animated particle background (subtle moving dots connected by lines). Center-aligned.

```
┌─────────────────────────────────────────────────────────────┐
│  ●NexusFlow                                    Sign in      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│           ~ ~ ~ ~ ~ ~ animated particle bg ~ ~ ~           │
│                                                             │
│                    ◆ NexusFlow                              │
│         Upload once. Stored everywhere.                     │
│         Understood by AI. Found instantly.                  │
│                                                             │
│              ┌─────────────────────────┐                   │
│              │  Continue with Cognito  │                    │
│              └─────────────────────────┘                   │
│                                                             │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐   │
│    │AWS  logo │  │Azure logo│  │GCP logo  │  │OCI logo│   │
│    └──────────┘  └──────────┘  └──────────┘  └────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Page 2 — Dashboard (main authenticated view)

Three-column layout with collapsible sidebar.

```
┌──────┬───────────────────────────────────────┬────────────┐
│ SIDE │            MAIN CONTENT               │  ACTIVITY  │
│ BAR  │                                       │  SIDEBAR   │
│      │  ┌─────────────────────────────────┐  │            │
│ Nav: │  │  UPLOAD ZONE (drag + drop)      │  │ Recent:    │
│  □ Dashboard │  ┌──────────────────┐  │  │  │ • invoice  │
│  □ Library │  │  Drop files here  │  │  │  │   stored   │
│  □ Chat  │  │  or click to browse│  │  │  │ • contract │
│  □ Clouds│  └──────────────────┘  │  │  │   analysed │
│  □ Archive │                         │  │  │ • report   │
│           │  ┌─────┐┌────────┐       │  │  │   uploaded │
│  Tags:    │  │ Any ││ Any AI ├─────── │  │  │            │
│  #invoice │  │ file││ cloud  │       │  │  │ 5 docs     │
│  #2024    │  └─────┘└────────┘       │  │  │ today      │
│  #acme    │  └─────────────────────────┘  │            │
│           │                                │            │
│           │  Storage overview              │  AI Queue: │
│           │  ┌────────┬────────┬────────┐  │  ● 2 proc  │
│           │  │ AWS S3 │Az Blob │GCP Stor│  │  ✓ 14 done │
│           │  │ 2.3GB  │ 2.3GB  │ 2.3GB  │  │            │
│           │  └────────┴────────┴────────┘  │            │
└──────┴───────────────────────────────────────┴────────────┘
```

---

### Page 3 — Document Library

Full-width. Toggle between grid and list view.

**Grid view:**
```
┌────────────────────────────────────────────────────────────┐
│  Documents (142)          [Grid] [List]   [+ Upload]       │
│  ┌─────────┐ Filter: [All types ▼] [All clouds ▼] [Date ▼] │
│  │ Search..│                                                │
│  └─────────┘                                                │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ 📄            │ │ 📄            │ │ 🖼             │       │
│  │ invoice-     │ │ contract-    │ │ receipt.jpg  │       │
│  │ jan-2024.pdf │ │ acme.pdf     │ │              │       │
│  │              │ │              │ │              │       │
│  │ INVOICE      │ │ CONTRACT     │ │ RECEIPT      │       │
│  │ "Invoice fr.."│ │ "Service agr"│ │ "Grocery rec"│       │
│  │ #invoice     │ │ #contract    │ │ #receipt     │       │
│  │ #acme-corp   │ │ #acme-corp   │ │ #2024        │       │
│  │ ☁ AWS AZ GCP │ │ ☁ AWS AZ GCP │ │ ☁ AWS AZ GCP │       │
│  │ 240KB Jan 15 │ │ 1.2MB Jan 14 │ │ 85KB Jan 13  │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
└────────────────────────────────────────────────────────────┘
```

**List view:**
```
│ FileName              Type      Size   Clouds        Date     AI  │
│ invoice-jan-2024.pdf  INVOICE   240KB  ●AWS●AZ●GCP  Jan 15  ✓   │
│ contract-acme.pdf     CONTRACT  1.2MB  ●AWS●AZ●GCP  Jan 14  ✓   │
```

---

### Page 4 — Document Detail

Two-panel layout: document preview left, metadata + AI results right.

```
┌──────────────────────────────────┬────────────────────────┐
│  DOCUMENT PREVIEW                │  METADATA              │
│                                  │                        │
│  ┌────────────────────────────┐  │  invoice-jan-2024.pdf  │
│  │                            │  │  240KB · PDF · Jan 15  │
│  │    PDF / Image preview     │  │                        │
│  │                            │  │  AI Summary            │
│  │                            │  │  ┌──────────────────┐  │
│  │                            │  │  │Invoice from Acme │  │
│  └────────────────────────────┘  │  │Corp for $1,250   │  │
│                                  │  │for dev services..│  │
│  [ 1 / 3 pages ]  [Download]     │  └──────────────────┘  │
│                                  │                        │
│  Active viewers:                 │  Tags                  │
│  ◉ Divya   ◉ Anon               │  [invoice][acme-corp]  │
│                                  │  [web-dev][2024][+add] │
│                                  │                        │
│                                  │  Entities              │
│                                  │  Org: Acme Corp        │
│                                  │  Amount: $1,250.00     │
│                                  │  Date: Jan 2024        │
│                                  │                        │
│                                  │  Storage               │
│                                  │  ✓ AWS S3    [copy url]│
│                                  │  ✓ Azure Blob[copy url]│
│                                  │  ✓ GCP Store [copy url]│
│                                  │  ✓ OCI Store [copy url]│
└──────────────────────────────────┴────────────────────────┘
```

---

### Page 5 — AI Chat

Split-panel. Left: document context picker. Right: chat.

```
┌──────────────────────┬──────────────────────────────────────┐
│  CONTEXT             │  CHAT                                 │
│                      │                                       │
│  All documents (142) │  ┌─────────────────────────────────┐  │
│  ● or select files:  │  │ 🤖 Ask me anything about your   │  │
│                      │  │    documents. I'll cite sources. │  │
│  ☑ invoice-jan.pdf   │  └─────────────────────────────────┘  │
│  ☑ contract-acme.pdf │                                       │
│  ☐ receipt.jpg       │  You: Summarise all contracts         │
│                      │                                       │
│  Showing context for │  AI: You have 3 contracts. The most  │
│  2 documents         │  recent is the Acme Corp service      │
│                      │  agreement from Jan 2024 covering...  │
│                      │  [invoice-jan-2024.pdf ↗]             │
│                      │                                       │
│                      │  ┌─────────────────────────────────┐  │
│                      │  │ Type a message...          Send →│  │
│                      │  └─────────────────────────────────┘  │
└──────────────────────┴──────────────────────────────────────┘
```

---

### Page 6 — Cloud Topology

Live view of all 4 clouds. Real-time event feed.

```
┌────────────────────────────────────────────────────────────┐
│  Cloud Topology                           Last checked: 1s │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  ● AWS   │  │ ● Azure  │  │  ● GCP   │  │  ● OCI   │  │
│  │  :4566   │  │  :4577   │  │  :4588   │  │  :4599   │  │
│  │          │  │          │  │          │  │          │  │
│  │ S3: 142  │  │Blob: 142 │  │GCS: 142  │  │OBJ: 28   │  │
│  │ DynoDB:✓ │  │Cosmos:✓  │  │Firest:✓  │  │Stream:✓  │  │
│  │ Bedrock:✓│  │SvcBus:✓  │  │VertxAI:✓ │  │Vault:✓   │  │
│  │ Cognito:✓│  │KeyVlt:✓  │  │PubSub:✓  │  │ADB:✓     │  │
│  │  12ms    │  │  8ms     │  │  10ms    │  │  15ms    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                            │
│  Live event feed:                                          │
│  10:30:45 FILE_STORED      invoice.pdf → AWS S3      342ms │
│  10:30:46 FILE_STORED      invoice.pdf → Azure Blob  218ms │
│  10:30:46 FILE_STORED      invoice.pdf → GCP Store   291ms │
│  10:30:47 FILE_STORED      invoice.pdf → OCI Object  401ms │
│  10:30:49 AI_CLASSIFIED    invoice.pdf → INVOICE     891ms │
│  10:30:51 AI_SUMMARISED    invoice.pdf → done       1240ms │
└────────────────────────────────────────────────────────────┘
```

---

## Upload experience

Drag-and-drop zone with animated dashed border on hover.
On drop:
1. File name + progress bar appears immediately
2. WebSocket subscribed to `/topic/documents/{id}`
3. Progress bar segments fill as each cloud confirms (25% each)
4. AI badge appears with spinner
5. On AI_COMPLETE: full document card animates in with tags, summary, type badge

---

## Animations

- File card entrance: `opacity-0 translate-y-4 → opacity-100 translate-y-0` (200ms ease-out)
- Cloud dot pulse: green dots pulse slowly when active, grey when down
- Upload progress: smooth width transition on the segment bar
- New event in feed: slides in from right with 150ms delay
- AI analysis: pulsing gradient ring around the document card while processing
- Page transitions: `opacity-0 → opacity-100` (150ms)

---

## State management (Zustand)

```typescript
// stores/documentStore.ts
interface DocumentStore {
  documents: Document[]
  selectedDocument: Document | null
  uploadProgress: Map<string, UploadProgress>
  searchResults: SearchResult[]
  filters: DocumentFilters
  
  fetchDocuments: () => Promise<void>
  uploadFile: (file: File) => Promise<void>
  search: (query: string) => Promise<void>
  setFilter: (key: string, value: string) => void
  selectDocument: (id: string) => void
}

// stores/cloudStore.ts
interface CloudStore {
  cloudStatus: Record<CloudProvider, CloudStatus>
  recentEvents: CloudEvent[]
  fetchCloudStatus: () => Promise<void>
  addEvent: (event: CloudEvent) => void
}

// stores/chatStore.ts
interface ChatStore {
  conversations: Map<string, Message[]>
  activeConversationId: string | null
  selectedDocumentIds: string[]
  sendMessage: (message: string) => Promise<void>
}
```

---

## React Query setup

```typescript
// api/documents.ts
export const useDocuments = (filters: DocumentFilters) =>
  useQuery({
    queryKey: ['documents', filters],
    queryFn: () => api.get('/documents', { params: filters }),
    staleTime: 30_000,
  })

export const useDocument = (id: string) =>
  useQuery({
    queryKey: ['documents', id],
    queryFn: () => api.get(`/documents/${id}`),
  })

export const useUploadDocument = () =>
  useMutation({
    mutationFn: (file: File) => api.uploadFile(file),
    onSuccess: (data) => {
      connectWebSocket(data.documentId)
    }
  })
```

---

## WebSocket hook

```typescript
// hooks/useDocumentWebSocket.ts
export function useDocumentWebSocket(documentId: string) {
  const [progress, setProgress] = useState(0)
  const [events, setEvents] = useState<ProcessingEvent[]>([])

  useEffect(() => {
    const client = new Client({
      brokerURL: 'ws://localhost:8080/ws',
    })
    client.onConnect = () => {
      client.subscribe(`/topic/documents/${documentId}`, (msg) => {
        const event: ProcessingEvent = JSON.parse(msg.body)
        setEvents(prev => [...prev, event])
        setProgress(eventToProgress(event.eventType))
      })
    }
    client.activate()
    return () => client.deactivate()
  }, [documentId])

  return { progress, events }
}
```

---

## Routes

```typescript
// App.tsx
<Routes>
  <Route path="/"           element={<Landing />} />
  <Route path="/login"      element={<LoginCallback />} />
  <Route element={<AuthGuard />}>
    <Route path="/dashboard"      element={<Dashboard />} />
    <Route path="/library"        element={<Library />} />
    <Route path="/documents/:id"  element={<DocumentDetail />} />
    <Route path="/chat"           element={<AIChat />} />
    <Route path="/clouds"         element={<CloudTopology />} />
    <Route path="/archive"        element={<Archive />} />
    <Route path="/settings"       element={<Settings />} />
  </Route>
  <Route path="/share/:token"   element={<SharedDocument />} />
  <Route path="*"               element={<NotFound />} />
</Routes>
```
