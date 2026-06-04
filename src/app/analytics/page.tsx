"use client";

import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, Activity, Target,
  Zap, BarChart2, ArrowUpRight, ArrowDownRight, Download,
  Calendar, Search, ChevronUp, ChevronDown, ChevronsUpDown, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   PROJECT CONFIG
   Swap labels, table rows, and data below to reuse in any project.
   Replace sample* arrays with real API calls for production.
───────────────────────────────────────────────────────────────*/

const PAGE_TITLE       = "Analytics";

const TABLE_TITLE = "Top Performing Agents";

const tableRows = [
  { name: "Survey Designer",         sessions: 4821, users: 2104, conversion: "8.2%",  change: +12 },
  { name: "Policy Analyzer",         sessions: 3654, users: 1876, conversion: "6.7%",  change: +5  },
  { name: "Competitive Benchmarker", sessions: 2910, users: 1234, conversion: "5.1%",  change: -2  },
  { name: "Synthesis & Recs",        sessions: 1987, users:  890, conversion: "4.3%",  change: +18 },
  { name: "Data Extractor",          sessions: 1456, users:  678, conversion: "3.8%",  change: -7  },
  { name: "Report Generator",        sessions:  987, users:  423, conversion: "2.9%",  change: +3  },
];

const sourceData = [
  { name: "Direct",   value: 42 },
  { name: "Organic",  value: 28 },
  { name: "Referral", value: 18 },
  { name: "Social",   value: 12 },
];

/* ─── Time series ───────────────────────────────────────────*/

const timeSeries30 = [
  { date: "May 1",  sessions: 980,  users: 620  },
  { date: "May 2",  sessions: 1120, users: 710  },
  { date: "May 3",  sessions: 870,  users: 540  },
  { date: "May 4",  sessions: 1340, users: 880  },
  { date: "May 5",  sessions: 1560, users: 970  },
  { date: "May 6",  sessions: 1210, users: 760  },
  { date: "May 7",  sessions: 890,  users: 530  },
  { date: "May 8",  sessions: 1450, users: 920  },
  { date: "May 9",  sessions: 1680, users: 1040 },
  { date: "May 10", sessions: 1320, users: 820  },
  { date: "May 11", sessions: 1890, users: 1180 },
  { date: "May 12", sessions: 2100, users: 1310 },
  { date: "May 13", sessions: 1750, users: 1090 },
  { date: "May 14", sessions: 1420, users: 880  },
  { date: "May 15", sessions: 2240, users: 1400 },
  { date: "May 16", sessions: 2560, users: 1600 },
  { date: "May 17", sessions: 2180, users: 1360 },
  { date: "May 18", sessions: 2870, users: 1790 },
  { date: "May 19", sessions: 3100, users: 1940 },
  { date: "May 20", sessions: 2640, users: 1650 },
  { date: "May 21", sessions: 2210, users: 1380 },
  { date: "May 22", sessions: 3340, users: 2090 },
  { date: "May 23", sessions: 3560, users: 2220 },
  { date: "May 24", sessions: 3020, users: 1890 },
  { date: "May 25", sessions: 3780, users: 2360 },
  { date: "May 26", sessions: 4100, users: 2560 },
  { date: "May 27", sessions: 3650, users: 2280 },
  { date: "May 28", sessions: 3910, users: 2440 },
  { date: "May 29", sessions: 4320, users: 2700 },
  { date: "May 30", sessions: 4821, users: 3010 },
];

const timeSeries7 = timeSeries30.slice(-7);
const timeSeries90 = [
  { date: "Mar 1",  sessions: 420,  users: 260  },
  { date: "Mar 8",  sessions: 680,  users: 420  },
  { date: "Mar 15", sessions: 890,  users: 550  },
  { date: "Mar 22", sessions: 1120, users: 700  },
  { date: "Apr 1",  sessions: 1450, users: 910  },
  { date: "Apr 8",  sessions: 1870, users: 1170 },
  { date: "Apr 15", sessions: 2340, users: 1460 },
  { date: "Apr 22", sessions: 2890, users: 1810 },
  ...timeSeries30,
];

