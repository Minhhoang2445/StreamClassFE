export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || !Number.isFinite(bytes) || bytes < 0) {
    return ''
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  const rounded = size >= 10 ? Math.round(size) : Math.round(size * 10) / 10
  return `${rounded} ${units[unitIndex]}`
}
