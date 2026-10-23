export interface Program {
  id: string;
  source: string;
  name: string;
  unit: string;
  asset_type: string;
  asset_category: string;
  email: string;
  location: string;
  who_served: string;
  region_served: string;
  description: string;
  funding_source: string;
  funding_amount: string;
  link: string;
  last_verified: string;
  community_facing: string;
  confidence: string;
  keywords: string[];
  audience: string[];
  audience_primary: string;
  region_category: string;
}

export type NodeType = "root" | "unit" | "category" | "program";

export interface TreeNode {
  id: string;
  type: NodeType;
  label: string;
  parent: string | null;
  children: string[];
  count: number;
}

export interface AssetData {
  programs: Program[];
  nodes: Record<string, TreeNode>;
  root: string;
}

export interface Filters {
  hiddenAudiences: Set<string>; // audience group names
  hiddenRegions: Set<string>;
}
