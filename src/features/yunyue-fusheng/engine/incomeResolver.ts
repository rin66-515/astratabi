import {
  MENTOR_ALLOWANCE_JPY,
  SALARY_REVIEW_INTERVAL_MONTHS,
  salaryRaiseRules,
} from '../data/incomeLivingConfig'
import type { EmploymentState, GameStats, IncomeBreakdown } from '../types/game'

export type EmploymentResolution = {
  employment: EmploymentState
  income: IncomeBreakdown
  actionPointModifier: number
}

function salaryReviewScore(stats: GameStats, employment: EmploymentState) {
  let score = 0
  if (stats.workTrust >= 8) score += 2
  if (stats.workTrust >= 18) score += 2
  if (stats.tech >= 40) score += 2
  if (stats.tech >= 55) score += 1
  if (stats.workplace >= 35) score += 2
  if (stats.workplace >= 50) score += 1
  if (employment.isMentoringJunior) score += 1
  return score
}

function salaryRaiseJpy(stats: GameStats, employment: EmploymentState) {
  const score = salaryReviewScore(stats, employment)
  return salaryRaiseRules.find((rule) => score >= rule.minimumScore)?.raiseJpy ?? 0
}

export function incomeBreakdown(employment: EmploymentState, raiseJpy = 0): IncomeBreakdown {
  const totalIncomeJpy = employment.baseSalaryJpy
    + employment.roleAllowanceJpy
    + employment.mentorAllowanceJpy
    + employment.overtimeIncomeJpy
  return { ...employment, totalIncomeJpy, raiseJpy }
}

export function resolveEmploymentMonth(
  current: EmploymentState,
  stats: GameStats,
  elapsedMonth: number,
  flags: readonly string[],
): EmploymentResolution {
  const mentoring = current.isMentoringJunior || flags.includes('mentoring_junior_active')
  let employment: EmploymentState = {
    ...current,
    isMentoringJunior: mentoring,
    mentorAllowanceJpy: mentoring ? MENTOR_ALLOWANCE_JPY : 0,
  }
  const reviewDue = elapsedMonth >= SALARY_REVIEW_INTERVAL_MONTHS
    && elapsedMonth % SALARY_REVIEW_INTERVAL_MONTHS === 0
    && current.lastSalaryReviewMonth < elapsedMonth
  const raiseJpy = reviewDue ? salaryRaiseJpy(stats, employment) : 0
  if (reviewDue) {
    employment = {
      ...employment,
      baseSalaryJpy: employment.baseSalaryJpy + raiseJpy,
      lastSalaryReviewMonth: elapsedMonth,
    }
  }
  return {
    employment,
    income: incomeBreakdown(employment, raiseJpy),
    actionPointModifier: mentoring ? -1 : 0,
  }
}
