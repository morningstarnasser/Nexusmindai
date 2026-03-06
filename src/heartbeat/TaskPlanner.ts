/**
 * TaskPlanner.ts
 * 
 * Plans task execution order based on priority, dependencies, resource availability,
 * and token budget constraints. Detects conflicts between tasks.
 */

import { Logger } from '../utils/logger.js';
import { ITask, TaskPriority } from '../types/index.js';

interface ResourceRequirements {
  memoryMb?: number;
  computeUnits?: number;
  tokens?: number;
  diskMb?: number;
}

interface TaskExecutionPlan {
  task: ITask;
  estimatedTokens: number;
  estimatedDuration: number;
  priority: number;
  conflictsWith: string[];
  canExecute: boolean;
  reason?: string;
}

interface ExecutionContext {
  availableTokens: number;
  availableMemoryMb: number;
  availableComputeUnits: number;
  activeTasks: Set<string>;
  startTime: Date;
}

/**
 * TaskPlanner - Plans task execution with dependency and resource awareness
 */
export class TaskPlanner {
  private logger: Logger;
  private priorityScores: Map<TaskPriority, number> = new Map([
    ['minimal', 1],
    ['low', 2],
    ['normal', 3],
    ['high', 4],
    ['critical', 5],
  ]);

  private tokenBudgetPerTask = 10000;
  private memoryBudgetMb = 2048;
  private computeUnits = 100;

  constructor() {
    this.logger = new Logger('TaskPlanner');
  }

  /**
   * Plan execution of tasks considering constraints
   */
  async planExecution(
    tasks: ITask[],
    context?: Partial<ExecutionContext>
  ): Promise<TaskExecutionPlan[]> {
    try {
      const executionContext: ExecutionContext = {
        availableTokens: context?.availableTokens ?? this.tokenBudgetPerTask * 10,
        availableMemoryMb: context?.availableMemoryMb ?? this.memoryBudgetMb,
        availableComputeUnits: context?.availableComputeUnits ?? this.computeUnits,
        activeTasks: context?.activeTasks ?? new Set(),
        startTime: context?.startTime ?? new Date(),
      };

      // Build dependency graph
      const depGraph = this.buildDependencyGraph(tasks);

      // Detect circular dependencies
      const hasCycles = this.detectCycles(depGraph);
      if (hasCycles) {
        this.logger.warn('Circular dependency detected in task list');
      }

      // Sort tasks by priority and dependencies
      const sortedTasks = this.topologicalSort(tasks, depGraph);

      // Create execution plans
      const plans: TaskExecutionPlan[] = [];
      let tokenBudgetRemaining = executionContext.availableTokens;
      let memoryRemaining = executionContext.availableMemoryMb;

      for (const task of sortedTasks) {
        const estimatedTokens = this.estimateTokenCost(task);
        const estimatedDuration = this.estimateDuration(task);
        const requiredMemory = task.resourceRequirements?.memoryMb || 256;

        // Detect conflicts
        const conflictsWith = this.detectTaskConflicts(task, tasks);

        // Check if task can execute
        const canExecute = 
          tokenBudgetRemaining >= estimatedTokens &&
          memoryRemaining >= requiredMemory &&
          this.dependenciesSatisfied(task, plans) &&
          conflictsWith.every(conflictId => !executionContext.activeTasks.has(conflictId));

        let reason: string | undefined;
        if (!canExecute) {
          if (tokenBudgetRemaining < estimatedTokens) {
            reason = `Insufficient tokens: need ${estimatedTokens}, have ${tokenBudgetRemaining}`;
          } else if (memoryRemaining < requiredMemory) {
            reason = `Insufficient memory: need ${requiredMemory}MB, have ${memoryRemaining}MB`;
          } else if (!this.dependenciesSatisfied(task, plans)) {
            reason = 'Unmet dependencies';
          } else if (conflictsWith.some(id => executionContext.activeTasks.has(id))) {
            reason = 'Conflicts with active tasks';
          }
        }

        const plan: TaskExecutionPlan = {
          task,
          estimatedTokens,
          estimatedDuration,
          priority: this.priorityScores.get(task.priority || 'normal') || 3,
          conflictsWith,
          canExecute,
          reason,
        };

        plans.push(plan);

        // Update budget
        if (canExecute) {
          tokenBudgetRemaining -= estimatedTokens;
          memoryRemaining -= requiredMemory;
          executionContext.activeTasks.add(task.id);
        }
      }

      // Sort plans by priority (high priority first)
      plans.sort((a, b) => {
        if (a.canExecute !== b.canExecute) {
          return a.canExecute ? -1 : 1;
        }
        return b.priority - a.priority;
      });

      this.logger.debug(
        `Planned execution for ${plans.filter(p => p.canExecute).length}/${tasks.length} tasks`
      );

      return plans;
    } catch (error) {
      this.logger.error('Error planning task execution', error);
      throw error;
    }
  }

