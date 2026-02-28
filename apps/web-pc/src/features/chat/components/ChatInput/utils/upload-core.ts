import SparkMD5 from "spark-md5";

import {
  getCheckFileAPI,
  postFileChunksAPI,
  postMergeFileAPI,
} from "@pc/apis/chat";
import type { ChunkInfo, FileListItem, UploadTask } from "../types";
import { CONCURRENT_UPLOADS, MAX_RETRY_COUNT } from "./file-config";
import { calculateProgress } from "./file-utils";

interface UploadCoreParams {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileChunks: ChunkInfo[];
  selectedId: string | null;
  alreadyUploadedRef: { current: number };
  setUploadProgress: (progress: number) => void;
  setUploadedChunks: (chunks: number[]) => void;
  setFailedChunks: (chunks: number[]) => void;
  setFileList: React.Dispatch<React.SetStateAction<any[]>>;
  message: { success: (msg: string) => void; error: (msg: string) => void };
}

/**
 * 上传单个分片
 */
export const uploadSingleChunk = async (
  chunk: ChunkInfo,
  fileId: string,
  fileName: string,
  controller: AbortController,
): Promise<boolean> => {
  try {
    // chunk.chunk 已经是 ArrayBuffer
    const chunkBuffer = chunk.chunk;
    const spark = new SparkMD5.ArrayBuffer();
    spark.append(chunkBuffer);
    const chunkHash = spark.end();

    const formData = new FormData();
    formData.append("fileId", fileId);
    formData.append("fileName", fileName);
    formData.append("index", String(chunk.index));
    // ArrayBuffer 转 Blob
    formData.append("chunk", new Blob([chunkBuffer]));
    formData.append("chunkHash", chunkHash);

    const response = await postFileChunksAPI(formData, controller.signal);

    return !!response;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return false;
    }
    return false;
  }
};

/**
 * 并发上传分片
 */
export const uploadChunksWithConcurrency = async (
  chunksToUpload: number[],
  allChunks: ChunkInfo[],
  fileId: string,
  fileName: string,
  alreadyUploadedRef: { current: number },
  controller: AbortController,
  setUploadProgress: (progress: number) => void,
  setFailedChunks: (chunks: number[]) => void,
): Promise<{ success: boolean; failedIndexes: number[] }> => {
  const failedIndexes: number[] = [];

  // 创建上传任务队列
  const uploadTasks: UploadTask[] = chunksToUpload.map((index) => ({
    chunk: allChunks[index],
    retryCount: 0,
  }));

  // 正在上传的任务
  const runningTasks: Map<number, Promise<boolean>> = new Map();
  // 成功上传的分片索引
  const successChunks: number[] = [];

  return new Promise((resolve) => {
    const runTask = async (task: UploadTask): Promise<boolean> => {
      const { chunk, retryCount } = task;

      // 检查是否已中止
      if (controller.signal.aborted) {
        return false;
      }

      const success = await uploadSingleChunk(
        chunk,
        fileId,
        fileName,
        controller,
      );

      if (success) {
        successChunks.push(chunk.index);
        // 更新进度
        const totalChunks = allChunks.length;
        const uploadedCount = alreadyUploadedRef.current + successChunks.length;
        setUploadProgress(calculateProgress(uploadedCount, totalChunks));

        return true;
      } else {
        // 上传失败，检查是否需要重试
        if (retryCount < MAX_RETRY_COUNT) {
          // 重试
          task.retryCount++;
          return runTask(task);
        } else {
          // 重试次数用完，记录失败
          failedIndexes.push(chunk.index);
          setFailedChunks([...failedIndexes]);
          return false;
        }
      }
    };

    const processQueue = async () => {
      // 清理已完成的任务
      for (const [, promise] of runningTasks) {
        await promise;
      }
      runningTasks.clear();

      // 如果还有任务，继续执行
      while (uploadTasks.length > 0 && runningTasks.size < CONCURRENT_UPLOADS) {
        if (controller.signal.aborted) break;

        const task = uploadTasks.shift();
        if (!task) break;

        const promise = runTask(task);
        runningTasks.set(task.chunk.index, promise);
      }

      // 如果还有任务在运行，等待后继续
      if (runningTasks.size > 0 || uploadTasks.length > 0) {
        if (!controller.signal.aborted) {
          setTimeout(processQueue, 100);
        }
      } else {
        // 所有任务完成
        const allSuccess = failedIndexes.length === 0;
        resolve({ success: allSuccess, failedIndexes });
      }
    };

    processQueue();
  });
};

