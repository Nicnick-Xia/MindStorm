
import * as d3 from 'd3';
import { NodeData, TreeLayoutNode } from '../types';
import { RADIUS_STEP } from '../constants';

export const calculateTreeLayout = (
  nodes: Record<string, NodeData>,
  rootId: string
): { nodes: TreeLayoutNode[]; links: { source: TreeLayoutNode; target: TreeLayoutNode }[] } => {
  if (!rootId || !nodes[rootId]) return { nodes: [], links: [] };

  // 1. Build Hierarchy
  const stratify = d3.stratify<NodeData>()
    .id(d => d.id)
    .parentId(d => d.parentId);

  const allNodes = Object.values(nodes);
  
  let root;
  try {
     root = stratify(allNodes);
  } catch (e) {
    console.warn("D3 Stratify failed", e);
    return { nodes: [], links: [] };
  }

  // 2. Configure Radial Tree Layout
  // Size is [angle, radius] for radial trees in d3 logic conceptually, 
  // but d3.tree().size([width, height]) maps x to width and y to height.
  // For radial: x should be angle (0 to 2PI), y should be radius.
  const treeLayout = d3.tree<NodeData>()
    .size([2 * Math.PI, 1]) // Radius is normalized 0-1 here, we scale it later
    .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

  // 3. Run Layout
  treeLayout(root);

  // 4. Process Nodes and Links (Convert Polar to Cartesian)
  const layoutNodes: TreeLayoutNode[] = [];
  
  root.descendants().forEach((d) => {
    // d.x is the angle in radians
    // d.y is the depth (normalized). We map depth directly to rings.
    
    const angle = d.x;
    // Root is at 0. Each level adds RADIUS_STEP.
    const radius = d.depth * RADIUS_STEP; 
    
    // Convert Polar (angle, radius) to Cartesian (x, y)
    // Subtract PI/2 to make 0 degrees point upwards
    const x = radius * Math.cos(angle - Math.PI / 2);
    const y = radius * Math.sin(angle - Math.PI / 2);

    layoutNodes.push({
      id: d.data.id,
      data: d.data,
      x,
      y,
      parent: d.parent ? { 
          id: d.parent.data.id, 
          data: d.parent.data,
          x: (d.parent.depth * RADIUS_STEP) * Math.cos(d.parent.x - Math.PI / 2),
          y: (d.parent.depth * RADIUS_STEP) * Math.sin(d.parent.x - Math.PI / 2),
      } : null
    });
  });

  const links: { source: TreeLayoutNode; target: TreeLayoutNode }[] = [];
  root.links().forEach((link) => {
     const sourceNode = layoutNodes.find(n => n.id === link.source.data.id);
     const targetNode = layoutNodes.find(n => n.id === link.target.data.id);

     if (sourceNode && targetNode) {
       links.push({ source: sourceNode, target: targetNode });
     }
  });

  return { nodes: layoutNodes, links };
};
