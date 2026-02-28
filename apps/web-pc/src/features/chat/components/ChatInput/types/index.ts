import type { RcFile } from "antd/es/upload";

export interface ChunkInfo {
  index: number;
  chunk: Blob;
}

export interface UploadTask {
  chunk: ChunkInfo;
  retryCount: number;
}

export interface UploadResult {
  success: boolean;
  failedIndexes: number[];
}

export interface FileUploadState {
  fileId: string | null;
  fileName: string | null;
  filePath: string | null;
  fileSize: number;
  chunks: ChunkInfo[];
}

export interface FileInfo {
  fileId: string | null;
  fileName: string | null;
  filePath: string | null;
}

export interface FileListItem {
  uid: string;
  name?: string;
  status?: "uploading" | "done" | "error" | "removed";
  percent?: number;
  [key: string]: any;
}

export interface UseFileUploadReturn {
  // 状态
  fileList: FileListItem[];
  uploadProgress: number;
  isUploading: boolean;
  isLoading: boolean;
  uploadedChunks: number[];
  failedChunks: number[];
  fileInfo: FileInfo;
  // 方法
  selectFile: (file: RcFile) => void;
  cancelUpload: () => void;
  retryUpload: () => Promise<void>;
  resetUploadState: () => void;
  setFileList: React.Dispatch<React.SetStateAction<FileListItem[]>>;
}
