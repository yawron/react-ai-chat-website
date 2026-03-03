import SparkMD5 from "spark-md5";

type HashRequest = {
  file: File;
  chunkSize: number;
};

type ChunkData = {
  chunk: ArrayBuffer;
  hash: string;
};

type HashResponse = {
  hash?: string;
  error?: string;
  progress?: number;
  chunks?: ChunkData[];
};

const ctx = self as unknown as {
  postMessage: (data: HashResponse, transfer?: Transferable[]) => void;
  onmessage: ((event: MessageEvent<HashRequest>) => void) | null;
};

ctx.onmessage = async (event: MessageEvent<HashRequest>) => {
  try {
    const { file, chunkSize } = event.data;
    const spark = new SparkMD5.ArrayBuffer();
    const total = Math.ceil(file.size / chunkSize);
    const chunks: ChunkData[] = [];

    // 一次遍历边切片边计算每个 chunk 的 hash
    for (let i = 0; i < total; i += 1) {
      const start = i * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const buffer = await file.slice(start, end).arrayBuffer();

      // 计算当前分片的 hash
      const chunkSpark = new SparkMD5.ArrayBuffer();
      chunkSpark.append(buffer);
      const chunkHash = chunkSpark.end();

      // 累加到整体 hash
      spark.append(buffer);

      // 保存分片数据和对应的 hash
      chunks.push({ chunk: buffer, hash: chunkHash });

      // 发送进度
      ctx.postMessage({
        progress: Math.round(((i + 1) / total) * 100),
      });
    }

    // 遍历完成后 end 得到最终整个文件的 hash 值
    const hash = spark.end();

    // 使用 Transferable Objects 转移 ArrayBuffer 所有权，避免复制开销
    const transferables = chunks.map((c) => c.chunk);
    const message: HashResponse = { hash, chunks };
    ctx.postMessage(message, transferables);
  } catch (error) {
    const message: HashResponse = {
      error: error instanceof Error ? error.message : "Worker hash failed",
    };
    ctx.postMessage(message);
  }
};
