# Poly-Whisper Architecture Diagram

## System Overview

```mermaid
graph TB
    subgraph "External Services"
        TW[Twitter API<br/>WebSocket Stream]
        PM[Polymarket API<br/>REST API]
        LLM1[Google Gemini<br/>Tweet Analysis]
        LLM2[OpenAI GPT-4 Mini<br/>Market Matching]
    end

    subgraph "Backend Services"
        TWS[Twitter WebSocket<br/>Service]
        TAS[Tweet Analyzer<br/>Service]
        MMS[Market Matching<br/>Service]
        MCS[Market Catalog<br/>Service]
        ARS[Analysis Refresh<br/>Service]
        TDS[Tweet Database<br/>Service]
        CWS[Client WebSocket<br/>Service]
    end

    subgraph "Database - Supabase"
        TBL1[(tweets<br/>table)]
        TBL2[(tweet_analyses<br/>table)]
        TBL3[(market_catalog<br/>table)]
    end

    subgraph "Frontend"
        FE[React Frontend]
        HTTP[HTTP API<br/>REST Endpoints]
        WS[WebSocket<br/>Connection]
    end

    %% Data Flow
    TW -->|Real-time tweets| TWS
    TWS -->|Tweet Details| TAS
    TAS -->|Analysis Request| LLM1
    LLM1 -->|Keywords/Sentiment| TAS
    TAS -->|Enriched Tweet| MMS
    MMS -->|Market Catalog| MCS
    MCS -->|Fetch Markets| PM
    MMS -->|Matching Request| LLM2
    LLM2 -->|Matched Markets| MMS
    MMS -->|Enriched Tweet| TDS
    TDS -->|Save| TBL1
    TDS -->|Save Analysis| TBL2
    MCS -->|Cache Markets| TBL3
    TDS -->|Broadcast| CWS
    CWS -->|Real-time Updates| WS
    WS -->|New Tweets| FE
    FE -->|Initial Load| HTTP
    HTTP -->|Query| TDS
    TDS -->|Fetch| TBL1
    TDS -->|Fetch| TBL2
    ARS -->|Refresh Stale| TDS
    ARS -->|Re-analyze| TAS
    ARS -->|Re-match| MMS

    style TW fill:#1DA1F2
    style PM fill:#6366F1
    style LLM1 fill:#FF6B6B
    style LLM2 fill:#4ECDC4
    style TBL1 fill:#FFD93D
    style TBL2 fill:#FFD93D
    style TBL3 fill:#FFD93D
    style FE fill:#6BCF7F
```

## Detailed Data Flow

```mermaid
sequenceDiagram
    participant TW as Twitter API
    participant TWS as Twitter WS Service
    participant TAS as Tweet Analyzer
    participant MMS as Market Matcher
    participant MCS as Market Catalog
    participant TDS as Tweet DB Service
    participant CWS as Client WS Service
    participant FE as Frontend
    participant DB as Supabase

    Note over TW,DB: Real-time Tweet Processing Flow

    TW->>TWS: New Tweet Received
    TWS->>TAS: Analyze Tweet
    TAS->>TAS: Extract Keywords/Sentiment
    TAS->>MMS: Enriched Tweet

    MMS->>MCS: Get Market Catalog
    MCS->>DB: Fetch Cached Markets
    DB-->>MCS: Market List
    MCS-->>MMS: Compact Market Catalog

    MMS->>MMS: Match Tweet to Markets (LLM)
    MMS-->>TDS: Enriched Tweet + Markets

    TDS->>DB: Save Tweet
    DB-->>TDS: Tweet ID
    TDS->>DB: Save Analysis (original)
    TDS->>CWS: Broadcast Tweet
    CWS->>FE: WebSocket: New Tweet

    Note over FE,DB: Initial Page Load

    FE->>TDS: HTTP: GET /api/tweets/with-analysis
    TDS->>DB: Query tweets_with_analysis
    DB-->>TDS: Tweets + Analysis
    TDS-->>FE: JSON Response

    Note over FE,DB: Background Refresh

    ARS->>TDS: Find Stale Analyses
    TDS->>DB: Query Old Analyses
    DB-->>TDS: Stale Tweet List
    TDS->>ARS: Tweets to Refresh
    ARS->>TAS: Re-analyze
    ARS->>MMS: Re-match Markets
    ARS->>TDS: Save Refreshed Analysis
    TDS->>DB: Update (refreshed version)
```

