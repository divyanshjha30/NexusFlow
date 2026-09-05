# NexusFlow — UI Components

All components built with React, Tailwind CSS, and shadcn/ui primitives.

---

## Component tree

```
App
├── Layout
│   ├── Sidebar
│   │   ├── NavItem
│   │   └── TagBadge
│   ├── ActivitySidebar
│   │   ├── ActivityItem
│   │   └── AiQueueItem
│   └── TopBar
│
├── pages/Landing
│   ├── ParticleBackground
│   ├── HeroText
│   └── LoginButton
│
├── pages/Dashboard
│   ├── UploadZone
│   │   ├── DropArea
│   │   ├── UploadProgress (per file)
│   │   └── CloudStorageBar
│   ├── StorageOverview
│   │   └── CloudStorageCard (×4)
│   └── RecentDocuments
│
├── pages/Library
│   ├── DocumentFilters
│   │   ├── SearchInput
│   │   ├── TypeFilter
│   │   ├── CloudFilter
│   │   └── DateFilter
│   ├── ViewToggle
│   ├── DocumentGrid
│   │   └── DocumentCard (×n)
│   └── DocumentList
│       └── DocumentRow (×n)
│
├── pages/DocumentDetail
│   ├── DocumentPreview
│   ├── MetadataPanel
│   │   ├── AiSummaryCard
│   │   ├── TagEditor
│   │   ├── EntityList
│   │   ├── StorageLocations
│   │   └── ActiveViewers
│   └── AnnotationLayer
│
├── pages/AIChat
│   ├── DocumentContextPicker
│   ├── ChatHistory
│   │   ├── UserMessage
│   │   └── AiMessage
│   │       └── SourceCitation
│   └── ChatInput
│
└── pages/CloudTopology
    ├── CloudStatusCard (×4)
    ├── ServiceHealthDot (×n per cloud)
    └── EventFeed
        └── EventRow
```

---

## Shared / atomic components

### `<Badge variant="type" />`
Document type label.

```tsx
// Props
type BadgeVariant = 'invoice' | 'contract' | 'report' | 'receipt' | 'image' | 'audio' | 'other'
                   | 'ready' | 'processing' | 'failed' | 'archived'
                   | 'aws' | 'azure' | 'gcp' | 'oci'

// Color map
invoice   → bg-amber-500/20   text-amber-400   border-amber-500/30
contract  → bg-blue-500/20    text-blue-400    border-blue-500/30
report    → bg-purple-500/20  text-purple-400  border-purple-500/30
receipt   → bg-green-500/20   text-green-400   border-green-500/30
ready     → bg-green-500/20   text-green-400
processing → bg-indigo-500/20 text-indigo-400
failed    → bg-red-500/20     text-red-400
aws       → bg-orange-500/20  text-orange-400
azure     → bg-blue-500/20    text-blue-400
gcp       → bg-sky-500/20     text-sky-400
oci       → bg-red-600/20     text-red-400
```

---

### `<CloudDot cloud="aws" status="up" />`
Colored dot with cloud icon. Pulses when active.

```tsx
// Props
{ cloud: 'AWS' | 'AZURE' | 'GCP' | 'OCI', status: 'UP' | 'DOWN' | 'CHECKING' }

// Render
<span className={`inline-block w-2 h-2 rounded-full ${statusColor} ${status === 'UP' ? 'animate-pulse' : ''}`} />
<span className="text-xs">{cloud}</span>
```

---

### `<ProgressBar value={75} segments={4} />`
Upload progress bar with 4 segments (one per cloud).

```tsx
// Segments fill left-to-right as each cloud confirms
// Colors: AWS orange → Azure blue → GCP sky → OCI red
// Each segment = 25% width, with a 1px gap between
```

---

### `<Spinner size="sm" />`
Subtle spinning ring.

```tsx
<div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
```

---

## Core components

### `<UploadZone />`

Drag-and-drop area. Full-width on dashboard.

**Props:** none (reads from Zustand)

**Behavior:**
- Default: dashed border, "Drop files here or click to browse" text, cloud provider icons below
- Drag over: border turns solid indigo, background lightens slightly
- File dropped: file appears as `<UploadProgress>` item below the zone
- Supports multiple files simultaneously (each gets its own progress row)
- Accepts: all MIME types, max 100MB per file

**State:**
```tsx
const [isDragging, setIsDragging] = useState(false)
const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
```

**Visual:**
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│         ↑  Drop files here                           │
│            or click to browse                        │
│                                                      │
│    [AWS] [Azure] [GCP] [OCI] — stored to all 4       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### `<UploadProgress item={uploadItem} />`

Shows per-file upload + AI processing status.

**Props:** `{ documentId, fileName, progress, events, status }`

**Visual:**
```
invoice-jan-2024.pdf  240KB                          ✓ INVOICE
[████░░░░] 75%  ●AWS  ●Azure  ○GCP  ○OCI  ⚙ AI...
```

States:
- Grey segment → not started
- Filled color → cloud confirmed (AWS orange, Azure blue, GCP sky, OCI red)
- Spinning ring → AI processing
- Green checkmark + type badge → complete

---

### `<DocumentCard document={doc} />`

Used in grid view.

