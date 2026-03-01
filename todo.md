# 文件上传技术文档

## 1. 文件分片相关代码

### 1.1 配置文件

**文件：** `apps/web-pc/src/features/chat/components/ChatInput/utils/file-config.ts`

```typescript
export const CHUNK_SIZE = 1024 * 1024 * 2; // 2MB 分片大小
export const CONCURRENT_UPLOADS = 3;        // 并发上传数量
export const MAX_RETRY_COUNT = 3;           // 重试次数
```

### 1.2 分片实现逻辑

**文件：** `apps/web-pc/src/features/chat/components/ChatInput/utils/file-utils.ts`

```typescript
export const createFileChunks = (file: File): ChunkInfo[] => {
  const chunksCount = Math.ceil(file.size / CHUNK_SIZE);  // 计算分片数量

  for (let i = 0; i < chunksCount; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);  // 使用 Blob.slice() 切割
    chunks.push({ index: i, chunk });
  }
  return chunks;
};
```

### 1.3 为什么定 2MB？

| 因素 | 说明 |
|------|------|
| **网络环境** | 2MB 在弱网/移动网络下较稳定，失败重试成本低 |
| **并发效率** | 3 个并发 × 2MB = 6MB/s 的理论并发带宽 |
| **内存占用** | 浏览器内存压力小，不会因大文件切片导致 OOM |
| **服务端** | 每次接收 2MB，磁盘 I/O 频率适中 |
| **行业惯例** | 阿里云 OSS、腾讯云 COS 等推荐 1-5MB |

---

## 2. 并发池相关代码

**文件：** `use-file-upload.ts:105-199`

### 2.1 核心流程图

```
┌─────────────────────────────────────────────────────────────┐
│                      任务队列 queue                          │
│  [chunk0] [chunk1] [chunk2] [chunk3] [chunk4] [chunk5]... │
└─────────────────────────────────────────────────────────────┘
                            ↓
            ┌───────────────────────────────┐
            │      并发池 (max=3)           │
            │  ┌─────┐ ┌─────┐ ┌─────┐     │
            │  │ T1  │ │ T2  │ │ T3  │     │
            │  └─────┘ └─────┘ └─────┘     │
            └───────────────────────────────┘
                            ↓
         ┌──────────────────────────────────┐
         │ 完成 → 释放槽位 → 继续取出任务    │
         └──────────────────────────────────┘
```

### 2.2 代码解释

| 行号 | 代码 | 作用 |
|------|------|------|
| 115-118 | `uploadTasks` 队列 | 将所有待上传的分片转为任务对象 |
| 121 | `runningTasks` Map | 追踪正在执行的任务（槽位） |
| 126-162 | `runTask()` | 单个分片上传逻辑，包含重试机制 |
| 172-183 | 并发控制核心 | `runningTasks.size < CONCURRENT_UPLOADS` 控制同时最多 3 个 |
| 164-169 | 清理已完成 | 每次循环清理已完成的 Promise |
| 186-194 | 轮询调度 | 每 100ms 检查是否有空余槽位 |

### 2.3 重试机制

```typescript
if (retryCount < MAX_RETRY_COUNT) {
  task.retryCount++;
  return runTask(task);  // 递归重试
}
```

单个分片最多重试 **3 次**，失败后加入 `failedIndexes`，最终决定是否需要用户重试。

### 2.4 整体流程

1. **初始化** → 把所有待上传分片放入队列
2. **调度** → 启动最多 3 个并发任务
3. **执行** → 每个任务独立上传，成功/失败都更新进度
4. **轮询** → 每 100ms 检查，有空位就继续执行下一个
5. **完成** → 所有任务完成后 resolve，返回成功/失败列表

---

## 3. MD5 持久化

### 3.1 持久化逻辑

1. 前端计算文件 MD5 hash → 作为 `fileId`
2. 后端通过 `fileId` (MD5) 查询 `FileEntity` 表
3. 如果找到记录且 `isCompleted = true`，返回秒传成功
4. 如果找到部分上传的分片，返回已上传的分片索引列表

### 3.2 数据库表结构（file.entity.ts）

| 字段 | 说明 |
|------|------|
| `fileId` | 存储文件的 MD5 hash |
| `filePath` | 存储合并后的文件路径 |
| `isCompleted` | 标记文件是否上传完成 |
| `uploadedChunks` | 已上传的分片数 |
| `chatId` | 关联的会话 |

相同 MD5 的文件会识别为同一个文件，实现秒传和断点续传。
