// src/utils/formatting.js

export const formatNumberForDisplay = (number) => {
  if (number === '' || number === null || number === undefined || isNaN(number)) return '';
  // Usa formato chileno (puntos para miles)
  return Math.round(number).toLocaleString('es-CL');
};

export const parseFormattedNumber = (formattedString) => {
  if (typeof formattedString !== 'string') return formattedString;
  // Elimina todo lo que no sea número
  const sanitizedString = formattedString.replace(/\D/g, '');
  return sanitizedString === '' ? 0 : parseInt(sanitizedString, 10);
};

export const formatRate = (rate) => {
  if (isNaN(rate) || rate === null || rate === undefined) return '0';
  // Use 2 decimals for large rates (≥1), 4 for fractional rates
  return rate >= 1 ? rate.toFixed(2) : rate.toFixed(4);
};