const weekdayData = [
  { day: "Mon", sessions: 3200 },
  { day: "Tue", sessions: 4100 },
  { day: "Wed", sessions: 4800 },
  { day: "Thu", sessions: 4500 },
  { day: "Fri", sessions: 3900 },
  { day: "Sat", sessions: 2100 },
  { day: "Sun", sessions: 1600 },
];

/* ─── KPI definitions ───────────────────────────────────────*/

const kpis = [
  { label: "Total Sessions", value: "24,521", change: +12.4, icon: Activity, trend: [980, 1120, 1340, 1680, 2100, 2870, 3560, 4821], color: "var(--color-chart-1)" },
  { label: "Active Users",   value: "8,234",  change: +7.8,  icon: Users,    trend: [620, 710, 880, 1040, 1310, 1790, 2220, 3010],  color: "var(--color-chart-2)" },
  { label: "Conversion Rate",value: "3.2%",   change: -1.2,  icon: Target,   trend: [3.8, 3.6, 3.9, 3.4, 3.5, 3.3, 3.1, 3.2],      color: "var(--color-chart-3)" },
  { label: "Avg. Response",  value: "1.4s",   change: +8.6,  icon: Zap,      trend: [1.9, 1.8, 1.7, 1.6, 1.5, 1.5, 1.4, 1.4],      color: "var(--color-chart-4)" },
];

/* ─── Helpers ───────────────────────────────────────────────*/

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function todayISO() { return new Date().toISOString().split("T")[0]; }
function daysAgoISO(n: number) { return new Date(Date.now() - n * 86_400_000).toISOString().split("T")[0]; }

/* ─── KPI Card ──────────────────────────────────────────────*/

function KpiCard({ kpi }: { kpi: typeof kpis[number] }) {
  const Icon  = kpi.icon;
  const up    = kpi.change >= 0;
  const Trend = up ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-[4px] bg-[#e6ebf8]">
            <Icon className="w-3.5 h-3.5 text-[#3c67ea]" />
          </div>
          <span className="text-[0.75rem] uppercase tracking-[0.08em] font-medium text-[#485478]">{kpi.label}</span>
        </div>
        <span className={cn(
          "flex items-center gap-0.5 text-[0.75rem] font-semibold px-1.5 py-0.5 rounded-[2px]",
          up ? "text-[#14a687] bg-white border-[#14a687]" : "text-[#db3743] bg-white border-[#f2919d]"
        )}>
          <Trend className="w-3 h-3" />
          {Math.abs(kpi.change)}%
        </span>
      </div>
      <p className="text-[1.375rem] font-semibold text-[#242d48] leading-[1.2]">{kpi.value}</p>
      <div className="h-10 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={kpi.trend.map(v => ({ v }))} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${kpi.label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={kpi.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={kpi.color} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={1.5} fill={`url(#grad-${kpi.label})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[0.75rem] text-[#485478] -mt-1">vs. last period</p>
    </div>
  );
}

/* ─── Custom tooltip ─────────────────────────────────────────*/

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] rounded-[4px] px-3 py-2 shadow-[0_2px_4px_rgba(36,45,72,0.15)] text-[0.75rem] uppercase tracking-[0.08em]">
      <p className="font-semibold text-[#242d48] mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#485478] capitalize">{p.name}:</span>
          <span className="font-semibold text-[#242d48] ml-auto pl-3">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const DONUT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

/* ─── Table sort icon ────────────────────────────────────────*/

type SortKey = "name" | "sessions" | "users" | "conversion" | "change";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-[#485478] flex-shrink-0" />;
  return dir === "asc"
    ? <ChevronUp   className="w-3 h-3 text-[#3c67ea] flex-shrink-0" />
    : <ChevronDown className="w-3 h-3 text-[#3c67ea] flex-shrink-0" />;
}

/* ─── Page ───────────────────────────────────────────────────*/