## Service Architecture

```mermaid
graph LR
    subgraph "Entry Point"
        INDEX[index.ts<br/>Main Server]
    end

    subgraph "WebSocket Layer"
        TWS[Twitter WebSocket<br/>Service]
        CWS[Client WebSocket<br/>Service]
    end

    subgraph "Analysis Layer"
        TAS[Tweet Analyzer<br/>LLM-based]
        ARS[Analysis Refresh<br/>Service]
    end

    subgraph "Market Layer"
        MCS[Market Catalog<br/>Service]
        IMM[Intelligent Market<br/>Matcher]
        MMS[Market Matching<br/>Service]
    end

    subgraph "Data Layer"
        TDS[Tweet Database<br/>Service]
        SDB[(Supabase<br/>Database)]
    end

    subgraph "API Layer"
        TR[tweetRoutes]
        MR[marketRoutes]
        AR[analysisRoutes]
        UR[userRoutes]
    end

    INDEX --> TWS
    INDEX --> CWS
    INDEX --> TAS
    INDEX --> MCS
    INDEX --> MMS
    INDEX --> TDS

    TWS --> TAS
    TAS --> MMS
    MMS --> IMM
    IMM --> MCS
    MMS --> TDS
    TDS --> SDB
    ARS --> TAS
    ARS --> MMS
    ARS --> TDS

    TR --> TDS
    MR --> MCS
    AR --> ARS
    UR --> SDB

    CWS --> FE[Frontend]
    TR --> FE
    MR --> FE
    AR --> FE
```

## Database Schema Relationships

```mermaid
erDiagram
    tweets ||--o{ tweet_analyses : "has"
    tweets {
        uuid id PK
        text tweet_id UK
        text author_username
        text text
        timestamptz created_at
        jsonb raw_data
    }

    tweet_analyses ||--o{ tweets : "belongs to"
    tweet_analyses {
        uuid id PK
        uuid tweet_id FK
        text analysis_type
        text analysis_version
        text sentiment
        numeric sentiment_score
        text[] keywords
        text[] categories
        jsonb markets_matched
        timestamptz refreshed_at
    }

    market_catalog {
        text id PK
        text question
        text slug
        numeric volume_num
        numeric liquidity
        jsonb tags
        text category
        jsonb market_data
        timestamptz refreshed_at
    }

    user_profiles ||--o{ user_interactions : "has"
    user_interactions }o--|| tweets : "references"

    user_profiles {
        uuid id PK
        text username
        jsonb preferences
    }

    user_interactions {
        uuid id PK
        uuid user_id FK
        uuid tweet_id FK
        text interaction_type
    }
```

## Request/Response Flow

```mermaid
graph TD
    subgraph "Tweet Processing Pipeline"
        A[Twitter Tweet] --> B{Filter<br/>Replies/Retweets?}
        B -->|Yes| C[Skip]
        B -->|No| D[Analyze with LLM]
        D --> E[Extract Keywords]
        E --> F[Match to Markets]
        F --> G[Save to Database]
        G --> H[Broadcast via WebSocket]
    end

    subgraph "HTTP API Endpoints"
        I[GET /api/tweets] --> J[Query Database]
        K[GET /api/tweets/with-analysis] --> J
        L[GET /api/tweets/search] --> J
        M[POST /api/analysis/refresh] --> N[Re-analyze]
        N --> F
    end

    subgraph "WebSocket Events"
        O[New Tweet] --> P[Broadcast to Clients]
        Q[System Message] --> P
        R[Market Update] --> P
    end

    H --> O
    J --> S[Return JSON]
    S --> T[Frontend]
    P --> T
```

## Market Catalog Refresh Cycle

