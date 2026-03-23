export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  childIds: string[];
  isExpanded: boolean;
  isLoading: boolean;
  isProtected: boolean;
  isFolder: boolean;
  hasLoaded: boolean;
}

export type FlatTree = Record<string, FolderNode>;

export interface ManualDrive {
  id: string;
  name: string;
  isProtected?: boolean;
}

export interface TreeContextType {
  onToggle: (id: string) => void;
  onNavigate: (id: string) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  setDragOverFolderId: (id: string | null) => void;
  dragOverFolderId: string | null;
  tree: FlatTree;
  canEdit: boolean;
  rootFolderId: string;
}
