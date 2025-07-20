import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import '../index.css';

// Utility functions
const formatDate = (date) => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const isSameDay = (date1, date2) => {
  return date1.toDateString() === date2.toDateString();
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addWeeks = (date, weeks) => {
  return addDays(date, weeks * 7);
};

const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const addYears = (date, years) => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

const getWeekdayName = (dayIndex) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex];
};

const getOrdinal = (n) => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
};

// Date calculation engine
const calculateRecurringDates = (config) => {
  const { startDate, endDate, recurrenceType, interval, selectedDays, monthlyPattern, weekOfMonth } = config;
  
  if (!startDate) return [];
  
  const dates = [];
  const maxDates = 100; // Limit to prevent infinite loops
  let currentDate = new Date(startDate);
  const finalEndDate = endDate || addYears(startDate, 2);
  
  while (dates.length < maxDates && currentDate <= finalEndDate) {
    let shouldInclude = false;
    
    switch (recurrenceType) {
      case 'daily':
        shouldInclude = true;
        break;
        
      case 'weekly':
        if (selectedDays.length > 0) {
          shouldInclude = selectedDays.includes(currentDate.getDay());
        } else {
          shouldInclude = currentDate.getDay() === startDate.getDay();
        }
        break;
        
      case 'monthly':
        if (monthlyPattern === 'date') {
          shouldInclude = currentDate.getDate() === startDate.getDate();
        } else if (monthlyPattern === 'weekday' && weekOfMonth) {
          const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const firstWeekdayOfMonth = new Date(firstDayOfMonth);
          
          while (firstWeekdayOfMonth.getDay() !== startDate.getDay()) {
            firstWeekdayOfMonth.setDate(firstWeekdayOfMonth.getDate() + 1);
          }
          
          const targetDate = addWeeks(firstWeekdayOfMonth, weekOfMonth - 1);
          shouldInclude = isSameDay(currentDate, targetDate) && 
                         currentDate.getMonth() === targetDate.getMonth();
        }
        break;
        
      case 'yearly':
        shouldInclude = currentDate.getMonth() === startDate.getMonth() && 
                       currentDate.getDate() === startDate.getDate();
        break;
    }
    
    if (shouldInclude && currentDate >= startDate) {
      dates.push(new Date(currentDate));
    }
    
    // Move to next occurrence
    switch (recurrenceType) {
      case 'daily':
        currentDate = addDays(currentDate, interval);
        break;
      case 'weekly':
        if (selectedDays.length > 0) {
          // Find next selected day
          let nextDay = currentDate.getDay() + 1;
          let daysToAdd = 1;
          
          while (daysToAdd <= 7) {
            if (selectedDays.includes(nextDay % 7)) {
              currentDate = addDays(currentDate, daysToAdd);
              break;
            }
            nextDay++;
            daysToAdd++;
          }
          
          if (daysToAdd > 7) {
            currentDate = addWeeks(currentDate, interval);
          }
        } else {
          currentDate = addWeeks(currentDate, interval);
        }
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, interval);
        break;
      case 'yearly':
        currentDate = addYears(currentDate, interval);
        break;
    }
  }
  
  return dates;
};

// Components
const DateInput = ({ label, value, onChange, placeholder }) => (
  <div className="flex flex-col space-y-3">
    <label className="text-sm font-semibold text-gray-800">{label}</label>
    <input
      type="date"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
    />
  </div>
);

