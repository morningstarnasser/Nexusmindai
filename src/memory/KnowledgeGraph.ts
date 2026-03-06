/**
 * KnowledgeGraph.ts
 * 
 * In-memory graph store with nodes (entities) and edges (relationships).
 * Supports pathfinding and semantic relationship queries.
 */

import { Logger } from '../utils/logger.js';

interface GraphNode {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
}

interface GraphEdge {
  sourceId: string;
  targetId: string;
  relationship: string;
  attributes: Record<string, unknown>;
  weight: number;
  createdAt: Date;
}

interface PathResult {
  path: string[];
  distance: number;
  edges: string[];
}

interface NeighborResult {
  targetId: string;
  relationship: string;
  weight: number;
}

/**
 * KnowledgeGraph - In-memory semantic graph
 */
export class KnowledgeGraph {
  private logger: Logger;
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge[]> = new Map();
  private reverseEdges: Map<string, GraphEdge[]> = new Map();

  constructor() {
    this.logger = new Logger('KnowledgeGraph');
  }

  /**
   * Initialize knowledge graph
   */
  async initialize(): Promise<void> {
    this.logger.debug('Initialized KnowledgeGraph');
  }

  /**
   * Add node to graph
   */
  async addNode(
    id: string,
    type: string,
    attributes: Record<string, unknown> = {}
  ): Promise<GraphNode> {
    try {
      if (this.nodes.has(id)) {
        const node = this.nodes.get(id)!;
        node.updatedAt = new Date();
        node.accessCount++;
        return node;
      }

      const node: GraphNode = {
        id,
        type,
        attributes,
        createdAt: new Date(),
        updatedAt: new Date(),
        accessCount: 0,
      };

      this.nodes.set(id, node);
      this.logger.debug(`Added node ${id} of type ${type}`);
      return node;
    } catch (error) {
      this.logger.error(`Error adding node ${id}`, error);
      throw error;
    }
  }

  /**
   * Get node by ID
   */
  getNode(id: string): GraphNode | null {
    const node = this.nodes.get(id);
    if (node) {
      node.accessCount++;
      node.updatedAt = new Date();
    }
    return node || null;
  }

  /**
   * Add edge to graph
   */
  async addEdge(
    sourceId: string,
    targetId: string,
    relationship: string,
    attributes: Record<string, unknown> = {},
    weight: number = 1
  ): Promise<GraphEdge> {
    try {
      // Ensure nodes exist
      if (!this.nodes.has(sourceId)) {
        await this.addNode(sourceId, 'unknown');
      }
      if (!this.nodes.has(targetId)) {
        await this.addNode(targetId, 'unknown');
      }

      const edge: GraphEdge = {
        sourceId,
        targetId,
        relationship,
        attributes,
        weight,
        createdAt: new Date(),
      };

      // Add to forward edges
      if (!this.edges.has(sourceId)) {
        this.edges.set(sourceId, []);
      }
      this.edges.get(sourceId)!.push(edge);

      // Add to reverse edges for bi-directional search
      if (!this.reverseEdges.has(targetId)) {
        this.reverseEdges.set(targetId, []);
      }
      this.reverseEdges.get(targetId)!.push(edge);

      this.logger.debug(`Added edge ${sourceId} -[${relationship}]-> ${targetId}`);
      return edge;
    } catch (error) {
      this.logger.error(`Error adding edge ${sourceId} -> ${targetId}`, error);
      throw error;
    }
  }

  /**
   * Get neighbors of a node
   */
  async getNeighbors(nodeId: string, limit: number = 20): Promise<NeighborResult[]> {
    try {
      const edges = this.edges.get(nodeId) || [];
      
      return edges
        .sort((a, b) => b.weight - a.weight)
        .slice(0, limit)
        .map(edge => ({
          targetId: edge.targetId,
          relationship: edge.relationship,
          weight: edge.weight,
        }));
    } catch (error) {
      this.logger.error(`Error getting neighbors of ${nodeId}`, error);
      throw error;
    }
  }

  /**
   * Find shortest path between two nodes
   */
  async findPath(
    sourceId: string,
    targetId: string,
    maxDepth: number = 5
  ): Promise<PathResult | null> {
    try {
      const path = this.breadthFirstSearch(sourceId, targetId, maxDepth);
      if (!path) {
        return null;
      }

      const edgeList: string[] = [];
      for (let i = 0; i < path.length - 1; i++) {
        const edge = this.edges.get(path[i])?.find(e => e.targetId === path[i + 1]);
        if (edge) {
          edgeList.push(`[${edge.relationship}]`);
        }
      }

      return {
        path,
        distance: path.length - 1,
        edges: edgeList,
      };
    } catch (error) {
      this.logger.error(`Error finding path from ${sourceId} to ${targetId}`, error);
      throw error;
    }
  }

