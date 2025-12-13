import { format } from 'date-fns'

export function formatDate(date: string | Date) {
  return format(new Date(date), 'dd MMM yyyy')
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(amount)
}
