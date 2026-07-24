// src/components/Calendar/GestationalCalendar.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Consultation, Exam, GestationPlan } from '../../types';
import './GestationalCalendar.css';

interface GestationalCalendarProps {
  startDate: Date;
  plan: GestationPlan;
  consultations: Consultation[];
  exams: Exam[];
}

export default function GestationalCalendar({ startDate, plan, consultations, exams }: GestationalCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  
  // Pad the beginning of the month with empty days
  const startDateOffset = monthStart.getDay();
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const calendarDays = [];
  for (let i = 0; i < startDateOffset; i++) {
    calendarDays.push(null);
  }
  daysInMonth.forEach(day => calendarDays.push(day));

  const getEventsForDay = (day: Date) => {
    const events = [];
    
    // Consultations
    const dayConsults = consultations.filter(c => {
      const cDate = c.status === 'realizada' && c.actualDate ? c.actualDate : c.scheduledDate;
      if (!cDate) return false;
      return isSameDay(day, typeof cDate.toDate === 'function' ? cDate.toDate() : new Date(cDate));
    });
    if (dayConsults.length > 0) events.push({ type: 'consult', icon: '🩺', label: `${dayConsults.length} Consulta${dayConsults.length > 1 ? 's' : ''}` });

    // Exams
    const dayExams = exams.filter(e => {
      if (!e.scheduledDate) return false;
      return isSameDay(day, typeof e.scheduledDate.toDate === 'function' ? e.scheduledDate.toDate() : new Date(e.scheduledDate));
    });
    if (dayExams.length > 0) events.push({ type: 'exam', icon: '🧪', label: `${dayExams.length} Exame${dayExams.length > 1 ? 's' : ''}` });

    return events;
  };

  const getGestationMonthForDay = (day: Date) => {
    if (day < startDate) return null;
    const elapsed = (day.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const dpM = plan.totalDays / 9;
    const month = Math.floor(elapsed / dpM) + 1;
    return month <= 9 ? month : null;
  };

  return (
    <div className="gestational-calendar">
      <div className="calendar-header">
        <button className="btn-icon" onClick={prevMonth}>←</button>
        <h3 className="calendar-title">
          {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
        </h3>
        <button className="btn-icon" onClick={nextMonth}>→</button>
      </div>

      <div className="calendar-grid-header">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="calendar-day-name">{day}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {calendarDays.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="calendar-cell empty" />;

          const isToday = isSameDay(day, new Date());
          const events = getEventsForDay(day);
          const gestMonth = getGestationMonthForDay(day);

          const dayDate = day as Date;

          return (
            <motion.div 
              key={dayDate.toISOString()} 
              className={`calendar-cell ${isToday ? 'today' : ''} ${gestMonth ? 'in-gestation' : ''}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.01 }}
            >
              <div className="cell-top">
                <span className="cell-date">{format(day, 'd')}</span>
                {gestMonth && <span className="cell-gest-month">Mês {gestMonth}</span>}
              </div>
              
              <div className="cell-events">
                {events.map((ev, i) => (
                  <div key={i} className={`cell-event type-${ev.type}`}>
                    <span className="event-icon">{ev.icon}</span>
                    <span className="event-label">{ev.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="calendar-legend">
        <div className="legend-item"><span className="legend-color" style={{ background: 'var(--accent-pink)' }}></span> Hoje</div>
        <div className="legend-item"><span className="legend-color" style={{ background: 'rgba(201,81,144,0.1)' }}></span> Período Gestacional</div>
        <div className="legend-item"><span className="legend-color" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}></span> Consultas</div>
        <div className="legend-item"><span className="legend-color" style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}></span> Exames</div>
      </div>
    </div>
  );
}
