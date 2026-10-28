import { storage } from '@ury/core';

export function formatCurrency(amount: number): string {
  const symbol = (storage as any)?.getItem?.('currencySymbol') || 'R$';
  const formattedVal = typeof amount === 'number' && !isNaN(amount) ? amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : amount;
  return `${symbol} ${formattedVal}`;
}

export function formatInvoiceTime(timestamp: string | null): string {
  if (!timestamp) return 'Sem atividade de conta ainda';
  const parsedDate = new Date(timestamp);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return timestamp;
}