const WeekdaySelector = ({ selectedDays, onChange }) => {
  const weekdays = [
    { index: 0, name: 'Sun', fullName: 'Sunday' },
    { index: 1, name: 'Mon', fullName: 'Monday' },
    { index: 2, name: 'Tue', fullName: 'Tuesday' },
    { index: 3, name: 'Wed', fullName: 'Wednesday' },
    { index: 4, name: 'Thu', fullName: 'Thursday' },
    { index: 5, name: 'Fri', fullName: 'Friday' },
    { index: 6, name: 'Sat', fullName: 'Saturday' }
  ];

  const toggleDay = (dayIndex) => {
    const newSelectedDays = selectedDays.includes(dayIndex)
      ? selectedDays.filter(day => day !== dayIndex)
      : [...selectedDays, dayIndex].sort();
    onChange(newSelectedDays);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {weekdays.map(day => (
        <button
          key={day.index}
          onClick={() => toggleDay(day.index)}
          className={`px-3 py-2 text-sm rounded-md transition-colors ${
            selectedDays.includes(day.index)
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={day.fullName}
        >
          {day.name}
        </button>
      ))}
    </div>
  );
};

const RecurrenceOptions = ({ 
  recurrenceType, 
  interval, 
  selectedDays, 
  monthlyPattern, 
  weekOfMonth,
  startDate,
  onRecurrenceChange, 
  onIntervalChange, 
  onSelectedDaysChange,
  onMonthlyPatternChange,
  onWeekOfMonthChange
}) => {
  const startDayName = startDate ? getWeekdayName(startDate.getDay()) : '';
  const weekNumber = startDate ? Math.ceil(startDate.getDate() / 7) : 1;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Repeat</label>
        <select
          value={recurrenceType}
          onChange={(e) => onRecurrenceChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Every {interval} {recurrenceType === 'daily' ? 'day(s)' : 
                   recurrenceType === 'weekly' ? 'week(s)' : 
                   recurrenceType === 'monthly' ? 'month(s)' : 'year(s)'}
        </label>
        <input
          type="number"
          min="1"
          max="100"
          value={interval}
          onChange={(e) => onIntervalChange(parseInt(e.target.value) || 1)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
 

      {recurrenceType === 'weekly' && (
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">On these days</label>
          <WeekdaySelector 
            selectedDays={selectedDays} 
            onChange={onSelectedDaysChange} 
          />
        </div>
      )}

      {recurrenceType === 'monthly' && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Monthly pattern</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="monthlyPattern"
                value="date"
                checked={monthlyPattern === 'date'}
                onChange={(e) => onMonthlyPatternChange(e.target.value)}
                className="text-blue-500"
              />
              <span className="text-sm">On day {startDate ? startDate.getDate() : ''} of the month</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="monthlyPattern"
                value="weekday"
                checked={monthlyPattern === 'weekday'}
                onChange={(e) => onMonthlyPatternChange(e.target.value)}
                className="text-blue-500"
              />
              <span className="text-sm">
                On the {getOrdinal(weekNumber)} {startDayName} of the month
              </span>
            </label>
          </div>
          
          {monthlyPattern === 'weekday' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Week of month</label>
              <select
                value={weekOfMonth}
                onChange={(e) => onWeekOfMonthChange(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>First</option>
                <option value={2}>Second</option>
                <option value={3}>Third</option>
                <option value={4}>Fourth</option>
                <option value={5}>Last</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MiniCalendar = ({ recurringDates, currentMonth, onMonthChange }) => {
  const today = new Date();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startingDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const calendarDays = [];
  
  // Previous month's trailing days
  for (let i = 0; i < startingDayOfWeek; i++) {
    const prevDay = new Date(firstDay);
    prevDay.setDate(prevDay.getDate() - (startingDayOfWeek - i));
    calendarDays.push({ date: prevDay, isCurrentMonth: false });
  }
  
  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    calendarDays.push({ date, isCurrentMonth: true });
  }
  
  // Next month's leading days to fill the grid
  const totalCells = 42; // 6 rows × 7 days
  const remainingCells = totalCells - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextDay = new Date(lastDay);
    nextDay.setDate(nextDay.getDate() + i);
    calendarDays.push({ date: nextDay, isCurrentMonth: false });
  }

  const isRecurringDate = (date) => {
    return recurringDates.some(recurringDate => isSameDay(date, recurringDate));
  };

  const goToPrevMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    onMonthChange(prevMonth);
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    onMonthChange(nextMonth);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="font-semibold text-gray-800">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={goToNextMonth}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const isToday = isSameDay(day.date, today);
          const isRecurring = isRecurringDate(day.date);
          
          return (
            <div
              key={index}
              className={`
                p-2 text-center text-sm rounded transition-colors
                ${!day.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                ${isToday ? 'bg-blue-100 text-blue-700 font-semibold' : ''}
                ${isRecurring ? 'bg-green-500 text-white font-semibold' : ''}
                ${isRecurring && isToday ? 'bg-green-600 text-white' : ''}
              `}
            >
              {day.date.getDate()}
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600">Recurring dates</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
          <span className="text-gray-600">Today</span>
        </div>
      </div>
    </div>
  );
};

const DatePreview = ({ recurringDates }) => {
  if (recurringDates.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
        No recurring dates configured
      </div>
    );
  }

  const displayDates = recurringDates.slice(0, 5);
  const hasMore = recurringDates.length > 5;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="font-medium text-blue-800 mb-3 flex items-center">
        <Clock className="h-4 w-4 mr-2" />
        Upcoming Dates ({recurringDates.length} total)
      </h4>
      <div className="space-y-2">
        {displayDates.map((date, index) => (
          <div key={index} className="text-sm text-blue-700 bg-white px-3 py-2 rounded">
            {formatDate(date)}
          </div>
        ))}
        {hasMore && (
          <div className="text-sm text-blue-600 text-center py-2">
            ... and {recurringDates.length - 5} more
          </div>
        )}
      </div>
    </div>
  );
};

// Main Component
const RecurringDatePicker  = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [recurrenceType, setRecurrenceType] = useState('weekly');
  const [interval, setInterval] = useState(1);
  const [selectedDays, setSelectedDays] = useState([]);
  const [monthlyPattern, setMonthlyPattern] = useState('date');
  const [weekOfMonth, setWeekOfMonth] = useState(1);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  const recurringDates = useMemo(() => {
    if (!startDate) return [];
    
    return calculateRecurringDates({
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      recurrenceType,
      interval,
      selectedDays,
      monthlyPattern,
      weekOfMonth
    });
  }, [startDate, endDate, recurrenceType, interval, selectedDays, monthlyPattern, weekOfMonth]);

  // Auto-set week of month when start date changes
  useEffect(() => {
    if (startDate && recurrenceType === 'monthly' && monthlyPattern === 'weekday') {
      const date = new Date(startDate);
      const weekNum = Math.ceil(date.getDate() / 7);
      setWeekOfMonth(weekNum);
    }
  }, [startDate, recurrenceType, monthlyPattern]);

  const getSummaryText = () => {
    if (!startDate) return 'Select recurring dates';
    
    const start = formatDate(new Date(startDate));
    let pattern = '';
    
    switch (recurrenceType) {
      case 'daily':
        pattern = interval === 1 ? 'Daily' : `Every ${interval} days`;
        break;
      case 'weekly':
        if (selectedDays.length > 0) {
          const dayNames = selectedDays.map(day => getWeekdayName(day)).join(', ');
          pattern = `Weekly on ${dayNames}`;
        } else {
          pattern = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
        }
        break;
      case 'monthly':
        if (monthlyPattern === 'date') {
          pattern = interval === 1 ? 'Monthly' : `Every ${interval} months`;
        } else {
          const dayName = getWeekdayName(new Date(startDate).getDay());
          pattern = `${getOrdinal(weekOfMonth)} ${dayName} of every month`;
        }
        break;
      case 'yearly':
        pattern = interval === 1 ? 'Yearly' : `Every ${interval} years`;
        break;
    }
    
    return `${pattern} from ${start}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 bg-white min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Recurring Date Picker</h1>
        <p className="text-lg text-gray-600">Configure recurring dates with flexible patterns</p>
      </div>

      <div className="mb-8">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-6 py-4 bg-white border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-left">
              <div className="text-lg font-medium text-gray-900">{getSummaryText()}</div>
              {recurringDates.length > 0 && (
                <div className="text-sm text-gray-500">
                  Next: {formatDate(recurringDates[0])}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {recurringDates.length > 0 && (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                {recurringDates.length} dates
              </span>
            )}
            <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="border border-gray-200 rounded-xl p-6 lg:p-8 bg-white shadow-lg">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid sm:grid-cols-2 gap-6">
                <DateInput
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Select start date"
                />
                <DateInput
                  label="End Date (Optional)"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Select end date"
                />
              </div>

              <RecurrenceOptions
                recurrenceType={recurrenceType}
                interval={interval}
                selectedDays={selectedDays}
                monthlyPattern={monthlyPattern}
                weekOfMonth={weekOfMonth}
                startDate={startDate ? new Date(startDate) : null}
                onRecurrenceChange={setRecurrenceType}
                onIntervalChange={setInterval}
                onSelectedDaysChange={setSelectedDays}
                onMonthlyPatternChange={setMonthlyPattern}
                onWeekOfMonthChange={setWeekOfMonth}
              />

              <DatePreview recurringDates={recurringDates} />
            </div>

            <div className="lg:col-span-1">
              <MiniCalendar
                recurringDates={recurringDates}
                currentMonth={currentCalendarMonth}
                onMonthChange={setCurrentCalendarMonth}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setRecurrenceType('weekly');
                setInterval(1);
                setSelectedDays([]);
                setMonthlyPattern('date');
                setWeekOfMonth(1);
              }}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear All
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 sm:flex-initial px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 sm:flex-initial px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {!isOpen && recurringDates.length > 0 && (
        <div className="mt-6">
          <DatePreview recurringDates={recurringDates} />
        </div>
      )}
    </div>
  );
};

export default RecurringDatePicker ;
 