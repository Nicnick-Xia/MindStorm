export interface NodeData {
  id: string;
  text: string;
  parentId: string | null;
  depth: number;
  isExpanded: boolean;
  isLoading: boolean;
  childrenIds: string[];
}

export interface Point {
  x: number;
  y: number;
}

export interface TreeLayoutNode {
  id: string;
  x: number;
  y: number;
  data: NodeData;
  parent?: TreeLayoutNode | null; 
  children?: TreeLayoutNode[];
}

export interface GeminiResponse {
  ideas: string[];
}
