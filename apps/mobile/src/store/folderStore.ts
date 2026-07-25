// Folder type shared across screens and components.
// All folder data fetching and mutations now go through React Query
// (useFolders, useAddFolder, useDeleteFolder in src/hooks/queries.ts).
export interface Folder {
  _id?: string;
  id?: string;
  name: string;
  color: string;
  userId?: string;
  itemCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
