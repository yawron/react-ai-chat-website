import { CHUNK_SIZE } from "./file-config";

export interface FileHashResult {
  hash: string;
  chunks: ArrayBuffer[];
}

/**
 * 使用 WebWorker 计算文件 hash 并获取分片
 */
export const calculateFileHash = async (
  file: File,
): Promise<FileHashResult> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("@pc/workers/fileHash.worker.ts", import.meta.url),
      { type: "module" },
    );

    const cleanup = () => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.terminate();
    };

    const handleMessage = (
      event: MessageEvent<{
        hash?: string;
        error?: string;
        progress?: number;
        chunks?: ArrayBuffer[];
      }>,
    ) => {
      const { hash, error, progress, chunks } = event.data || {};

      // 忽略进度消息，只处理最终结果
      if (progress !== undefined) {
        return;
      }

      if (error) {
        cleanup();
        reject(new Error(error));
        return;
      }
      if (!hash) {
        cleanup();
        reject(
          new Error(
            `Failed to calculate file hash: ${JSON.stringify(event.data)}`,
          ),
        );
        return;
      }
      cleanup();
      resolve({ hash, chunks: chunks || [] });
    };

    const handleError = (event: ErrorEvent) => {
      cleanup();
      reject(event.error || new Error(event.message));
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage({ file, chunkSize: CHUNK_SIZE });
  });
};

/**
 * 计算上传进度百分比
 */
export const calculateProgress = (
  uploadedCount: number,
  totalChunks: number,
): number => {
  return Math.round((uploadedCount / totalChunks) * 100);
};
