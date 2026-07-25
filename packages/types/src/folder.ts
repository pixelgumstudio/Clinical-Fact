export interface Folder {
  id: string;
  userId: string;
  name: string;
  noteCount: number;
  createdAt: Date;
}

export interface CreateFolderRequest {
  name: string;
}

export interface UpdateFolderRequest {
  name: string;
}
