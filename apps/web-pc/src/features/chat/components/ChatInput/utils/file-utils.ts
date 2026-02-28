import { CHUNK_SIZE } from "./file-config";
import type { ChunkInfo } from "../types";

/**
 * 创建文件分片
 */
export const createFileChunks = (file: File): ChunkInfo[] => {
  const chunks: ChunkInfo[] = [];
  const chunksCount = Math.ceil(file.size / CHUNK_SIZE);

  for (let i = 0; i < chunksCount; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);
    chunks.push({
      index: i,
      chunk: chunk,
    });
  }

  return chunks;
};

/**
 * 使用 WebWorker 计算文件 hash（流式计算）
 */
export const calculateFileHash = async (file: File): Promise<string> => {
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
      }>,
    ) => {
      console.log("Worker message:", event.data);
      const { hash, error, progress } = event.data || {};

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
        reject(new Error(`Failed to calculate file hash: ${JSON.stringify(event.data)}`));
        return;
      }
      cleanup();
      resolve(hash);
    };

    const handleError = (event: ErrorEvent) => {
      console.log("Worker error:", event);
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
