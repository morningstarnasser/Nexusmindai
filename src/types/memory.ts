/**
 * NexusMind Memory Type Definitions
 * Core types for memory management and knowledge representation
 */

/**
 * Memory layer type
 */
export enum MemoryLayer {
  WORKING = 'working',
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  SEMANTIC = 'semantic',
  EPISODIC = 'episodic',
  PROCEDURAL = 'procedural',
}

/**
 * Memory entry importance/priority
 */
export enum MemoryImportance {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Knowledge node type
 */
export enum KnowledgeNodeType {
  CONCEPT = 'concept',
  ENTITY = 'entity',
  RELATIONSHIP = 'relationship',
  EVENT = 'event',
  FACT = 'fact',
  RULE = 'rule',
}

/**
 * Relationship type between knowledge nodes
 */
export enum RelationshipType {
  IS_A = 'is_a',
  PART_OF = 'part_of',
  RELATED_TO = 'related_to',
  CAUSED_BY = 'caused_by',
  SIMILAR_TO = 'similar_to',
  OPPOSITE_OF = 'opposite_of',
  DEPENDS_ON = 'depends_on',
  CONTAINS = 'contains',
  CUSTOM = 'custom',
}

/**
 * Single memory entry
 */
export interface MemoryEntry {
  // Identification
  id: string;
  agentId: string;
  userId?: string;

  // Content
  content: string;
  summary?: string;
  contentHash: string;

  // Classification
  layer: MemoryLayer;
  type: 'message' | 'fact' | 'learning' | 'feedback' | 'context';
  importance: MemoryImportance;
  category?: string;

  // Timestamps
  createdAt: Date;
  accessedAt: Date;
  expiresAt?: Date;

  // Metadata
  tags: string[];
  source?: string;
  references?: string[];
  embeddings?: number[];
  metadata?: Record<string, unknown>;

  // Lifecycle
  isActive: boolean;
  accessCount: number;
  relevanceScore?: number;
}

/**
 * Knowledge node in knowledge graph
 */
export interface KnowledgeNode {
  // Identification
  id: string;
  agentId: string;
  name: string;

  // Content
  type: KnowledgeNodeType;
  description: string;
  properties: Record<string, unknown>;

  // Embedding
  embedding?: number[];
  embeddingModel?: string;

  // Relationships
  relatedNodes: Array<{
    nodeId: string;
    relationshipType: RelationshipType;
    weight: number;
  }>;

  // Metadata
  confidence: number;
  source?: string;
  dateAdded: Date;
  lastUpdated: Date;
  tags?: string[];

  // Lifecycle
  isVerified: boolean;
  verificationDate?: Date;
  verificationSource?: string;
}

/**
 * Edge in knowledge graph
 */
export interface KnowledgeEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: RelationshipType;
  weight: number;
  description?: string;
  metadata?: Record<string, unknown>;
  confidence: number;
  dateAdded: Date;
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
  layer?: MemoryLayer;
  distance?: number;
}

/**
 * Memory query specification
 */
export interface MemoryQuery {
  // Text search
  query?: string;
  
  // Vector search
  embedding?: number[];
  similarityThreshold?: number;

  // Filtering
  layers?: MemoryLayer[];
  agentId?: string;
  userId?: string;
  tags?: string[];
  categories?: string[];
  importance?: MemoryImportance[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sortBy?: 'relevance' | 'date' | 'importance' | 'accessCount';
  sortOrder?: 'asc' | 'desc';

  // Options
  includeExpired?: boolean;
  includeInactive?: boolean;
}

/**
 * Memory search result set
 */
export interface MemorySearchResults {
  query: MemoryQuery;
  results: MemoryEntry[];
  totalCount: number;
  executionTimeMs: number;
  hasMore: boolean;
}

/**
 * Memory consolidation task
 */
export interface MemoryConsolidationTask {
  agentId: string;
  sourceLayer: MemoryLayer;
  targetLayer: MemoryLayer;
  criteria: {
    accessCountThreshold?: number;
    ageThreshold?: number;
    importanceThreshold?: MemoryImportance;
  };
  batchSize?: number;
  autoSchedule?: boolean;
}

/**
 * Memory statistics
 */
export interface MemoryStatistics {
  agentId: string;
  layerStats: Record<MemoryLayer, {
    totalEntries: number;
    totalSize: number;
    averageAge: number;
    accessedInLastDay: number;
  }>;
  knowledgeGraphStats: {
    totalNodes: number;
    totalEdges: number;
    averageConnectivity: number;
    densityScore: number;
  };
  vectorIndexStats: {
    totalVectors: number;
    indexSize: number;
    indexHealth: number;
  };
  generatedAt: Date;
}

/**
 * Memory performance metrics
 */
export interface MemoryMetrics {
  retrievalLatencyMs: number;
  searchPrecision: number;
  searchRecall: number;
  cacheHitRate: number;
  compressionRatio: number;
  indexFragmentationRatio: number;
  totalMemoryUsage: number;
  queryCount: number;
  averageQueryCost: number;
}

/**
 * Memory export format
 */
export interface MemoryExport {
  agentId: string;
  exportDate: Date;
  entries: MemoryEntry[];
  knowledgeGraph: {
    nodes: KnowledgeNode[];
    edges: KnowledgeEdge[];
  };
  metadata: Record<string, unknown>;
}

/**
 * Memory backup
 */
export interface MemoryBackup {
  id: string;
  agentId: string;
  createdAt: Date;
  expiresAt?: Date;
  size: number;
  compressionAlgorithm?: string;
  encryptionAlgorithm?: string;
  checksum: string;
  location: string;
  metadata?: Record<string, unknown>;
}

/**
 * Memory layer configuration
 */
export interface MemoryLayerConfig {
  layer: MemoryLayer;
  maxSize: number;
  ttl?: number;
  compressionEnabled: boolean;
  vectorizationEnabled: boolean;
  persistenceEnabled: boolean;
  autoConsolidation?: {
    enabled: boolean;
    schedule: string;
  };
}

/**
 * Vector index configuration
 */
export interface VectorIndexConfig {
  type: 'hnsw' | 'ivf' | 'flat' | 'lsh';
  dimension: number;
  metric: 'cosine' | 'euclidean' | 'manhattan';
  indexParams?: {
    maxConnections?: number;
    efConstruction?: number;
    efSearch?: number;
    nLists?: number;
    nProbes?: number;
  };
  batchIndexing?: boolean;
  autoRebuild?: boolean;
}
