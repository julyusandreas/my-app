'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  CalendarDays,
  Leaf,
  Percent,
  UsersRound,
} from 'lucide-react'

type DashboardData = {
  summary: {
    totalRespondents: number
    maleRespondents: number
    femaleRespondents: number
    totalScans: number
    cleanScans: number
    wasteScans: number
    wasteRate: number
    cleanRate: number
    startDateLabel: string | null
    endDateLabel: string | null
  }
  trendByDate: {
    date: string
    totalScans: number
    clean: number
    waste: number
    wasteRate: number
  }[]
  behaviorByGender: {
    gender: string
    totalScans: number
    clean: number
    waste: number
    wasteRate: number
    rice: number
    vegetables: number
    proteinDishes: number
  }[]
  foodWasteType: {
    rice: number
    vegetables: number
    proteinDishes: number
  }
}

const COLORS = {
  green: '#10b981',
  lime: '#84cc16',
  amber: '#f59e0b',
  blue: '#38bdf8',
  pink: '#f472b6',
}

function getRangeLabel(rangeFilter: string, customDays: number) {
  if (rangeFilter === 'all') return 'All Time'
  if (rangeFilter === 'custom') return `Last ${customDays} Days`
  if (rangeFilter === '7d') return 'Last 7 Days'
  if (rangeFilter === '14d') return 'Last 14 Days'
  if (rangeFilter === '30d') return 'Last 30 Days'
  return 'Last 30 Days'
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [genderFilter, setGenderFilter] = useState('all')
  const [rangeFilter, setRangeFilter] = useState('30d')
  const [groupBy, setGroupBy] = useState('daily')
  const [customDays, setCustomDays] = useState(10)

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const params = new URLSearchParams({
          gender: genderFilter,
          range: rangeFilter,
          groupBy,
          days: customDays.toString(),
        })

        const res = await fetch(`/api/dashboard-public?${params.toString()}`, {
          cache: 'no-store',
        })

        const result = await res.json()

        if (!res.ok) {
          setError(result.error || 'Failed to load dashboard.')
          return
        }

        setData(result)
      } catch {
        setError('Failed to load dashboard.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [genderFilter, rangeFilter, groupBy, customDays])

  const foodWasteTypeData = useMemo(() => {
    if (!data) return []

    return [
      { name: 'Rice', total: data.foodWasteType.rice },
      { name: 'Vegetables', total: data.foodWasteType.vegetables },
      { name: 'Protein Dishes', total: data.foodWasteType.proteinDishes },
    ]
  }, [data])

  const foodWasteTypeByGender = useMemo(() => {
    if (!data) return []

    return data.behaviorByGender.map((item) => ({
      gender: item.gender,
      Rice: item.rice,
      Vegetables: item.vegetables,
      'Protein Dishes': item.proteinDishes,
    }))
  }, [data])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-emerald-50">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-semibold text-slate-600 shadow-sm">
          Loading dashboard...
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-red-50 px-5">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-semibold text-red-600 shadow-sm">
          {error || 'Dashboard data is not available.'}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(187,247,208,0.55),_transparent_35%),linear-gradient(to_bottom,_#f7fdf8,_#ffffff)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(16,24,40,0.08)] backdrop-blur md:p-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
            <Leaf className="size-4" />
            Clean Plate Monitoring Dashboard
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Food Waste Behavior Dashboard
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            This dashboard monitors food waste behavior based on plate scan data,
            detection results, monitoring period, and gender-based comparison.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Respondents"
            value={data.summary.totalRespondents}
            subtitle={`Male: ${data.summary.maleRespondents} • Female: ${data.summary.femaleRespondents}`}
            icon={<UsersRound className="size-5" />}
          />

          <KpiCard
            title="Monitoring Period"
            value={
              data.summary.startDateLabel && data.summary.endDateLabel
                ? data.summary.startDateLabel
                : '-'
            }
            subtitle={
              data.summary.startDateLabel && data.summary.endDateLabel
                ? `to ${data.summary.endDateLabel}`
                : 'No scan data yet'
            }
            icon={<CalendarDays className="size-5" />}
          />

          <KpiCard
            title="Total Plate Scans"
            value={data.summary.totalScans}
            subtitle={`${data.summary.cleanScans} clean • ${data.summary.wasteScans} waste detected`}
            icon={<Activity className="size-5" />}
          />

          <KpiCard
            title="Waste Rate"
            value={`${data.summary.wasteRate}%`}
            subtitle="Food waste detected / total scans"
            icon={<Percent className="size-5" />}
            tone="amber"
          />
        </section>

        <section className="mt-6 rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(16,24,40,0.07)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Dynamic Trend Filter
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Use these filters to analyze waste rate trends by time period,
                gender, and grouping.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Time Range
                </label>
                <select
                  value={rangeFilter}
                  onChange={(e) => setRangeFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="14d">Last 14 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="custom">Custom Days</option>
                  <option value="all">All Time</option>
                </select>

                {rangeFilter === 'custom' && (
                  <input
                    type="number"
                    min={1}
                    value={customDays}
                    onChange={(e) =>
                      setCustomDays(Math.max(1, Number(e.target.value)))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Example: 10"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Gender
                </label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="all">All Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Grouping
                </label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Waste Rate Over Time"
            description="Shows whether food waste behavior tends to increase or decrease during the selected trend period."
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Range: {getRangeLabel(rangeFilter, customDays)}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Gender: {genderFilter === 'all' ? 'All Gender' : genderFilter}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Grouping: {groupBy}
              </span>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data.trendByDate}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" interval="preserveStartEnd" minTickGap={20} />
                <YAxis unit="%" domain={[0, 100]} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Line
                  type="monotone"
                  dataKey="wasteRate"
                  name="Waste Rate"
                  stroke={COLORS.amber}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Clean Plate vs Food Waste Detected by Date"
            description="Shows daily scan composition, so the dashboard does not only show percentages but also time-based behavior."
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.trendByDate}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" interval="preserveStartEnd" minTickGap={20} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="clean"
                  name="No Food Waste"
                  stackId="a"
                  fill={COLORS.green}
                  radius={[0, 0, 8, 8]}
                />
                <Bar
                  dataKey="waste"
                  name="Food Waste Detected"
                  stackId="a"
                  fill={COLORS.amber}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Waste Rate by Gender"
            description="Compares food waste behavior between male and female respondents. This can support different treatment or recommendation strategies."
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.behaviorByGender}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="gender" />
                <YAxis unit="%" domain={[0, 100]} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="wasteRate" name="Waste Rate" radius={[12, 12, 0, 0]}>
                  {data.behaviorByGender.map((entry) => (
                    <Cell
                      key={entry.gender}
                      fill={entry.gender === 'Male' ? COLORS.blue : COLORS.pink}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Food Waste Type Count"
            description="Shows which type of leftover food appears most frequently. This replaces the previous pie chart to avoid duplicated visualization."
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={foodWasteTypeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" name="Total Detected" radius={[12, 12, 0, 0]}>
                  {foodWasteTypeData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === 'Rice'
                          ? COLORS.lime
                          : entry.name === 'Vegetables'
                            ? COLORS.green
                            : COLORS.amber
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="mt-6">
          <ChartCard
            title="Food Waste Type by Gender"
            description="Shows whether male and female respondents have different leftover food patterns. This can help determine whether recommendations should be differentiated by gender."
          >
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={foodWasteTypeByGender}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="gender" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Rice" fill={COLORS.lime} radius={[10, 10, 0, 0]} />
                <Bar dataKey="Vegetables" fill={COLORS.green} radius={[10, 10, 0, 0]} />
                <Bar dataKey="Protein Dishes" fill={COLORS.amber} radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="mt-6 rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-5 text-sm leading-6 text-slate-600">
          <p className="font-semibold text-emerald-700">
            Waste Rate Definition
          </p>
          <p className="mt-1">
            Waste Rate (%) = Food Waste Detected ÷ Total Plate Scans × 100.
            The unit is percentage of total scan records during the selected
            filter period.
          </p>
        </section>
      </div>
    </main>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  tone = 'green',
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  tone?: 'green' | 'amber'
}) {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_16px_45px_rgba(16,24,40,0.07)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${
          tone === 'amber'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-emerald-50 text-emerald-700'
        }`}
      >
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{subtitle}</p>
    </div>
  )
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(16,24,40,0.07)]">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  )
}