import * as vscode from 'vscode';

/**
 * 日志工具类
 * 
 * 提供统一的日志输出功能，使用 VS Code 的 OutputChannel。
 * 用户可以在 Output 面板中查看日志信息。
 * 
 * @class Logger
 */
export class Logger {
  private static outputChannel: vscode.OutputChannel | null = null;
  private static isInitialized = false;

  /**
   * 初始化日志输出通道
   * 
   * @param context - VS Code 扩展上下文
   */
  static initialize(context: vscode.ExtensionContext): void {
    if (this.isInitialized) {
      return;
    }

    this.outputChannel = vscode.window.createOutputChannel('VOrg');
    context.subscriptions.push(this.outputChannel);
    this.isInitialized = true;
  }

  /**
   * 记录日志信息
   * 
   * @param message - 日志消息
   * @param level - 日志级别（可选，默认为 'INFO'）
   */
  private static log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
    if (!this.outputChannel) {
      // 如果未初始化，回退到 console
      const consoleMethod = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
      consoleMethod(`[VOrg] ${message}`);
      return;
    }

    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
    const timestamp = `${hours}:${minutes}:${seconds}.${milliseconds}`;
    
    this.outputChannel.appendLine(`[${timestamp}] [${level}] ${message}`);
    
    // 错误和警告同时输出到控制台（用于开发调试）
    if (level === 'ERROR') {
      console.error(`[VOrg] ${message}`);
    } else if (level === 'WARN') {
      console.warn(`[VOrg] ${message}`);
    }
  }

  /**
   * 记录信息日志
   * 
   * @param message - 日志消息
   */
  static info(message: string): void {
    this.log(message, 'INFO');
  }

  /**
   * 记录警告日志
   * 
   * @param message - 日志消息
   */
  static warn(message: string): void {
    this.log(message, 'WARN');
  }

  /**
   * 记录错误日志
   * 
   * @param message - 日志消息
   * @param error - 错误对象（可选）
   */
  static error(message: string, error?: unknown): void {
    let fullMessage = message;
    
    if (error) {
      if (error instanceof Error) {
        fullMessage = `${message}: ${error.message}`;
        if (error.stack) {
          fullMessage += `\n${error.stack}`;
        }
      } else {
        fullMessage = `${message}: ${String(error)}`;
      }
    }
    
    this.log(fullMessage, 'ERROR');
  }

  /**
   * 显示输出面板
   */
  static show(): void {
    if (this.outputChannel) {
      this.outputChannel.show();
    }
  }

  /**
   * 隐藏输出面板
   */
  static hide(): void {
    if (this.outputChannel) {
      this.outputChannel.hide();
    }
  }
}