export default function AnalyticsPage() {
  /* date range */
  const [fromDate, setFromDate] = useState(daysAgoISO(30));
  const [toDate,   setToDate]   = useState(todayISO());

  function applyPreset(days: number) {
    setFromDate(daysAgoISO(days));
    setToDate(todayISO());
  }

  const diffDays  = Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86_400_000);
  const seriesData = diffDays <= 7 ? timeSeries7 : diffDays <= 30 ? timeSeries30 : timeSeries90;
  const rangeLabel = diffDays <= 7 ? "7D" : diffDays <= 30 ? "30D" : "90D+";

  /* table state */
  const [tableSearch,  setTableSearch]  = useState("");
  const [sortKey,      setSortKey]      = useState<SortKey>("sessions");
  const [sortDir,      setSortDir]      = useState<SortDir>("desc");
  const [trendFilter,  setTrendFilter]  = useState<"all" | "up" | "down">("all");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filteredRows = useMemo(() => {
    let rows = [...tableRows];
    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(q));
    }
    if (trendFilter === "up")   rows = rows.filter(r => r.change >= 0);
    if (trendFilter === "down") rows = rows.filter(r => r.change < 0);
    rows.sort((a, b) => {
      let av: number | string, bv: number | string;
      if (sortKey === "name")       { av = a.name;                     bv = b.name; }
      else if (sortKey === "sessions") { av = a.sessions;              bv = b.sessions; }
      else if (sortKey === "users")    { av = a.users;                 bv = b.users; }
      else if (sortKey === "conversion") { av = parseFloat(a.conversion); bv = parseFloat(b.conversion); }
      else                           { av = a.change;                  bv = b.change; }
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === "asc" ? (av - (bv as number)) : ((bv as number) - av);
    });
    return rows;
  }, [tableSearch, trendFilter, sortKey, sortDir]);

  return (
    <div className="app-bg min-h-screen">
      {/* ADS PageHeader */}
      <header
        style={{ display: "grid", gridTemplateAreas: "'back header actions'", gridTemplateColumns: "min-content 1fr auto", alignItems: "center" }}
        className="w-full h-[56px] bg-white border-b border-[#e6ebf8] px-4"
      >
        <div style={{ gridArea: "header" }} className="flex items-center gap-2 min-w-0">
          <BarChart2 className="w-4 h-4 text-[#3c67ea] shrink-0" />
          <h1 className="text-[1.375rem] font-semibold leading-[1.5] text-[#242d48]">{PAGE_TITLE}</h1>
        </div>
        <div style={{ gridArea: "actions" }} className="flex items-center gap-2">
          {/* ADS Input: date pickers with #F8F8FA bg, box-shadow, 2px radius */}
          <div className="flex items-center gap-2 rounded-[2px] bg-[#f8f8fa] shadow-[0_0_0_1px_#7885ab] px-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-[#485478] flex-shrink-0" />
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="text-[0.8125rem] text-[#242d48] bg-transparent outline-none w-[118px] cursor-pointer" />
            <span className="text-[0.8125rem] text-[#485478] select-none">—</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="text-[0.8125rem] text-[#242d48] bg-transparent outline-none w-[118px] cursor-pointer" />
          </div>
          {/* ADS SegmentedControls preset */}
          <div className="flex items-center gap-0 bg-[#f0f1f7] rounded-[2px] p-[1px]">
            {([7, 30, 90] as const).map(days => {
              const label = `${days}D`;
              const isActive = diffDays >= days - 2 && diffDays <= days + 2;
              return (
                <button key={days} onClick={() => applyPreset(days)}
                  className={cn(
                    "px-3 py-1 rounded-[2px] text-[0.8125rem] font-medium transition-all",
                    isActive
                      ? "bg-white text-[#3c67ea] font-semibold"
                      : "text-[#485478] hover:bg-[#f8f8fa]"
                  )}>{label}</button>
              );
            })}
          </div>
          {/* ADS Secondary (outline) button */}
          <button className="inline-flex items-center gap-2 py-2 px-4 rounded-[2px] text-[0.875rem] font-semibold text-[#3c67ea] shadow-[inset_0_0_0_1px_#3c67ea] hover:bg-[#f0f1f7] hover:shadow-[inset_0_0_0_2px_#1947ba] hover:text-[#1947ba] transition-all duration-200">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
        {/* KPI Cards — ADS Card */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map(kpi => <KpiCard key={kpi.label} kpi={kpi} />)}
        </div>

        {/* Main area chart — ADS Card */}
        <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden">
          <div className="px-4 py-4 border-b border-[#e6ebf8]">
            {/* ADS: apple 16px/600 */}
            <h2 className="text-[1rem] font-semibold text-[#242d48] leading-[1.2]">Sessions &amp; Users Over Time</h2>
            {/* ADS: cranberry 13px/400, #485478 */}
            <p className="text-[0.8125rem] font-normal text-[#485478] leading-[1.2] mt-1">Daily activity trend · {rangeLabel} view</p>
          </div>
        <div className="p-5">
          <div className="flex items-center gap-4 mb-4">
            {[
              { label: "Sessions", color: "hsl(var(--chart-1))" },
              { label: "Users",    color: "hsl(var(--chart-2))" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">
                <span className="w-3 h-0.5 rounded-full" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={seriesData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.6} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false} axisLine={false}
                interval={diffDays <= 7 ? 0 : diffDays <= 30 ? 4 : "preserveStartEnd"}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false} axisLine={false}
                tickFormatter={fmt}
              />
              <Tooltip content={<ChartTip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
              <Area type="monotone" dataKey="sessions" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#gradSessions)" dot={false} />
              <Area type="monotone" dataKey="users"    stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#gradUsers)"    dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        </div>

        {/* ── Bar + Donut row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e6ebf8]">
            <h2 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">Sessions by Day of Week</h2>
            <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] mt-0.5">Average weekly engagement pattern</p>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekdayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.6} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={fmt} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                  {weekdayData.map((_, i) => (
                    <Cell key={i} fill={i === 2 ? "hsl(var(--chart-1))" : "hsl(var(--chart-1) / 0.35)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e6ebf8]">
            <h2 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">Traffic Sources</h2>
            <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] mt-0.5">Session breakdown by acquisition channel</p>
          </div>
          <div className="p-5 flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={46} outerRadius={72} strokeWidth={2} stroke="hsl(var(--background))" dataKey="value">
                  {sourceData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] px-3 py-2 text-[0.8125rem]">
                      <p className="font-semibold text-[#242d48]">{payload[0].name}</p>
                      <p className="text-[#485478]">{payload[0].value}% of sessions</p>
                    </div>
                  );
                }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2.5 flex-1">
              {sourceData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i] }} />
                    <span className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1 rounded-full bg-[#f0f1f7] w-16 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: DONUT_COLORS[i] }} />
                    </div>
                    <span className="text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#242d48] w-8 text-right">{s.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Top items table ── */}
      <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden">

        {/* Table header + filters */}
        <div className="px-5 py-4 border-b border-[#e6ebf8] space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">{TABLE_TITLE}</h2>
              <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] mt-0.5">Ranked by total sessions this period</p>
            </div>
            <button className="text-[0.75rem] uppercase tracking-[0.08em] font-medium text-[#3c67ea] hover:underline flex items-center gap-1 flex-shrink-0">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#485478] pointer-events-none" />
              <input
                type="text"
                placeholder="Search agents…"
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                className="bg-[#f8f8fa] border-2 border-dotted border-transparent shadow-[0_0_0_1px_#7885ab] focus:border-[#485478] focus:shadow-none rounded-[4px] pl-7 pr-7 py-1.5 text-[0.75rem] uppercase tracking-[0.08em] outline-none w-44"
              />
              {tableSearch && (
                <button onClick={() => setTableSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#485478] hover:text-[#242d48]">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Trend filter */}
            <div className="flex items-center gap-1 bg-[#f0f1f7] rounded-[4px] p-0.5">
              {(["all", "up", "down"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTrendFilter(f)}
                  className={cn(
                    "px-2.5 py-1 rounded-[4px] text-[0.75rem] uppercase tracking-[0.08em] font-medium transition-all flex items-center gap-1",
                    trendFilter === f ? "bg-white text-[#242d48] shadow-[0_2px_4px_rgba(36,45,72,0.15)]" : "text-[#485478] hover:text-[#242d48]"
                  )}
                >
                  {f === "up"   && <TrendingUp   className="w-3 h-3 text-[#14a687]" />}
                  {f === "down" && <TrendingDown  className="w-3 h-3 text-[#db3743]"    />}
                  {f === "all" ? "All" : f === "up" ? "Rising" : "Declining"}
                </button>
              ))}
            </div>

            <span className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] ml-auto">
              {filteredRows.length} of {tableRows.length}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <colgroup>
              <col />
              <col className="w-32" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-24" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#e6ebf8] bg-[#f0f1f7]">
                {/* Agent */}
                <th className="px-5 py-2.5 text-left">
                  <button onClick={() => handleSort("name")} className="flex items-center gap-1 text-[0.75rem] font-medium text-[#485478] uppercase tracking-[0.08em] hover:text-[#242d48] transition-colors">
                    Agent <SortIcon active={sortKey === "name"} dir={sortDir} />
                  </button>
                </th>
                {/* Sessions */}
                <th className="px-5 py-2.5 text-right">
                  <button onClick={() => handleSort("sessions")} className="flex items-center gap-1 text-[0.75rem] font-medium text-[#485478] uppercase tracking-[0.08em] hover:text-[#242d48] transition-colors ml-auto">
                    Sessions <SortIcon active={sortKey === "sessions"} dir={sortDir} />
                  </button>
                </th>
                {/* Users */}
                <th className="px-5 py-2.5 text-right">
                  <button onClick={() => handleSort("users")} className="flex items-center gap-1 text-[0.75rem] font-medium text-[#485478] uppercase tracking-[0.08em] hover:text-[#242d48] transition-colors ml-auto">
                    Users <SortIcon active={sortKey === "users"} dir={sortDir} />
                  </button>
                </th>
                {/* Conv. Rate */}
                <th className="px-5 py-2.5 text-right">
                  <button onClick={() => handleSort("conversion")} className="flex items-center gap-1 text-[0.75rem] font-medium text-[#485478] uppercase tracking-[0.08em] hover:text-[#242d48] transition-colors ml-auto">
                    Conv. Rate <SortIcon active={sortKey === "conversion"} dir={sortDir} />
                  </button>
                </th>
                {/* Trend */}
                <th className="px-5 py-2.5 text-right">
                  <button onClick={() => handleSort("change")} className="flex items-center gap-1 text-[0.75rem] font-medium text-[#485478] uppercase tracking-[0.08em] hover:text-[#242d48] transition-colors ml-auto">
                    Trend <SortIcon active={sortKey === "change"} dir={sortDir} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-[0.875rem] leading-[1.2] text-[#485478]">
                    No agents match your filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, i) => {
                  const up = row.change >= 0;
                  return (
                    <tr key={row.name} className="border-t border-[#e6ebf8] hover:bg-[#f0f1f7] transition-colors">
                      {/* Agent name */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-5 text-[0.75rem] font-semibold text-[#485478] text-right flex-shrink-0">
                            {i + 1}
                          </span>
                          <div className="w-7 h-7 rounded-[4px] bg-[#f0f1f7] flex items-center justify-center flex-shrink-0">
                            <BarChart2 className="w-3.5 h-3.5 text-[#3c67ea]" />
                          </div>
                          <span className="text-[0.875rem] leading-[1.2] font-medium text-[#242d48] truncate">{row.name}</span>
                        </div>
                      </td>
                      {/* Sessions */}
                      <td className="px-5 py-3 text-right">
                        <span className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48] tabular-nums">{row.sessions.toLocaleString()}</span>
                      </td>
                      {/* Users */}
                      <td className="px-5 py-3 text-right">
                        <span className="text-[0.875rem] leading-[1.2] text-[#485478] tabular-nums">{row.users.toLocaleString()}</span>
                      </td>
                      {/* Conversion */}
                      <td className="px-5 py-3 text-right">
                        <span className="text-[0.875rem] leading-[1.2] text-[#485478] tabular-nums">{row.conversion}</span>
                      </td>
                      {/* Trend */}
                      <td className="px-5 py-3 text-right">
                        <span className={cn(
                          "inline-flex items-center gap-0.5 text-[0.75rem] font-semibold px-1.5 py-0.5 rounded-[2px]",
                          up ? "text-[#14a687] bg-white border-[#14a687]" : "text-[#db3743] bg-white border-[#f2919d]"
                        )}>
                          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(row.change)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </div>

      </div>
    </div>
  );
}
