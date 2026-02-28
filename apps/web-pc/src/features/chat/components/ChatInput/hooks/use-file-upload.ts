import { useState, useRef, useCallback } from "react";
import { App } from "antd";
import type { RcFile } from "antd/es/upload";

import type { ChunkInfo, UseFileUploadReturn } from "../types";
import { calculateFileHash } from "../utils/file-utils";
import { startUploadProcess } from "../utils/upload-core";

type FileListItem = {
  uid: string;
  name?: string;
  status?: "uploading" | "done" | "error" | "removed";
  percent?: number;
  [key: string]: any;
};

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
  const alreadyUploadedRef = useRef<number>(0);

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

        // 计算整个文件的 hash（同时在 Worker 中完成分片）
        setIsUploading(true);
        const { hash, chunks } = await calculateFileHash(file as File);
        const fileId = hash;

        // 将 ArrayBuffer 转换为 ChunkInfo 格式
        const fileChunks: ChunkInfo[] = chunks.map((chunk, index) => ({
          index,
          chunk,
        }));
        fileChunksRef.current = fileChunks;

        fileIdRef.current = fileId;

        // 开始上传流程
        await startUploadProcess({
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
        });

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
      abortControllerRef.current.abort();
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

    setFailedChunks([]);

    await startUploadProcess({
      fileId: fileIdRef.current,
      fileName: fileNameRef.current,
      fileSize: fileSizeRef.current,
      fileChunks: fileChunksRef.current,
      selectedId,
      alreadyUploadedRef,
      setUploadProgress,
      setUploadedChunks,
      setFailedChunks,
      setFileList,
      message,
    });
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
