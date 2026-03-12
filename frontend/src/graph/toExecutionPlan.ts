// ============================================
// Graph → Execution Plan conversion
// ============================================

import type { NodeData, ConnectionData } from './types';
import { getNodeDef } from './node-registry';

export interface ExecutionStep {
  id: string;
  name: string;
  tool: string;
  description: string;
  depends_on: string[];
  references?: { nodeId: string; title: string; nodeType: string; portValues?: Record<string, unknown> }[];
  inputs?: Record<string, { nodeType: string; title: string; portValues?: Record<string, unknown> }>;
}

export interface ExecutionPlan {
  goal: string;
  steps: ExecutionStep[];
}

function buildGraphMaps(nodes: Map<string, NodeData>, connections: Map<string, ConnectionData>) {
  const connectedIds = new Set<string>();
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const node of nodes.values()) {
    children.set(node.id, []);
    parents.set(node.id, []);
  }
  for (const conn of connections.values()) {
    if (conn.type === 'ref') continue;
    children.get(conn.from)?.push(conn.to);
    parents.get(conn.to)?.push(conn.from);
    connectedIds.add(conn.from);
    connectedIds.add(conn.to);
  }
  return { children, parents, connectedIds };
}

export function toExecutionPlan(
  nodes: Map<string, NodeData>,
  connections: Map<string, ConnectionData>,
  options: { excludeResult?: boolean } = {},
): ExecutionPlan | null {
  if (nodes.size === 0) return null;

  const { excludeResult = false } = options;
  const { children, parents, connectedIds } = buildGraphMaps(nodes, connections);

  // Detect Tool Nodes connected to Step Nodes via flow
  // Tool Node → Step means "use this tool for this step"
  const toolNodeParentOf = new Map<string, string>(); // toolNodeId → stepNodeId
  const stepToolAssignment = new Map<string, string>(); // stepNodeId → tool name
  for (const conn of connections.values()) {
    if (conn.type !== 'flow') continue;
    const fromNode = nodes.get(conn.from);
    const toNode = nodes.get(conn.to);
    if (!fromNode || !toNode) continue;
    const fromDef = getNodeDef(fromNode.type);
    const toDef = getNodeDef(toNode.type);
    if (fromDef?.category === 'Tool' && !fromDef.dataOnly && toDef && !toDef.dataOnly) {
      toolNodeParentOf.set(fromNode.id, toNode.id);
      const toolName = fromNode.tool || fromDef.defaultConfig?.tool || '';
      if (toolName) {
        stepToolAssignment.set(toNode.id, toolName);
      }
    }
  }

  // Filter to candidate step nodes (connected, not analysis, not dataOnly, not Tool Nodes used as parents)
  const candidateIds = new Set<string>();
  for (const node of nodes.values()) {
    if (!connectedIds.has(node.id)) continue;
    if (node.id === 'analysis-node') continue;
    if (toolNodeParentOf.has(node.id)) continue; // Exclude Tool Nodes acting as tool providers
    const def = getNodeDef(node.type);
    if (def?.dataOnly) continue;
    if (excludeResult && node.type === 'analyze') continue;
    candidateIds.add(node.id);
  }

  // Topological sort (Kahn's algorithm)
  const filteredChildren = new Map<string, string[]>();
  const filteredParents = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const id of candidateIds) {
    filteredChildren.set(id, (children.get(id) || []).filter(c => candidateIds.has(c)));
    filteredParents.set(id, (parents.get(id) || []).filter(p => candidateIds.has(p)));
    inDegree.set(id, filteredParents.get(id)!.length);
  }

  const depthCache = new Map<string, number>();
  function maxDescendantDepth(nodeId: string): number {
    if (depthCache.has(nodeId)) return depthCache.get(nodeId)!;
    const kids = filteredChildren.get(nodeId) || [];
    if (kids.length === 0) { depthCache.set(nodeId, 0); return 0; }
    const d = 1 + Math.max(...kids.map(c => maxDescendantDepth(c)));
    depthCache.set(nodeId, d);
    return d;
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    if (queue.length > 1) {
      queue.sort((a, b) => maxDescendantDepth(b) - maxDescendantDepth(a));
    }
    const id = queue.shift()!;
    sorted.push(id);
    for (const childId of (filteredChildren.get(id) || [])) {
      inDegree.set(childId, inDegree.get(childId)! - 1);
      if (inDegree.get(childId) === 0) queue.push(childId);
    }
  }

  // Assign numbering
  const numbering = new Map<string, string>();
  let mainCounter = 0;
  for (const nodeId of sorted) {
    const parentIds = filteredParents.get(nodeId) || [];
    if (parentIds.length === 0) {
      mainCounter++;
      numbering.set(nodeId, `${mainCounter}`);
    } else if (parentIds.length === 1) {
      const parentId = parentIds[0];
      const siblings = filteredChildren.get(parentId) || [];
      if (siblings.length > 1) {
        const siblingIndex = siblings.indexOf(nodeId) + 1;
        const parentNum = numbering.get(parentId) || `${mainCounter}`;
        numbering.set(nodeId, `${parentNum}-${siblingIndex}`);
      } else {
        mainCounter++;
        numbering.set(nodeId, `${mainCounter}`);
      }
    } else {
      mainCounter++;
      numbering.set(nodeId, `${mainCounter}`);
    }
  }

  // Build steps
  const steps: ExecutionStep[] = sorted.map(nodeId => {
    const node = nodes.get(nodeId)!;
    const refs: ExecutionStep['references'] = [];
    const inputs: Record<string, { nodeType: string; title: string; portValues?: Record<string, unknown> }> = {};

    for (const conn of connections.values()) {
      if (conn.type === 'ref' && conn.to === nodeId) {
        const refNode = nodes.get(conn.from);
        if (refNode) {
          refs.push({ nodeId: refNode.id, title: refNode.title, nodeType: refNode.type, portValues: refNode.portValues });
        }
      }
      if (conn.type === 'flow' && conn.to === nodeId) {
        const parentNode = nodes.get(conn.from);
        if (parentNode) {
          const parentDef = getNodeDef(parentNode.type);
          if (parentDef?.dataOnly) {
            inputs[conn.toPort || 'in'] = { nodeType: parentNode.type, title: parentNode.title, portValues: parentNode.portValues };
          }
        }
      }
    }

    // Tool Node connection overrides node's own tool
    const assignedTool = stepToolAssignment.get(nodeId) || node.tool || '';
    const step: ExecutionStep = {
      id: numbering.get(nodeId) || '',
      name: node.title,
      tool: assignedTool,
      description: node.description || '',
      depends_on: (filteredParents.get(nodeId) || []).map(pid => numbering.get(pid) || ''),
    };
    if (refs.length > 0) step.references = refs;
    if (Object.keys(inputs).length > 0) step.inputs = inputs;
    return step;
  });

  return { goal: '', steps };
}

export function getExecutionPlanHash(nodes: Map<string, NodeData>, connections: Map<string, ConnectionData>): string | null {
  const plan = toExecutionPlan(nodes, connections, { excludeResult: true });
  if (!plan || plan.steps.length === 0) return null;
  return plan.steps.map(s => `${s.id}:${s.tool}:${s.name}`).join('|');
}
