import { useState, useRef, useCallback } from "react";
import { App } from "antd";
import SparkMD5 from "spark-md5";
import type { RcFile } from "antd/es/upload";

type FileListItem = {
  uid: string;
  name?: string;
  status?: "uploading" | "done" | "error" | "removed";
  percent?: number;
  [key: string]: any;
};

import {
  getCheckFileAPI,
  postFileChunksAPI,
  postMergeFileAPI,
} from "@pc/apis/chat";
import type { ChunkInfo, UploadTask, UseFileUploadReturn } from "../types";
import { CONCURRENT_UPLOADS, MAX_RETRY_COUNT } from "../utils/file-config";
import {
  createFileChunks,
  calculateFileHash,
  calculateProgress,
} from "../utils/file-utils";

export const useFileUpload = (
  selectedId: string | null,
): UseFileUploadReturn => {
  const { message } = App.useApp();

  // UI 状态
  const [fileList, setFileList] = useState<FileListItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedChunks, setUploadedChunks] = useState<number[]>([]);
  const [failedChunks, setFailedChunks] = useState<number[]>([]);

  // 文件数据 ref
  const fileChunksRef = useRef<ChunkInfo[]>([]);
  const fileIdRef = useRef<string | null>(null);
  const fileNameRef = useRef<string | null>(null);
  const filePathRef = useRef<string | null>(null);
  const fileSizeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const alreadyUploadedRef = useRef<number>(0); // 记录已上传的分片数（来自断点续传）

  // 重置上传状态
  const resetUploadState = useCallback(() => {
    setFileList([]);
    fileIdRef.current = null;
    fileNameRef.current = null;
    filePathRef.current = null;
    fileSizeRef.current = 0;
    fileChunksRef.current = [];
    alreadyUploadedRef.current = 0;
    setUploadProgress(0);
    setIsUploading(false);
    setUploadedChunks([]);
    setFailedChunks([]);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // 上传单个分片
  const uploadSingleChunk = async (
    chunk: ChunkInfo,
    fileId: string,
    fileName: string,
    controller: AbortController,
  ): Promise<boolean> => {
    try {
      // 计算分片的 hash
      const chunkBuffer = await chunk.chunk.arrayBuffer();
      const spark = new SparkMD5.ArrayBuffer();
      spark.append(chunkBuffer);
      const chunkHash = spark.end();

      const formData = new FormData();
      formData.append("fileId", fileId);
      formData.append("fileName", fileName);
      formData.append("index", String(chunk.index));
      formData.append("chunk", chunk.chunk);
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

  // 并发上传分片
  const uploadChunksWithConcurrency = async (
    chunksToUpload: number[],
    controller: AbortController,
  ): Promise<{ success: boolean; failedIndexes: number[] }> => {
    const fileId = fileIdRef.current!;
    const fileName = fileNameRef.current!;
    const allChunks = fileChunksRef.current;
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
          const uploadedCount =
            alreadyUploadedRef.current + successChunks.length;
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
            setFailedChunks((prev) => [...prev, chunk.index]);
            return false;
          }
        }
      };

      const processQueue = async () => {
        // 清理已完成的任务
        for (const [index, promise] of runningTasks) {
          await promise;
          runningTasks.delete(index);
        }

        // 如果还有任务，继续执行
        while (
          uploadTasks.length > 0 &&
          runningTasks.size < CONCURRENT_UPLOADS
        ) {
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

  // 合并文件
  const mergeFile = async (): Promise<{ filePath: string }> => {
    const fileId = fileIdRef.current!;
    const fileName = fileNameRef.current!;
    const fileChunks = fileChunksRef.current;

    const {
      data: { fileName: mergedFileName, filePath },
    } = await postMergeFileAPI({
      fileId,
      fileName: fileName,
      totalChunks: fileChunks.length,
    });

    console.log("文件合并成功:", mergedFileName, filePath);

    filePathRef.current = filePath;
    setUploadProgress(100);
    setFileList((prev) =>
      prev?.map((item) => ({ ...item, status: "done", percent: 100 })),
    );

    message.success("文件上传完成！");

    return { filePath };
  };

  // 开始上传流程
  const startUploadProcess = async () => {
    const fileId = fileIdRef.current;
    const fileName = fileNameRef.current;
    const fileSize = fileSizeRef.current;
    const fileChunks = fileChunksRef.current;

    if (!fileId || !fileName) {
      throw new Error("文件信息缺失");
    }

    // 步骤3: 向后端接口发送一个前置请求，带上文件名和 hash
    const {
      data: { isCompleted, uploaded: uploadedChunkIndices = [], filePath },
    } = await getCheckFileAPI(
      fileId,
      fileName,
      fileSize,
      selectedId ? selectedId : "",
    );

    // 步骤3.1: isCompleted = true 返回已上传结果，实现秒传
    if (isCompleted) {
      message.success("文件上传成功");
      filePathRef.current = filePath || "";
      setFileList((prev) =>
        prev?.map((item) => ({ ...item, status: "done", percent: 100 })),
      );
      return;
    }

    // 步骤3.2: uploadChunks = [0, 1, 3, 5, ...] 返回已经上传的分片索引
    // 步骤3.3: uploadChunks = [] 空数组
    const alreadyUploadedChunks = uploadedChunkIndices || [];

    // 记录已上传的分片
    setUploadedChunks(alreadyUploadedChunks);
    alreadyUploadedRef.current = alreadyUploadedChunks.length;

    // 步骤4: filter 留下未上传分片的索引，得到需要上传索引数组
    const totalChunkCount = fileChunks.length;
    const allChunkIndices = Array.from(
      { length: totalChunkCount },
      (_, i) => i,
    );
    const pendingChunks = allChunkIndices.filter(
      (index) => !alreadyUploadedChunks.includes(index),
    );

    if (pendingChunks.length === 0) {
      // 所有分片都已上传，直接合并
      await mergeFile();
      return;
    }

    // 步骤5: 上传索引数组传入到并发池做并发上传
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const { success, failedIndexes } = await uploadChunksWithConcurrency(
      pendingChunks,
      controller,
    );

    if (success) {
      // 步骤6: 所有分片上传成功后才请求后端 merge 接口
      await mergeFile();
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

  // 选择文件后开始上传
  const selectFile = (file: RcFile) => {
    const uid = file.uid;

    const doUpload = async () => {
      try {
        setIsLoading(true);
        setFailedChunks([]);
        setUploadedChunks([]);
        setUploadProgress(0);

        setFileList([
          {
            uid,
            name: file.name,
            status: "uploading",
            percent: 0,
          },
        ]);

        const controller = new AbortController();
        abortControllerRef.current = controller;
        const fileName = file.name;
        const fileSize = file.size;

        fileNameRef.current = fileName;
        fileSizeRef.current = fileSize;

        // 步骤2: 文件在主线程切片后得到 chunks 数组丢到 WebWorker 线程计算 hash
        // 创建切片
        const fileChunks = createFileChunks(file as File);
        fileChunksRef.current = fileChunks;

        // 计算整个文件的 hash
        setIsUploading(true);
        const fileId = await calculateFileHash(file as File);
        fileIdRef.current = fileId;

        // 开始上传流程
        await startUploadProcess();

        // 上传完成
        setIsUploading(false);
      } catch (error: unknown) {
        console.log("上传过程出错:", error);
        message.error("文件上传失败");
        setFileList((prev) =>
          prev?.map((item) =>
            item.uid === uid ? { ...item, status: "error" } : item,
          ),
        );
      } finally {
        setIsLoading(false);
        setIsUploading(false);
      }
    };

    doUpload();
  };

  // 取消文件上传
  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // 取消所有分片请求
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsUploading(false);
    message.info("文件上传已取消");
  };

  // 重新上传失败的分片
  const retryUpload = async () => {
    if (!fileIdRef.current || !fileNameRef.current) {
      message.error("文件信息已失效，请重新选择文件");
      return;
    }

    // 清空失败列表，重新开始上传流程
    setFailedChunks([]);

    // 重新发送前置请求获取最新状态
    await startUploadProcess();
  };

  // 文件信息
  const fileInfo = {
    fileId: fileIdRef.current,
    fileName: fileNameRef.current,
    filePath: filePathRef.current,
  };

  return {
    // 状态
    fileList,
    uploadProgress,
    isUploading,
    isLoading,
    uploadedChunks,
    failedChunks,
    fileInfo,
    // 方法
    selectFile,
    cancelUpload,
    retryUpload,
    resetUploadState,
    setFileList,
  };
};
