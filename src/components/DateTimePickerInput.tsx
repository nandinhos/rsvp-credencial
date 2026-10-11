import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Sparkles } from 'lucide-react';
import { formatToEventDateTime, parseEventDateTime } from '../utils/dateFormatter';

interface DateTimePickerInputProps {
  value: string; // formato por extenso ou ISO
  onChange: (formattedValue: string) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
}

export const DateTimePickerInput: React.FC<DateTimePickerInputProps> = ({
  value,
  onChange,
  disabled = false,
  required = true,
  label = 'Data e Horário do Evento *',
}) => {
  const parsed = parseEventDateTime(value);
  const [date, setDate] = useState<string>(parsed.date);
  const [time, setTime] = useState<string>(parsed.time || '19:00');

  // Atualiza se a prop value mudar externamente
  useEffect(() => {
    const p = parseEventDateTime(value);
    if (p.date && p.date !== date) setDate(p.date);
    if (p.time && p.time !== time) setTime(p.time);
  }, [value]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const formatted = formatToEventDateTime(newDate, time);
    onChange(formatted);
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    const formatted = formatToEventDateTime(date, newTime);
    onChange(formatted);
  };

  const formattedPreview = formatToEventDateTime(date, time);

  // Atalhos rápidos
  const handleSetQuickDate = (daysFromToday: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const isoDate = `${y}-${m}-${day}`;
    handleDateChange(isoDate);
  };

  return (
    <div className="space-y-1.5">
      <label className="block font-semibold text-slate-700 text-xs">
        {label}
      </label>

      {/* Grid com Date Picker e Time Picker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Date Picker */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <CalendarIcon className="w-4 h-4 text-[#1C4E80]" />
          </div>
          <input
            type="date"
            required={required}
            disabled={disabled}
            value={date}
            onChange={e => handleDateChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] focus:ring-1 focus:ring-[#1C4E80] outline-none bg-white disabled:bg-slate-50 font-medium text-slate-800"
          />
        </div>

        {/* Time Picker */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <Clock className="w-4 h-4 text-[#1C4E80]" />
          </div>
          <input
            type="time"
            required={required}
            disabled={disabled}
            value={time}
            onChange={e => handleTimeChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded focus:border-[#1C4E80] focus:ring-1 focus:ring-[#1C4E80] outline-none bg-white disabled:bg-slate-50 font-medium text-slate-800"
          />
        </div>
      </div>

      {/* Atalhos Rápidos e Visualização Cerimonial */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[11px]">
        {/* Previsão Formatada */}
        {formattedPreview && (
          <div className="flex items-center gap-1.5 text-slate-600 bg-sky-50/80 border border-sky-200/60 px-2.5 py-1 rounded">
            <span className="font-semibold text-[#0B2A4A]">Formato Cerimonial:</span>
            <span className="font-medium text-[#1C4E80]">{formattedPreview}</span>
          </div>
        )}

        {/* Botões de Atalho */}
        {!disabled && (
          <div className="flex items-center gap-1 text-[10px] text-slate-500 ml-auto">
            <button
              type="button"
              onClick={() => handleSetQuickDate(0)}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => handleSetQuickDate(1)}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Amanhã
            </button>
            <button
              type="button"
              onClick={() => handleSetQuickDate(7)}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              +7 dias
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