/**
 * 合并文件
 */
export const mergeFile = async (
  fileId: string,
  fileName: string,
  fileChunks: ChunkInfo[],
  setUploadProgress: (progress: number) => void,
  setFileList: React.Dispatch<React.SetStateAction<FileListItem[]>>,
  message: { success: (msg: string) => void },
): Promise<{ filePath: string }> => {
  const {
    data: { fileName: mergedFileName, filePath },
  } = await postMergeFileAPI({
    fileId,
    fileName: fileName,
    totalChunks: fileChunks.length,
  });

  console.log("文件合并成功:", mergedFileName, filePath);

  setUploadProgress(100);
  setFileList((prev) =>
    prev?.map((item) => ({ ...item, status: "done", percent: 100 })),
  );

  message.success("文件上传完成！");

  return { filePath };
};

/**
 * 开始上传流程
 */
export const startUploadProcess = async (
  params: UploadCoreParams,
): Promise<void> => {
  const {
    fileId,
    fileName,
    fileSize,
    fileChunks,
    selectedId,
    alreadyUploadedRef,
    setUploadProgress,
    setUploadedChunks,
    setFailedChunks,
    setFileList,
    message,
  } = params;

  if (!fileId || !fileName) {
    throw new Error("文件信息缺失");
  }

  // 向后端接口发送一个前置请求，带上文件名和 hash
  const {
    data: { isCompleted, uploaded: uploadedChunkIndices = [] },
  } = await getCheckFileAPI(
    fileId,
    fileName,
    fileSize,
    selectedId ? selectedId : "",
  );

  // isCompleted = true 返回已上传结果，实现秒传
  if (isCompleted) {
    message.success("文件上传成功");
    setFileList((prev) =>
      prev?.map((item) => ({ ...item, status: "done", percent: 100 })),
    );
    return;
  }

  // 返回已经上传的分片索引
  const alreadyUploadedChunks = uploadedChunkIndices || [];

  // 记录已上传的分片
  setUploadedChunks(alreadyUploadedChunks);
  alreadyUploadedRef.current = alreadyUploadedChunks.length;

  // filter 留下未上传分片的索引，得到需要上传索引数组
  const totalChunkCount = fileChunks.length;
  const allChunkIndices = Array.from({ length: totalChunkCount }, (_, i) => i);
  const pendingChunks = allChunkIndices.filter(
    (index) => !alreadyUploadedChunks.includes(index),
  );

  if (pendingChunks.length === 0) {
    // 所有分片都已上传，直接合并
    await mergeFile(
      fileId,
      fileName,
      fileChunks,
      setUploadProgress,
      setFileList,
      message,
    );
    return;
  }

  // 上传索引数组传入到并发池做并发上传
  const controller = new AbortController();

  const { success, failedIndexes } = await uploadChunksWithConcurrency(
    pendingChunks,
    fileChunks,
    fileId,
    fileName,
    alreadyUploadedRef,
    controller,
    setUploadProgress,
    setFailedChunks,
  );

  if (success) {
    // 所有分片上传成功后才请求后端 merge 接口
    await mergeFile(
      fileId,
      fileName,
      fileChunks,
      setUploadProgress,
      setFileList,
      message,
    );
  } else {
    // 有分片上传失败
    message.error(`有 ${failedIndexes.length} 个分片上传失败，点击可重试`);
    setFileList((prev) =>
      prev?.map((item) => ({
        ...item,
        status: "error",
        percent: calculateProgress(
          alreadyUploadedChunks.length +
            (totalChunkCount - failedIndexes.length),
          totalChunkCount,
        ),
      })),
    );
  }
};
