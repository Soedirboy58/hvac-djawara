import { ErrorBoundary } from '@/components/ErrorBoundary'
import SchedulePageWithTabs from './schedule-page-new'

export default function SchedulePage() {
  return (
    <ErrorBoundary>
      <SchedulePageWithTabs />
    </ErrorBoundary>
  )
}

