import SparkMD5 from "spark-md5";

type HashRequest = {
  file: File;
  chunkSize: number;
};

type HashResponse = {
  hash?: string;
  error?: string;
  progress?: number;
};

const ctx = self as unknown as {
  postMessage: (data: HashResponse) => void;
  onmessage: ((event: MessageEvent<HashRequest>) => void) | null;
};

ctx.onmessage = async (event: MessageEvent<HashRequest>) => {
  try {
    const { file, chunkSize } = event.data;
    const spark = new SparkMD5.ArrayBuffer();
    const total = Math.ceil(file.size / chunkSize);

    // 一次遍历边计算每个 chunk 的 hash，每计算一个 chunk 就 append
    for (let i = 0; i < total; i += 1) {
      const start = i * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const buffer = await file.slice(start, end).arrayBuffer();
      // 每次 append 当前 chunk 的 hash
      spark.append(buffer);

      // 发送进度
      ctx.postMessage({
        progress: Math.round(((i + 1) / total) * 100),
      });
    }

    // 遍历完成后 end 得到最终整个文件的 hash 值
    const hash = spark.end();
    const message: HashResponse = { hash };
    ctx.postMessage(message);
  } catch (error) {
    const message: HashResponse = {
      error: error instanceof Error ? error.message : "Worker hash failed",
    };
    ctx.postMessage(message);
  }
};
