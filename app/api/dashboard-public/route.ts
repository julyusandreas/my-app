import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

type UserRow = {
  id: string
  gender: string | null
}

type RecordRow = {
  id: string
  user_id: string
  is_clean_plate: boolean | null
  leftover_rice: boolean | null
  leftover_vegetable: boolean | null
  leftover_side_dish: boolean | null
  created_at: string
}

type TrendItem = {
  date: string
  totalScans: number
  clean: number
  waste: number
  wasteRate: number
}

function getDateKey(dateString: string, groupBy: string) {
  const date = new Date(dateString)

  if (groupBy === 'weekly') {
    const firstDay = new Date(date)
    firstDay.setDate(date.getDate() - date.getDay())
    return firstDay.toISOString().slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function formatDate(dateString: string | null) {
  if (!dateString) return null

  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getRangeDays(rangeFilter: string, customDays: number) {
  if (rangeFilter === '7d') return 7
  if (rangeFilter === '14d') return 14
  if (rangeFilter === '30d') return 30
  if (rangeFilter === 'custom') return customDays
  return 30
}

export async function GET(req: Request) {
  try {
    const supabase = createAdminSupabaseClient()

    const { searchParams } = new URL(req.url)
    const genderFilter = searchParams.get('gender') ?? 'all'
    const rangeFilter = searchParams.get('range') ?? '30d'
    const groupBy = searchParams.get('groupBy') ?? 'daily'

    const customDaysParam = Number(searchParams.get('days') ?? 10)
    const customDays =
      Number.isFinite(customDaysParam) && customDaysParam > 0
        ? customDaysParam
        : 10

    // USERS
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, gender')

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    // RECORDS (DESC = terbaru dulu)
    const { data: recordsData, error: recordsError } = await supabase
  .from('scan_records')
  .select(
    'id, user_id, is_clean_plate, leftover_rice, leftover_vegetable, leftover_side_dish, created_at'
  )
  .order('created_at', { ascending: false })
  .range(0, 10000) // ⬅️ penting!

    if (recordsError) {
      return NextResponse.json({ error: recordsError.message }, { status: 500 })
    }

    const users = (usersData ?? []) as UserRow[]
    const records = (recordsData ?? []) as RecordRow[]

    const userGenderMap = new Map(users.map((u) => [u.id, u.gender]))

    // FILTER BY GENDER
    const recordsByGender =
      genderFilter === 'all'
        ? records
        : records.filter(
            (r) => userGenderMap.get(r.user_id) === genderFilter
          )

    // LATEST DATE (karena DESC → index 0)
    const latestRecordDate =
      recordsByGender.length > 0
        ? new Date(recordsByGender[0].created_at)
        : null

    const rangeDays = getRangeDays(rangeFilter, customDays)

    // FILTER BY RANGE
    const filteredRecords =
      rangeFilter === 'all' || !latestRecordDate
        ? recordsByGender
        : recordsByGender.filter((record) => {
            const recordDate = new Date(record.created_at)
            const startDate = new Date(latestRecordDate)
            startDate.setDate(latestRecordDate.getDate() - rangeDays + 1)

            return recordDate >= startDate && recordDate <= latestRecordDate
          })

    // ⬇️ SORT ASC cuma buat ambil periode (biar urut lama → baru)
    const sortedFiltered = [...filteredRecords].sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    )

    const startDate = sortedFiltered[0]?.created_at ?? null
    const endDate =
      sortedFiltered[sortedFiltered.length - 1]?.created_at ?? null

    // TREND
    const trendMap = new Map<string, TrendItem>()

    for (const record of filteredRecords) {
      const dateKey = getDateKey(record.created_at, groupBy)

      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, {
          date: dateKey,
          totalScans: 0,
          clean: 0,
          waste: 0,
          wasteRate: 0,
        })
      }

      const item = trendMap.get(dateKey)!
      item.totalScans++

      if (record.is_clean_plate === true) item.clean++
      if (record.is_clean_plate === false) item.waste++

      item.wasteRate =
        item.totalScans > 0
          ? Number(((item.waste / item.totalScans) * 100).toFixed(1))
          : 0
    }

    const trendByDate: TrendItem[] =
      filteredRecords.length === 0
        ? []
        : Array.from(trendMap.values()).sort(
            (a, b) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
          )

    // SUMMARY
    const totalRespondents = users.length
    const maleRespondents = users.filter((u) => u.gender === 'male').length
    const femaleRespondents = users.filter(
      (u) => u.gender === 'female'
    ).length

    const totalScans = filteredRecords.length
    const cleanScans = filteredRecords.filter(
      (r) => r.is_clean_plate === true
    ).length
    const wasteScans = filteredRecords.filter(
      (r) => r.is_clean_plate === false
    ).length

    const wasteRate =
      totalScans > 0 ? Number(((wasteScans / totalScans) * 100).toFixed(1)) : 0

    const cleanRate =
      totalScans > 0 ? Number(((cleanScans / totalScans) * 100).toFixed(1)) : 0

    const foodWasteType = {
      rice: filteredRecords.filter((r) => r.leftover_rice === true).length,
      vegetables: filteredRecords.filter(
        (r) => r.leftover_vegetable === true
      ).length,
      proteinDishes: filteredRecords.filter(
        (r) => r.leftover_side_dish === true
      ).length,
    }

    const genderMap = new Map([
      [
        'male',
        {
          gender: 'Male',
          totalScans: 0,
          clean: 0,
          waste: 0,
          wasteRate: 0,
          rice: 0,
          vegetables: 0,
          proteinDishes: 0,
        },
      ],
      [
        'female',
        {
          gender: 'Female',
          totalScans: 0,
          clean: 0,
          waste: 0,
          wasteRate: 0,
          rice: 0,
          vegetables: 0,
          proteinDishes: 0,
        },
      ],
    ])

    for (const record of filteredRecords) {
      const gender = userGenderMap.get(record.user_id)
      if (gender !== 'male' && gender !== 'female') continue

      const item = genderMap.get(gender)!
      item.totalScans++

      if (record.is_clean_plate === true) item.clean++
      if (record.is_clean_plate === false) item.waste++
      if (record.leftover_rice === true) item.rice++
      if (record.leftover_vegetable === true) item.vegetables++
      if (record.leftover_side_dish === true) item.proteinDishes++

      item.wasteRate =
        item.totalScans > 0
          ? Number(((item.waste / item.totalScans) * 100).toFixed(1))
          : 0
    }

    return NextResponse.json({
      summary: {
        totalRespondents,
        maleRespondents,
        femaleRespondents,
        totalScans,
        cleanScans,
        wasteScans,
        wasteRate,
        cleanRate,
        startDate,
        endDate,
        startDateLabel: formatDate(startDate),
        endDateLabel: formatDate(endDate),
      },
      foodWasteType,
      trendByDate,
      behaviorByGender: Array.from(genderMap.values()),
      activeFilters: {
        gender: genderFilter,
        range: rangeFilter,
        groupBy,
        days: customDays,
      },
    })
  } catch (error) {
    console.error('Public dashboard error:', error)

    return NextResponse.json(
      { error: 'Failed to load public dashboard.' },
      { status: 500 }
    )
  }
}