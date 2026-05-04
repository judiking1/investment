'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

type HealthState =
  | { status: 'loading' }
  | { status: 'ok'; serverTime: string }
  | { status: 'error'; message: string };

type Stock = {
  ticker: string;
  name: string;
  market: string;
  sector: string | null;
};

type StocksState =
  | { status: 'loading' }
  | { status: 'ok'; count: number; stocks: Stock[] }
  | { status: 'error'; message: string };

export default function Home() {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' });
  const [stocks, setStocks] = useState<StocksState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_URL}/health`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { status: string; time: string };
        setHealth({ status: 'ok', serverTime: data.time });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setHealth({
          status: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      });

    fetch(`${API_URL}/stocks`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { count: number; stocks: Stock[] };
        setStocks({ status: 'ok', count: data.count, stocks: data.stocks });
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
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            Backend 연결 상태
          </h2>
          <div className="mt-4">
            {health.status === 'loading' && (
              <div className="flex items-center gap-3">
                <span className="size-2.5 animate-pulse rounded-full bg-slate-400" />
                <span className="text-slate-600 dark:text-slate-300">확인 중...</span>
              </div>
            )}
            {health.status === 'ok' && (
              <div className="flex items-center gap-3">
                <span className="size-2.5 rounded-full bg-emerald-500" />
                <div>
                  <div className="text-slate-900 dark:text-slate-100">연결됨</div>
                  <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    서버 시각 · {new Date(health.serverTime).toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>
            )}
            {health.status === 'error' && (
              <div className="flex items-start gap-3">
                <span className="mt-1.5 size-2.5 rounded-full bg-rose-500" />
                <div>
                  <div className="text-slate-900 dark:text-slate-100">연결 실패</div>
                  <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    Backend가 켜져 있는지 확인하세요 ({API_URL})
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-400 dark:text-slate-500">
                    {health.message}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

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
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {stocks.stocks.slice(0, 10).map((s) => (
                  <li
                    key={s.ticker}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{s.name}</span>
                      <span className="ml-2 font-mono text-xs text-slate-400">{s.ticker}</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{s.market}</span>
                  </li>
                ))}
                {stocks.count > 10 && (
                  <li className="pt-3 text-xs text-slate-400">… 외 {stocks.count - 10}개</li>
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

        <footer className="text-xs text-slate-400 dark:text-slate-500">
          Phase 1.2 · KOSPI 종목 마스터 수집
        </footer>
      </div>
    </main>
  );
}
