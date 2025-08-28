export interface Photo {
  id: string
  original_url: string
  cartoon_url?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  approved_at?: string
  user_session?: string
  processing_error?: string
}

export interface UploadResponse {
  success: boolean
  photo?: Photo
  error?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export type PhotoStatus = 'pending' | 'approved' | 'rejected'