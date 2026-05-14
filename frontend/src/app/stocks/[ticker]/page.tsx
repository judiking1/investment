'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// See backend/scripts/export_static_data.py
const DATA_BASE = '/data';

type Price = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type PricesResponse = {
  ticker: string;
  name: string;
  count: number;
  prices: Price[];
};

type State =
  | { status: 'loading' }
  | { status: 'ok'; data: PricesResponse }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

export default function StockDetailPage() {
  const params = useParams<{ ticker: string }>();
  const ticker = params.ticker;
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    if (!ticker) return;
    const controller = new AbortController();

    fetch(`${DATA_BASE}/prices/${ticker}.json`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 404) {
          setState({ status: 'not-found' });
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PricesResponse;
        setState({ status: 'ok', data });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      });

    return () => controller.abort();
  }, [ticker]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 dark:bg-slate-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <Link
          href="/"
          className="self-start text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← 종목 목록으로
        </Link>

        {state.status === 'loading' && (
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <span className="size-2.5 animate-pulse rounded-full bg-slate-400" />
            불러오는 중...
          </div>
        )}

        {state.status === 'not-found' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              종목을 찾을 수 없습니다
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              ticker: <span className="font-mono">{ticker}</span>
            </p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/50 dark:bg-rose-950/30">
            <h1 className="text-lg font-semibold text-rose-900 dark:text-rose-100">
              불러오기 실패
            </h1>
            <p className="mt-2 font-mono text-xs text-rose-700 dark:text-rose-300">
              {state.message}
            </p>
          </div>
        )}

        {state.status === 'ok' && <StockDetail data={state.data} />}
      </div>
    </main>
  );
}

function StockDetail({ data }: { data: PricesResponse }) {
  if (data.prices.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{data.name}</h1>
          <span className="font-mono text-sm text-slate-400">{data.ticker}</span>
        </div>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          가격 데이터가 없습니다. backend에서 <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs dark:bg-slate-800">seed_daily_prices</code>를 실행했는지 확인하세요.
        </p>
      </div>
    );
  }

  const prices = data.prices;
  const first = prices[0];
  const last = prices[prices.length - 1];
  const changePct = ((last.close - first.close) / first.close) * 100;
  const isUp = changePct >= 0;

  // Korean convention: red = up, blue = down
  const accent = isUp ? '#e11d48' : '#2563eb';

  return (
    <>
      <header className="space-y-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {data.name}
          </h1>
          <span className="font-mono text-sm text-slate-400">{data.ticker}</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            {last.close.toLocaleString('ko-KR')}
            <span className="ml-1 text-base font-normal text-slate-400">원</span>
          </span>
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: accent }}
          >
            {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
          </span>
          <span className="text-xs text-slate-400">
            최근 {prices.length}거래일 ({first.date} → {last.date})
          </span>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
          종가 추이
        </h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={prices} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(d: string) => d.slice(5)}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(v: number) => v.toLocaleString('ko-KR')}
                domain={['auto', 'auto']}
                width={70}
              />
              <Tooltip
                formatter={(value): [string, string] => [
                  `${Number(value).toLocaleString('ko-KR')}원`,
                  '종가',
                ]}
                labelFormatter={(label) => String(label)}
                contentStyle={{
                  borderRadius: 8,
                  borderColor: '#e2e8f0',
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="close"
                stroke={accent}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
          최근 5거래일
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              <th className="pb-2 font-normal">날짜</th>
              <th className="pb-2 text-right font-normal">시가</th>
              <th className="pb-2 text-right font-normal">고가</th>
              <th className="pb-2 text-right font-normal">저가</th>
              <th className="pb-2 text-right font-normal">종가</th>
              <th className="pb-2 text-right font-normal">거래량</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...prices.slice(-5)].reverse().map((p) => (
              <tr key={p.date} className="text-slate-700 dark:text-slate-300">
                <td className="py-2 font-mono text-xs">{p.date}</td>
                <td className="py-2 text-right tabular-nums">{p.open.toLocaleString('ko-KR')}</td>
                <td className="py-2 text-right tabular-nums">{p.high.toLocaleString('ko-KR')}</td>
                <td className="py-2 text-right tabular-nums">{p.low.toLocaleString('ko-KR')}</td>
                <td className="py-2 text-right font-medium tabular-nums text-slate-900 dark:text-slate-100">
                  {p.close.toLocaleString('ko-KR')}
                </td>
                <td className="py-2 text-right text-xs tabular-nums text-slate-500">
                  {p.volume.toLocaleString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