  /**
   * Breadth-first search for pathfinding
   */
  private breadthFirstSearch(
    sourceId: string,
    targetId: string,
    maxDepth: number
  ): string[] | null {
    const queue: Array<{ id: string; path: string[] }> = [{ id: sourceId, path: [sourceId] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;

      if (id === targetId) {
        return path;
      }

      if (path.length - 1 >= maxDepth) {
        continue;
      }

      if (visited.has(id)) {
        continue;
      }

      visited.add(id);

      const neighbors = this.edges.get(id) || [];
      for (const edge of neighbors) {
        if (!visited.has(edge.targetId)) {
          queue.push({
            id: edge.targetId,
            path: [...path, edge.targetId],
          });
        }
      }
    }

    return null;
  }

  /**
   * Query graph using simple pattern
   */
  async query(pattern: {
    nodeType?: string;
    relationshipType?: string;
    limit?: number;
  }): Promise<GraphNode[] | GraphEdge[]> {
    try {
      const limit = pattern.limit || 100;

      // Query nodes
      if (pattern.nodeType) {
        return Array.from(this.nodes.values())
          .filter(n => n.type === pattern.nodeType)
          .slice(0, limit);
      }

      // Query edges
      if (pattern.relationshipType) {
        const results: GraphEdge[] = [];
        for (const edgeList of this.edges.values()) {
          results.push(...edgeList.filter(e => e.relationship === pattern.relationshipType));
        }
        return results.slice(0, limit);
      }

      return [];
    } catch (error) {
      this.logger.error('Error querying graph', error);
      throw error;
    }
  }

  /**
   * Get nodes of specific type
   */
  getNodesByType(type: string, limit: number = 100): GraphNode[] {
    return Array.from(this.nodes.values())
      .filter(n => n.type === type)
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Get edges of specific type
   */
  getEdgesByRelationship(relationship: string, limit: number = 100): GraphEdge[] {
    const results: GraphEdge[] = [];
    
    for (const edgeList of this.edges.values()) {
      results.push(...edgeList.filter(e => e.relationship === relationship));
    }

    return results
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit);
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    nodeCount: number;
    edgeCount: number;
    nodeTypes: string[];
    relationshipTypes: Set<string>;
    averageOutDegree: number;
  } {
    const relationshipTypes = new Set<string>();
    let totalEdges = 0;

    for (const edgeList of this.edges.values()) {
      totalEdges += edgeList.length;
      edgeList.forEach(e => relationshipTypes.add(e.relationship));
    }

    const nodeTypes = Array.from(new Set(Array.from(this.nodes.values()).map(n => n.type)));

    return {
      nodeCount: this.nodes.size,
      edgeCount: totalEdges,
      nodeTypes,
      relationshipTypes,
      averageOutDegree: totalEdges / Math.max(this.nodes.size, 1),
    };
  }

  /**
   * Get entity count
   */
  getEntityCount(): number {
    return this.nodes.size;
  }

  /**
   * Get edge count
   */
  getEdgeCount(): number {
    let count = 0;
    for (const edgeList of this.edges.values()) {
      count += edgeList.length;
    }
    return count;
  }

  /**
   * Export graph as JSON
   */
  async export(): Promise<{
    nodes: GraphNode[];
    edges: GraphEdge[];
    stats: Record<string, unknown>;
  }> {
    try {
      const edges: GraphEdge[] = [];
      for (const edgeList of this.edges.values()) {
        edges.push(...edgeList);
      }

      return {
        nodes: Array.from(this.nodes.values()),
        edges,
        stats: this.getStats(),
      };
    } catch (error) {
      this.logger.error('Error exporting graph', error);
      throw error;
    }
  }

  /**
   * Clear graph
   */
  async clear(): Promise<void> {
    this.nodes.clear();
    this.edges.clear();
    this.reverseEdges.clear();
    this.logger.info('Cleared knowledge graph');
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    await this.clear();
    this.logger.info('KnowledgeGraph shutdown');
  }
}

export default KnowledgeGraph;