**Props:** `{ document: DocumentDto, onClick: () => void }`

**Size:** ~220px wide, ~280px tall

**Visual:**
```
┌────────────────────────┐
│  [file type icon]      │
│                        │
│  invoice-jan-2024.pdf  │
│  INVOICE  NEUTRAL      │
│                        │
│  "Invoice from Acme    │
│   Corp for $1,250..."  │
│                        │
│  [invoice][acme-corp]  │
│                        │
│  ●AWS ●Az ●GCP ●OCI   │
│  240KB  Jan 15         │
└────────────────────────┘
```

Hover: card lifts (shadow), overlay with quick actions (download, share, archive).

---

### `<DocumentRow document={doc} />`

Used in list view. Single table row.

**Columns:** checkbox | file icon + name | type badge | size | cloud dots | date | AI badge | actions menu

---

### `<AiSummaryCard summary={text} status={status} />`

Shows the AI-generated summary.

- While processing: pulsing placeholder lines (skeleton)
- Complete: summary text + subtle gradient border
- Failed: error state with "Re-analyse" button

---

### `<TagEditor tags={tags} onAdd={fn} onRemove={fn} />`

Inline tag editing.

```
[invoice ×] [acme-corp ×] [2024 ×]  [+ Add tag]
                                          ↓
                                     input field appears
```

AI-generated tags show with a subtle robot icon. User-added tags show without.

---

### `<EntityList entities={entities} />`

Shows extracted entities grouped by type.

```
Organizations:  Acme Corp
Dates:          January 2024
Amounts:        $1,250.00,  25 hours,  $50/hour
```

Each entity value is clickable → triggers a search for that entity across all documents.

---

### `<StorageLocations document={doc} />`

Shows storage status across all 4 clouds with copy-URL buttons.

```
✓ AWS S3      us-east-1    [copy URL]  [open]
✓ Azure Blob  devstoreaccount1  [copy URL]  [open]
✓ GCP Storage nexusflow-documents  [copy URL]
✓ OCI Object  nexusflow-archive  [copy URL]
```

If a cloud is showing an error: red row with "Retry" button.

---

### `<CloudStatusCard cloud="AWS" status={cloudStatus} />`

Used in the Cloud Topology page.

**Props:** `{ cloud: CloudProvider, status: CloudStatus }`

```
┌──────────────────────┐
│  ● AWS    :4566  12ms│
│                      │
│  S3        ✓         │
│  DynamoDB  ✓         │
│  Bedrock   ✓         │
│  Cognito   ✓         │
│  SQS       ✓         │
│  SNS       ✓         │
│                      │
│  6/6 services UP     │
└──────────────────────┘
```

Border color: green (all up), yellow (partial), red (down).

---

### `<EventFeed events={events} />`

Scrolling feed of real-time cloud events.

Each row:
```
10:30:45  FILE_STORED      invoice.pdf → AWS S3      342ms  ●AWS
```

Color-coded by cloud and event type. New events slide in from the right. Auto-scrolls to bottom. Max 100 visible rows (older ones disappear).

---

### `<ChatMessage message={msg} />`

```tsx
// User message — right-aligned, indigo bubble
// AI message — left-aligned, dark surface, with optional source list

// AI message with sources:
interface AiMessage {
  content: string
  sources: {
    documentId: string
    fileName: string
    excerpt: string
    relevanceScore: number
  }[]
}
```

Sources shown as collapsible cards below the message body.

---

### `<SourceCitation source={source} />`

Compact card showing which document the AI cited.

```
📄 contract-acme.pdf
"...this agreement shall continue until December 31, 2025..."
[Open document →]
```

---

### `<ActiveViewers viewers={viewers} />`

Shows who else is viewing the same document.

```
Viewing:  ◉ Divya  ◉ 2 others
```

Live via Firestore. Dot pulses when user is active.

---

### `<DocumentPreview document={doc} />`

Left panel in DocumentDetail. Renders:
- **PDF**: `react-pdf` component with page navigation
- **Images**: `<img>` with zoom on click
- **Audio**: HTML5 `<audio>` player with waveform
- **Other**: file icon + "Download to view" message

---

## Animations (Tailwind classes)

```css
/* Card entrance */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-slide-up { animation: fadeSlideUp 200ms ease-out; }

/* Event feed item */
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(32px); }
  to   { opacity: 1; transform: translateX(0); }
}
.animate-slide-in-right { animation: slideInRight 150ms ease-out; }

/* Processing ring on document card */
@keyframes processingRing {
  0%   { box-shadow: 0 0 0 2px #6366f1; }
  50%  { box-shadow: 0 0 0 4px #6366f1; }
  100% { box-shadow: 0 0 0 2px #6366f1; }
}
.animate-processing { animation: processingRing 1.5s ease-in-out infinite; }
```

---

## Key npm packages

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.x",
    "@tanstack/react-query": "^5.x",
    "zustand": "^4.x",
    "@stomp/stompjs": "^7.x",
    "react-pdf": "^9.x",
    "react-dropzone": "^14.x",
    "@tsparticles/react": "^3.x",
    "@tsparticles/slim": "^3.x",
    "lucide-react": "latest",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x"
  }
}
```
