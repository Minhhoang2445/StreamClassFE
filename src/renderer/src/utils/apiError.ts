import type { AxiosError } from 'axios'

interface BackendErrorBody {
  status?: number
  message?: string
  error?: string
  timestamp?: string
}

export function getApiErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<BackendErrorBody | string>
  const status = axiosError.response?.status
  const data = axiosError.response?.data

  if (typeof data === 'string' && data.trim().length > 0) {
    return data
  }

  if (data && typeof data === 'object') {
    if (data.message) {
      return data.message
    }

    if (data.error) {
      return data.error
    }
  }

  if (status === 401) {
    return 'Phien dang nhap da het han. Vui long dang nhap lai.'
  }

  if (status === 403) {
    return 'Ban khong co quyen thuc hien thao tac nay.'
  }

  if (status === 404) {
    return 'Khong tim thay du lieu.'
  }

  if (status && status >= 500) {
    return 'Loi server.'
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Da co loi xay ra. Vui long thu lai.'
}