  /**
   * Build dependency graph
   */
  private buildDependencyGraph(tasks: ITask[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const task of tasks) {
      graph.set(task.id, task.dependencies || []);
    }

    return graph;
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCycles(graph: Map<string, string[]>): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of graph.keys()) {
      if (!visited.has(nodeId)) {
        if (hasCycleDFS(nodeId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Topological sort of tasks
   */
  private topologicalSort(tasks: ITask[], graph: Map<string, string[]>): ITask[] {
    const visited = new Set<string>();
    const result: ITask[] = [];

    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      const deps = graph.get(taskId) || [];
      for (const depId of deps) {
        visit(depId);
      }

      const task = tasks.find(t => t.id === taskId);
      if (task) {
        result.push(task);
      }
    };

    for (const task of tasks) {
      visit(task.id);
    }

    return result;
  }

  /**
   * Estimate token cost for a task
   */
  private estimateTokenCost(task: ITask): number {
    // Base cost
    let cost = this.tokenBudgetPerTask / 2;

    // Adjust by priority
    const priorityMultiplier = this.priorityScores.get(task.priority || 'normal') || 3;
    cost *= (priorityMultiplier / 3);

    // Adjust by specified token requirement
    if (task.resourceRequirements?.tokens) {
      cost = Math.max(cost, task.resourceRequirements.tokens);
    }

    return Math.ceil(cost);
  }

  /**
   * Estimate execution duration
   */
  private estimateDuration(task: ITask): number {
    // Default: task timeout or 30 seconds
    return (task.timeout || 30000) / 1000;
  }

  /**
   * Check if task dependencies are satisfied
   */
  private dependenciesSatisfied(task: ITask, executedPlans: TaskExecutionPlan[]): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    const executedIds = new Set(executedPlans.map(p => p.task.id));
    return task.dependencies.every(depId => executedIds.has(depId));
  }

  /**
   * Detect conflicts with other tasks
   */
  private detectTaskConflicts(task: ITask, allTasks: ITask[]): string[] {
    const conflicts: string[] = [];

    for (const otherTask of allTasks) {
      if (task.id === otherTask.id) continue;

      // Check for resource conflicts
      if (this.hasResourceConflict(task, otherTask)) {
        conflicts.push(otherTask.id);
      }

      // Check for explicit conflict markers
      if (task.resourceRequirements?.conflictsWith?.includes(otherTask.id)) {
        conflicts.push(otherTask.id);
      }
    }

    return conflicts;
  }

  /**
   * Check for resource conflicts between tasks
   */
  private hasResourceConflict(task1: ITask, task2: ITask): boolean {
    // Tasks requiring exclusive resource access conflict
    const req1 = task1.resourceRequirements;
    const req2 = task2.resourceRequirements;

    if (!req1 || !req2) return false;

    // Check if both require exclusive compute access
    if (req1.exclusive && req2.exclusive && req1.computeUnits && req2.computeUnits) {
      return true;
    }

    return false;
  }

  /**
   * Get execution feasibility report
   */
  getExecutionFeasibility(
    tasks: ITask[],
    context?: Partial<ExecutionContext>
  ): {
    feasible: boolean;
    executableCount: number;
    blockedCount: number;
    reasons: string[];
  } {
    try {
      const executionContext: ExecutionContext = {
        availableTokens: context?.availableTokens ?? this.tokenBudgetPerTask * 10,
        availableMemoryMb: context?.availableMemoryMb ?? this.memoryBudgetMb,
        availableComputeUnits: context?.availableComputeUnits ?? this.computeUnits,
        activeTasks: context?.activeTasks ?? new Set(),
        startTime: context?.startTime ?? new Date(),
      };

      let executableCount = 0;
      let blockedCount = 0;
      const reasons: string[] = [];

      const depGraph = this.buildDependencyGraph(tasks);
      const hasCycles = this.detectCycles(depGraph);

      if (hasCycles) {
        reasons.push('Circular dependencies detected');
        blockedCount = tasks.length;
      } else {
        let tokenBudget = executionContext.availableTokens;

        for (const task of tasks) {
          const tokenCost = this.estimateTokenCost(task);
          if (tokenBudget >= tokenCost) {
            executableCount++;
            tokenBudget -= tokenCost;
          } else {
            blockedCount++;
            if (reasons.length < 5) {
              reasons.push(`Task ${task.id} requires ${tokenCost} tokens, only ${tokenBudget} available`);
            }
          }
        }
      }

      return {
        feasible: blockedCount === 0,
        executableCount,
        blockedCount,
        reasons,
      };
    } catch (error) {
      this.logger.error('Error checking execution feasibility', error);
      return {
        feasible: false,
        executableCount: 0,
        blockedCount: tasks.length,
        reasons: ['Error during feasibility check'],
      };
    }
  }

  /**
   * Set token budget per task
   */
  setTokenBudget(budget: number): void {
    this.tokenBudgetPerTask = budget;
    this.logger.debug(`Token budget per task set to ${budget}`);
  }

  /**
   * Set memory budget
   */
  setMemoryBudget(budgetMb: number): void {
    this.memoryBudgetMb = budgetMb;
    this.logger.debug(`Memory budget set to ${budgetMb}MB`);
  }
}

export default TaskPlanner;
