'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// Data is shipped as static JSON committed by the daily GitHub Actions job.
// See backend/scripts/export_static_data.py and .github/workflows/refresh-data.yml.
const DATA_BASE = '/data';

type Stock = {
  ticker: string;
  name: string;
  market: string;
  sector: string | null;
};

type StocksState =
  | { status: 'loading' }
  | { status: 'ok'; count: number; stocks: Stock[]; updatedAt: string | null }
  | { status: 'error'; message: string };

export default function Home() {
  const [stocks, setStocks] = useState<StocksState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${DATA_BASE}/stocks.json`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { count: number; stocks: Stock[] };
        const updatedAt = res.headers.get('last-modified');
        setStocks({
          status: 'ok',
          count: data.count,
          stocks: data.stocks,
          updatedAt,
        });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setStocks({
          status: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 dark:bg-slate-950">
      <div className="mx-auto flex max-w-2xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            investment study
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            함께 시장을 공부합니다
          </h1>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
            매일 시장 데이터를 모으고, 정의된 룰로 후보 종목을 뽑고,
            그 근거와 반대 시나리오를 함께 봅니다. 수익이 아니라{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">이해</span>가 목표입니다.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              등록된 종목
            </h2>
            {stocks.status === 'ok' && (
              <span className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                {stocks.count.toLocaleString('ko-KR')}
              </span>
            )}
          </div>

          <div className="mt-4">
            {stocks.status === 'loading' && (
              <div className="flex items-center gap-3">
                <span className="size-2.5 animate-pulse rounded-full bg-slate-400" />
                <span className="text-slate-600 dark:text-slate-300">불러오는 중...</span>
              </div>
            )}
            {stocks.status === 'ok' && stocks.count === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                아직 종목이 없습니다. 다음 단계에서 KOSPI 200 종목을 자동으로 채울 예정이에요.
              </p>
            )}
            {stocks.status === 'ok' && stocks.count > 0 && (
              <ul className="-mx-2 divide-y divide-slate-100 dark:divide-slate-800">
                {stocks.stocks.slice(0, 10).map((s) => (
                  <li key={s.ticker}>
                    <Link
                      href={`/stocks/${s.ticker}`}
                      className="flex items-center justify-between rounded-md px-2 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{s.name}</span>
                        <span className="ml-2 font-mono text-xs text-slate-400">{s.ticker}</span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {s.market} <span className="ml-1">→</span>
                      </span>
                    </Link>
                  </li>
                ))}
                {stocks.count > 10 && (
                  <li className="px-2 pt-3 text-xs text-slate-400">… 외 {stocks.count - 10}개</li>
                )}
              </ul>
            )}
            {stocks.status === 'error' && (
              <div className="text-sm">
                <div className="text-rose-600 dark:text-rose-400">불러오기 실패</div>
                <div className="mt-1 font-mono text-xs text-slate-400">{stocks.message}</div>
              </div>
            )}
          </div>
        </section>

        <footer className="space-y-1 text-xs text-slate-400 dark:text-slate-500">
          {stocks.status === 'ok' && stocks.updatedAt && (
            <div>
              데이터 갱신 · {new Date(stocks.updatedAt).toLocaleString('ko-KR')}
            </div>
          )}
          <div>Phase 1.4 · 정적 JSON으로 배포 준비</div>
        </footer>
      </div>
    </main>
  );
}
