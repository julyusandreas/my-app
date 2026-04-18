export type LeftoverType = 'nasi' | 'sayuran' | 'lauk'

export type AnalyzeResult = {
  isCleanPlate: boolean
  leftoverTypes: LeftoverType[]
  message: string
}

export type RecordItem = {
  id: string
  user_id: string
  image_url: string
  image_path: string
  is_clean_plate: boolean
  leftover_rice: boolean
  leftover_vegetable: boolean
  leftover_side_dish: boolean
  ai_message: string | null
  created_at: string
}

export type DashboardResponse = {
  riceCount: number
  vegetableCount: number
  sideDishCount: number
  cleanPlateCount: number
  tryAgainCount: number
  history: RecordItem[]
}