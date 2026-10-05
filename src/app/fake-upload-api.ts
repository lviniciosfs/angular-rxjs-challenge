import { Injectable } from '@angular/core';

export type UploadEvent =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'done'; url: string };

export class HttpLikeError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

@Injectable({ providedIn: 'root' })
export class FakeUploadApi {
  upload(file: File): Observable<UploadEvent> {
    return new Observable<UploadEvent>((sub) => {
      const total = file.size;
      const roll = Math.random();
      let loaded = 0;
      const id = setInterval(() => {
        loaded = Math.min(total, loaded + total / 10);
        sub.next({ type: 'progress', loaded, total });
        if (loaded >= total / 2 && roll < 0.15)
          return sub.error(new HttpLikeError(503));
        if (loaded >= total / 2 && roll < 0.2)
          return sub.error(new HttpLikeError(413));
        if (loaded === total) {
          sub.next({ type: 'done', url: `https://cdn.fake/${file.name}` });
          sub.complete();
        }
      }, 200 + Math.random() * 300);
      return () => {
        clearInterval(id);
        console.debug('teardown', file.name);
      };
    });
  }
}

export type UploadStatus =
  | 'queued'
  | 'uploading'
  | 'retrying'
  | 'done'
  | 'failed'
  | 'canceled';

export interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  attempt: number;
  error?: string;
  url?: string;
}

export abstract class UploadQueue {
  abstract readonly items: Signal<readonly UploadItem[]>;
  abstract readonly totalProgress: Signal<number>; // 0–100, ponderado por tamanho
  abstract readonly paused: Signal<boolean>;
  abstract add(files: File[]): void;
  abstract cancel(id: string): void;
  abstract retry(id: string): void;
  abstract pause(): void;
  abstract resume(): void;
  abstract clearFinished(): void;
}
