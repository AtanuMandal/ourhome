import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PagedResult } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  get<T>(path: string, params?: Record<string, string | number>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }
    return this.http.get<T>(`${this.base}/${path}`, { params: httpParams })
      .pipe(retry({ count: 2, delay: 1000 }));
  }

  download(path: string, params?: Record<string, string | number>) {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }

    return this.http.get(`${this.base}/${path}`, {
      params: httpParams,
      observe: 'response',
      responseType: 'blob'
    });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}/${path}`, body);
  }

  postForm<T>(path: string, body: FormData): Observable<T> {
    return this.http.post<T>(`${this.base}/${path}`, body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}/${path}`, body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.base}/${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}/${path}`);
  }

  deleteWithBody<T>(path: string, body: unknown): Observable<T> {
    return this.http.request<T>('DELETE', `${this.base}/${path}`, { body });
  }

  /** Convenience: GET with page + pageSize */
  getPaged<T>(path: string, page = 1, pageSize = 20, extra?: Record<string, string | number>): Observable<PagedResult<T>> {
    return this.get<PagedResult<T>>(path, { page, pageSize, ...extra });
  }
}
