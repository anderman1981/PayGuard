// @ts-check
/** R08 · Las fechas son reales, no futuras, y la factura no está vencida hace demasiado. */
import { PASS, daysBetween, todayIso } from './helpers.js';
import { isIsoDate } from '../validators/international.js';

/** @type {import('./helpers.js').Rule} */
export const r08 = {
  id: 'R08',
  nameKey: 'r08.name',
  evaluate(inv, ctx) {
    const today = todayIso(ctx.now);
    for (const field of /** @type {const} */ (['issueDate', 'dueDate'])) {
      const value = inv[field];
      if (value !== null && value !== undefined && !isIsoDate(value)) {
        return {
          verdict: 'ESCALATE',
          messageKey: 'r08.invalid',
          vars: { field, value: String(value) },
          evidence: { field, value },
        };
      }
    }
    if (inv.issueDate && daysBetween(today, inv.issueDate) > 0) {
      return {
        verdict: 'ESCALATE',
        messageKey: 'r08.future',
        vars: { date: inv.issueDate },
        evidence: { issueDate: inv.issueDate, today },
      };
    }
    const overdue = inv.dueDate ? daysBetween(inv.dueDate, today) : 0;
    if (overdue > ctx.rules.maxDaysOverdue) {
      return {
        verdict: 'ESCALATE',
        messageKey: 'r08.overdue',
        vars: { days: overdue, date: String(inv.dueDate), max: ctx.rules.maxDaysOverdue },
        evidence: { dueDate: inv.dueDate, overdueDays: overdue, max: ctx.rules.maxDaysOverdue },
      };
    }
    return PASS;
  },
};
