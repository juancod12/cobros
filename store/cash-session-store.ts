import { useSyncExternalStore } from 'react';

import type { CashExpense, CashMovement, CashSession } from '@/services/cash';

type CashSessionState = {
  currentSession: CashSession | null;
};

let state: CashSessionState = {
  currentSession: null,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(partial: Partial<CashSessionState>) {
  state = { ...state, ...partial };
  emit();
}

function movementSignedAmount(movement: CashMovement): number {
  if (movement.type === 'IN') {
    return movement.amount;
  }

  if (movement.type === 'OUT') {
    return -movement.amount;
  }

  return movement.amount;
}

export function setCurrentCashSession(session: CashSession | null) {
  setState({ currentSession: session });
}

export function mergeCurrentCashSession(session: Partial<CashSession>) {
  if (!state.currentSession) {
    return;
  }

  setState({
    currentSession: {
      ...state.currentSession,
      ...session,
    },
  });
}

export function addCashMovement(movement: CashMovement) {
  const session = state.currentSession;

  if (!session) {
    return;
  }

  const signedAmount = movementSignedAmount(movement);

  setState({
    currentSession: {
      ...session,
      movements: [movement, ...(session.movements ?? [])],
      totalIncome: signedAmount > 0 ? session.totalIncome + signedAmount : session.totalIncome,
      totalOutflow: signedAmount < 0 ? session.totalOutflow + Math.abs(signedAmount) : session.totalOutflow,
      expectedBalance: session.expectedBalance + signedAmount,
    },
  });
}

export function addCashExpense(expense: CashExpense) {
  const session = state.currentSession;

  if (!session) {
    return;
  }

  setState({
    currentSession: {
      ...session,
      expenses: [expense, ...(session.expenses ?? [])],
      totalExpenses: session.totalExpenses + expense.amount,
      expectedBalance: session.expectedBalance - expense.amount,
    },
  });
}

export function useCashSessionStore() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state
  );
}
