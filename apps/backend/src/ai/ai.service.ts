import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { BASE_URL } from 'src/constant';
import { isImageByExtension } from 'src/util';

@Injectable()
export class AiService {
  private openai: OpenAI;
  private defaultMessage = 'you are a helpful assistant';

  constructor() {
    this.openai = new OpenAI({
      // 若没有配置环境变量，请用阿里云百炼API Key将下行替换为：apiKey: "sk-xxx",
      apiKey: 'sk-839c413f949049918615290813173f2f',
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
  }

  // 将图片转为 base64
  private async imageToBase64(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    return buffer.toString('base64');
  }

  async getAiWithFile(filePath: string) {
    // 将URL路径转换为本地文件系统路径
    let localFilePath = filePath;

    if (filePath.startsWith(BASE_URL)) {
      // 如果是完整URL，移除BASE_URL部分
      localFilePath = filePath.replace(BASE_URL, '');
    }

    if (localFilePath.startsWith('/uploads/')) {
      // 如果是相对URL路径，转换为绝对本地路径
      localFilePath = path.join(
        process.cwd(),
        localFilePath.replace(/^\//, ''),
      );
    } else if (localFilePath.startsWith('uploads/')) {
      // 如果已经移除了前导斜杠，直接拼接
      localFilePath = path.join(process.cwd(), localFilePath);
    }

    // 确保路径使用正确的分隔符
    localFilePath = path.normalize(localFilePath);

    console.log('转换后的本地路径:', localFilePath);

    // 检查是否是图片文件
    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filePath);

    if (isImage) {
      // 对于图片，转换为 base64 并返回
      const base64 = await this.imageToBase64(localFilePath);
      // 获取文件扩展名确定 mime 类型
      const ext = path.extname(localFilePath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      return `data:${mimeType};base64,${base64}`;
    }

    const fileObject = await this.openai.files.create({
      file: fs.createReadStream(localFilePath),

      purpose: 'file-extract' as any,
    });

    const res = `fileid://${fileObject.id}`;
    return res;
  }

  async getAiWithMessage() {}

  getAiWithImg(message: string, imgUrl: string) {
    const imgContent: {
      type: 'image_url';
      image_url: { url: string };
    } = {
      type: 'image_url',
      image_url: { url: imgUrl },
    };
    // imgUrl.map((item) => {

    // });

    const messageContent: {
      type: 'text';
      text: string;
    } = {
      type: 'text',
      text: message,
    };

    return [messageContent, imgContent];
  }

  async getMain(message: string, filePath: string) {
    const isImage = isImageByExtension(filePath);
    const model = isImage ? 'qwen-vl-plus' : 'qwen-long';

    // 获取图片的 base64 数据
    const imageData = filePath ? await this.getAiWithFile(filePath) : null;

    const content = imageData || this.defaultMessage;

    const userContent =
      isImage && imageData ? this.getAiWithImg(message, imageData) : message;

    const completion = await this.openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: content },
        { role: 'user', content: userContent },
      ],
      stream: true,
      stream_options: {
        include_usage: true,
      },
    });

    return completion;
  }
}
