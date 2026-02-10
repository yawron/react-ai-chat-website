import SparkMD5 from "spark-md5";

type HashRequest = {
  file: File;
  chunkSize: number;
};

type HashResponse = {
  hash?: string;
  error?: string;
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

    for (let i = 0; i < total; i += 1) {
      const start = i * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const buffer = await file.slice(start, end).arrayBuffer();
      spark.append(buffer);
    }

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