```mermaid
stateDiagram-v2
    [*] --> Idle: Service Started

    Idle --> Fetching: Every 5 minutes
    Fetching --> Processing: Markets Fetched
    Processing --> Writing: Markets Filtered
    Writing --> Updating: Markets Written
    Updating --> Cleaning: Cache Updated
    Cleaning --> Idle: Old Data Deleted

    Fetching --> Error: API Failed
    Processing --> Error: Filter Failed
    Writing --> Error: DB Failed
    Error --> Idle: Retry Next Cycle

    note right of Fetching
        Fetch from Polymarket API
        Filter by volume/liquidity
    end note

    note right of Writing
        UPSERT to market_catalog
        Zero-downtime strategy
    end note

    note right of Cleaning
        Delete data older than
        10 minutes
    end note
```

## Analysis Refresh Strategy

```mermaid
graph TB
    subgraph "Analysis Types"
        OA[Original Analysis<br/>Point-in-Time]
        RA[Refreshed Analysis<br/>Current State]
    end

    subgraph "Refresh Triggers"
        AT[Auto-Refresh<br/>Every 24 hours]
        MT[Manual Refresh<br/>User Request]
        ST[Stale Detection<br/>Older than threshold]
    end

    subgraph "Refresh Process"
        RT[Re-analyze Tweet]
        RM[Re-match Markets]
        SU[Save Updated Analysis]
    end

    AT --> RT
    MT --> RT
    ST --> RT

    RT --> RM
    RM --> SU
    SU --> RA

    OA -->|Preserved| DB[(Database)]
    RA -->|Stored Separately| DB
```

## Technology Stack

```mermaid
graph TB
    subgraph "Frontend"
        FE[React/Next.js]
        WS_CLIENT[WebSocket Client]
    end

    subgraph "Backend - Node.js/TypeScript"
        EX[Express.js]
        WS_SERVER[ws Library]
        SUPABASE_CLIENT[Supabase Client]
    end

    subgraph "AI Services"
        GEMINI[Google Gemini API]
        OPENAI[OpenAI API]
    end

    subgraph "External APIs"
        TWITTER_API[Twitter API<br/>twitterapi.io]
        POLYMARKET[Polymarket API<br/>gamma-api.polymarket.com]
    end

    subgraph "Database"
        POSTGRES[PostgreSQL<br/>via Supabase]
    end

    FE --> EX
    FE --> WS_CLIENT
    WS_CLIENT --> WS_SERVER
    EX --> SUPABASE_CLIENT
    EX --> GEMINI
    EX --> OPENAI
    EX --> TWITTER_API
    EX --> POLYMARKET
    SUPABASE_CLIENT --> POSTGRES
```

## Key Features

### 1. Real-time Tweet Processing

-  Twitter WebSocket → Analysis → Market Matching → Database → Broadcast

### 2. Intelligent Market Matching

-  LLM-based semantic matching (GPT-4 mini)
-  Cached market catalog (refreshed every 5 minutes)
-  Fallback to keyword search

### 3. Dual Analysis Strategy

-  **Original**: Point-in-time snapshot (fast, historical)
-  **Refreshed**: Current market state (accurate, up-to-date)

### 4. Data Persistence

-  All tweets saved to database
-  Recovery on app restart
-  Historical data access

### 5. Frontend Integration

-  **HTTP**: Initial page load (from database)
-  **WebSocket**: Real-time updates (new tweets)

## Performance Characteristics

-  **Tweet Analysis**: 1-3 seconds (LLM API call)
-  **Market Matching**: 2-5 seconds (LLM + catalog search)
-  **Database Write**: 50-100ms per tweet
-  **WebSocket Broadcast**: <10ms per client
-  **Market Catalog Refresh**: 5-30 seconds (depends on market count)
-  **Analysis Auto-Refresh**: Background, every 24 hours

## Scalability Considerations

-  **Market Catalog**: Cached in-memory + database (fast lookups)
-  **Tweet Storage**: Database with pagination (handles large volumes)
-  **WebSocket**: Broadcasts to all connected clients efficiently
-  **LLM Calls**: Rate-limited and batched where possible
-  **Database**: Indexed for fast queries (created_at, tweet_id, etc.)
