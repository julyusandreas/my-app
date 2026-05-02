'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  Drumstick,
  Leaf,
  PieChartIcon,
  Salad,
  Soup,
  Sparkles,
  UsersRound,
  Venus,
  Mars,
  AlertTriangle,
} from 'lucide-react'

type DashboardData = {
  totalUsers: number
  male: number
  female: number
  totalScans: number
  clean: number
  waste: number
  rice: number
  vegetable: number
  sideDish: number
  wasteRate: number
  cleanRate: number
  avgScanPerUser: number
  dominantWaste: {
    name: string
    value: number
  }
}

const COLORS = {
  green: '#10b981',
  lime: '#84cc16',
  amber: '#f59e0b',
  blue: '#38bdf8',
  pink: '#f472b6',
  slate: '#64748b',
}

export default function PublicDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const res = await fetch('/api/dashboard-public')
        const result = await res.json()

        if (!res.ok) {
          setError(result.error || 'Gagal memuat dashboard.')
          return
        }

        setData(result)
      } catch {
        setError('Terjadi kesalahan saat memuat dashboard.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const wastePieData = useMemo(() => {
    if (!data) return []

    return [
      { name: 'No Food Waste', value: data.clean },
      { name: 'Food Waste Detected', value: data.waste },
    ].filter((item) => item.value > 0)
  }, [data])

  const foodWastePieData = useMemo(() => {
    if (!data) return []

    return [
      { name: 'Rice', value: data.rice },
      { name: 'Vegetables', value: data.vegetable },
      { name: 'Protein Dishes', value: data.sideDish },
    ].filter((item) => item.value > 0)
  }, [data])

  const foodWasteBarData = useMemo(() => {
    if (!data) return []

    return [
      { name: 'Rice', total: data.rice },
      { name: 'Vegetables', total: data.vegetable },
      { name: 'Protein Dishes', total: data.sideDish },
    ]
  }, [data])

  const genderData = useMemo(() => {
    if (!data) return []

    return [
      { name: 'Male', total: data.male },
      { name: 'Female', total: data.female },
    ]
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
          {error || 'Data dashboard tidak tersedia.'}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(187,247,208,0.55),_transparent_35%),linear-gradient(to_bottom,_#f7fdf8,_#ffffff)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 overflow-hidden rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(16,24,40,0.08)] backdrop-blur md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                <Leaf className="size-4" />
                CleanPlate Public Dashboard
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                CleanPlate Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                This dashboard summarizes respondents’ food waste results based on plate scans and leftover food classification.
              </p>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-500 px-5 py-4 text-white shadow-[0_16px_40px_rgba(34,197,94,0.25)]">
              <p className="text-xs font-medium opacity-90">Waste Rate</p>
              <p className="text-3xl font-bold">{data.wasteRate}%</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Respondents"
            value={data.totalUsers}
            subtitle={`Male ${data.male} • Female ${data.female}`}
            icon={<UsersRound className="size-5" />}
          />
          <KpiCard
            title="Total Scan"
            value={data.totalScans}
            subtitle=""
            icon={<Activity className="size-5" />}
          />
          <KpiCard
            title="No Food Waste"
            value={data.clean}
            subtitle={`${data.cleanRate}% of total scans`}
            icon={
              <img
                src="/illustrations/nofoodwaste.png"
                alt="No Food Waste"
                className="h-10 w-10 object-contain"
              />
            }
          />

          <KpiCard
            title="Food Waste Detected"
            value={data.waste}
            subtitle={`${data.wasteRate}% of total scans`}
            icon={
              <img
                src="/illustrations/foodwastedetected.png"
                alt="Food Waste"
                className="h-10 w-10 object-contain"
              />
            }
            tone="amber"
          />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MiniCard
            title="Male Respondents"
            value={data.male}
            icon={<Mars className="size-5" />}
          />
          <MiniCard
            title="Female Respondents"
            value={data.female}
            icon={<Venus className="size-5" />}
          />
          <MiniCard
            title="Dominant Waste Type"
            value={
              data.dominantWaste?.value > 0
                ? data.dominantWaste.name
                : 'Belum ada'
            }
            icon={<PieChartIcon className="size-5" />}
          />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="No Food Waste vs Food Waste Detected"
            description="This chart shows the proportion of clean plate scans compared to scans with remaining food."
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={wastePieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={4}
                  label
                >
                  {wastePieData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={index === 0 ? COLORS.green : COLORS.amber}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Type of Food Waste"
            description="Breakdown of leftover food types: rice, vegetables, and protein dishes."
          >
            {foodWastePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={foodWastePieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={4}
                    label
                  >
                    {foodWastePieData.map((entry) => (
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
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart text="Belum ada data sisa makanan." />
            )}
          </ChartCard>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Food Waste Category Count"
            description="Number of occurrences for each food waste type."
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={foodWasteBarData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" radius={[12, 12, 0, 0]}>
                  {foodWasteBarData.map((entry) => (
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

          <ChartCard
            title="Respondent Gender Distribution"
            description="This chart shows the distribution of respondents by gender."
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={genderData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" radius={[12, 12, 0, 0]}>
                  <Cell fill={COLORS.blue} />
                  <Cell fill={COLORS.pink} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
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
  value: number
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
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
    </div>
  )
}

function MiniCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4 rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400">{title}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
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

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-3xl bg-slate-50 text-sm text-slate-400">
      {text}
    </div>
  )
}