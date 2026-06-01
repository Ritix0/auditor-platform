"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, ReferenceLine
} from "recharts";
import { TrendUp, CalendarCheck, Clock, Warning, X, ShieldCheck, Sparkle, Hourglass } from "@phosphor-icons/react";

interface CaseItem {
  name: string;
  site: string;
  count: number;
  spent: number;
  won: number;
  rtp: number;
}

interface LogEntry {
  id: number;
  created_at: string;
  site: string;
  type: string;
  item_name: string;
  spent: number;
  won: number;
  rtp: number;
  user_id: string | null;
}

interface ParsedLog extends LogEntry {
  epoch: number;
}

interface StatsData {
  weeklyStats: { day: string; rtp: number }[];
  cyclicalStats: { name: string; rtp: number; info: string }[];
  hourlyStats: { hour: string; rtp: number }[];
  intervalStats: { interval: string; rtp: number | null }[];
  todayStats: { hour: string; rtp: number | null; rtpCase: number | null; rtpUpgrade: number | null }[];
}

interface CaseModalProps {
  selectedCase: CaseItem | null;
  onClose: () => void;
}

const modalTabs = [
  { id: "today", label: "Сегодня (Часы)", icon: Sparkle },
  { id: "intervals", label: "Сегодня (30м)", icon: Hourglass },
  { id: "weekly", label: "Неделя", icon: TrendUp },
  { id: "dayOfWeek", label: "По дням", icon: CalendarCheck },
  { id: "hourly", label: "По часам (Все время)", icon: Clock }
] as const;

const tooltipStyle = {
  background: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
  fontSize: "11px",
  fontFamily: "var(--font-geist-mono)",
  color: "#f4f4f5"
};

const labelStyle = {
  color: "#a1a1aa",
  fontWeight: "bold",
  marginBottom: "4px"
};

const itemStyle = {
  color: "#ffffff"
};

export default function CaseModal({ selectedCase, onClose }: CaseModalProps) {
  const [activeModalTab, setActiveModalTab] = useState<"today" | "intervals" | "weekly" | "dayOfWeek" | "hourly">("today");
  const [caseModalData, setCaseModalData] = useState<StatsData | null>(null);
  const [loadingModal, setLoadingModal] = useState(true);

  // КРИТИЧЕСКИЙ ЗАЩИТНЫЙ БАРЬЕР: Предотвращает краш во время анимации выхода AnimatePresence
  if (!selectedCase) return null;

  // Канонический парсер даты БД в числовой таймстамп МСК (UTC+3) с ручным разбором на случай сбоев
  const parseDbDateToEpoch = (createdAt: string) => {
    if (!createdAt) return Date.now();
    const cleanStr = createdAt.replace(" ", "T");
    let localDate = new Date(cleanStr);
    
    // Ручной разбор в случае NaN (например, на Safari)
    if (isNaN(localDate.getTime())) {
      const parts = createdAt.split(/[- :.T]/);
      if (parts.length >= 6) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const hour = parseInt(parts[3], 10);
        const minute = parseInt(parts[4], 10);
        const second = parseInt(parts[5], 10);
        localDate = new Date(year, month, day, hour, minute, second);
      }
    }
    
    const browserOffsetMin = new Date().getTimezoneOffset(); // -180 для МСК
    const mskOffsetMin = -180; // МСК в БД всегда -180 минут относительно UTC
    
    const diffMin = browserOffsetMin - mskOffsetMin;
    return localDate.getTime() - (diffMin * 60 * 1000);
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    let active = true;
    const fetchCaseDetails = async () => {
      setLoadingModal(true);
      try {
        const res = await fetch(`/api/analytics?case=${encodeURIComponent(selectedCase.name)}&site=${selectedCase.site}&type=case`);
        if (res.ok && active) {
          const json = await res.json();
          const rawLogs: LogEntry[] = json.rawLogs || [];

          // ВЫЧИСЛЕНИЯ НА СТОРОНЕ КЛИЕНТА (Для модального окна конкретного кейса)

          // 1. СЕГОДНЯ
          const getTodayStats = () => {
            if (rawLogs.length === 0) return [];
            
            // Фильтруем битые даты (исключаем NaN)
            const parsed: ParsedLog[] = rawLogs
              .map((l: LogEntry) => ({ 
                ...l, 
                epoch: parseDbDateToEpoch(l.created_at) 
              }))
              .filter((l: ParsedLog) => !isNaN(l.epoch));

            if (parsed.length === 0) return [];

            const maxEpoch = Math.max(...parsed.map((l: ParsedLog) => l.epoch));
            const targetDate = new Date(maxEpoch);
            
            const tYear = targetDate.getFullYear();
            const tMonth = targetDate.getMonth();
            const tDay = targetDate.getDate();

            const dayLogs = parsed.filter((l: ParsedLog) => {
              const d = new Date(l.epoch);
              return d.getFullYear() === tYear && d.getMonth() === tMonth && d.getDate() === tDay;
            });

            const hourlyMap: Record<string, { spentAll: number; wonAll: number; spentCase: number; wonCase: number; spentUpgrade: number; wonUpgrade: number }> = {};
            for (let i = 0; i < 24; i++) {
              const label = `${String(i).padStart(2, "0")}:00`;
              hourlyMap[label] = { spentAll: 0, wonAll: 0, spentCase: 0, wonCase: 0, spentUpgrade: 0, wonUpgrade: 0 };
            }

            dayLogs.forEach((log: ParsedLog) => {
              const d = new Date(log.epoch);
              const hourLabel = `${String(d.getHours()).padStart(2, "0")}:00`;
              if (hourlyMap[hourLabel]) {
                const spent = Number(log.spent);
                const won = Number(log.won);
                hourlyMap[hourLabel].spentAll += spent;
                hourlyMap[hourLabel].wonAll += won;
                hourlyMap[hourLabel].spentCase += spent;
                hourlyMap[hourLabel].wonCase += won;
              }
            });

            return Object.entries(hourlyMap).map(([hourLabel, data]) => {
              const hourNum = parseInt(hourLabel.split(":")[0], 10);
              const isFuture = tYear === new Date().getFullYear() && 
                               tMonth === new Date().getMonth() && 
                               tDay === new Date().getDate() && 
                               hourNum > new Date().getHours();

              return {
                hour: hourLabel,
                rtp: isFuture ? null : (data.spentAll > 0 ? Math.round((data.wonAll / data.spentAll) * 100) : 0),
                rtpCase: isFuture ? null : (data.spentCase > 0 ? Math.round((data.wonCase / data.spentCase) * 100) : 0),
                rtpUpgrade: isFuture ? null : 0
              };
            });
          };

          // 2. ИНТЕРВАЛЫ ПО 30 МИНУТ
          const getIntervalStats = () => {
            if (rawLogs.length === 0) return [];
            
            const parsed: ParsedLog[] = rawLogs
              .map((l: LogEntry) => ({ 
                ...l, 
                epoch: parseDbDateToEpoch(l.created_at) 
              }))
              .filter((l: ParsedLog) => !isNaN(l.epoch));

            if (parsed.length === 0) return [];

            const maxEpoch = Math.max(...parsed.map((l: ParsedLog) => l.epoch));
            const targetDate = new Date(maxEpoch);
            
            const tYear = targetDate.getFullYear();
            const tMonth = targetDate.getMonth();
            const tDay = targetDate.getDate();

            const dayLogs = parsed.filter((l: ParsedLog) => {
              const d = new Date(l.epoch);
              return d.getFullYear() === tYear && d.getMonth() === tMonth && d.getDate() === tDay;
            });

            const intervalMap: Record<string, { spent: number; won: number }> = {};
            const intervalList: string[] = [];
            
            for (let hour = 0; hour < 24; hour++) {
              for (const min of [0, 30]) {
                const label = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
                intervalMap[label] = { spent: 0, won: 0 };
                intervalList.push(label);
              }
            }

            dayLogs.forEach((log: ParsedLog) => {
              const d = new Date(log.epoch);
              const minGroup = d.getMinutes() < 30 ? "00" : "30";
              const label = `${String(d.getHours()).padStart(2, "0")}:${minGroup}`;
              if (intervalMap[label]) {
                intervalMap[label].spent += Number(log.spent);
                intervalMap[label].won += Number(log.won);
              }
            });

            return intervalList.map(label => {
              const [hourStr, minStr] = label.split(":");
              const hourNum = parseInt(hourStr, 10);
              const minNum = parseInt(minStr, 10);
              
              const isFuture = tYear === new Date().getFullYear() && 
                               tMonth === new Date().getMonth() && 
                               tDay === new Date().getDate() && 
                               (hourNum > new Date().getHours() || (hourNum === new Date().getHours() && minNum > new Date().getMinutes()));

              const data = intervalMap[label];
              return {
                interval: label,
                rtp: isFuture ? null : (data.spent > 0 ? Math.round((data.won / data.spent) * 100) : 0)
              };
            });
          };

          // 3. НЕДЕЛЯ
          const getWeeklyStats = () => {
            if (rawLogs.length === 0) return [];
            const parsed: ParsedLog[] = rawLogs
              .map((l: LogEntry) => ({ 
                ...l, 
                epoch: parseDbDateToEpoch(l.created_at) 
              }))
              .filter((l: ParsedLog) => !isNaN(l.epoch));

            if (parsed.length === 0) return [];

            const maxEpoch = Math.max(...parsed.map((l: ParsedLog) => l.epoch));
            const latestDate = new Date(maxEpoch);

            const daysMap = new Map<string, { spent: number; won: number }>();
            const daysList: string[] = [];

            for (let i = 6; i >= 0; i--) {
              const d = new Date(latestDate.getTime() - i * 24 * 60 * 60 * 1000);
              const label = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
              daysList.push(label);
              daysMap.set(label, { spent: 0, won: 0 });
            }

            parsed.forEach((log: ParsedLog) => {
              const d = new Date(log.epoch);
              const label = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
              if (daysMap.has(label)) {
                const current = daysMap.get(label)!;
                current.spent += Number(log.spent);
                current.won += Number(log.won);
              }
            });

            return daysList.map(label => {
              const data = daysMap.get(label)!;
              return {
                day: label,
                rtp: data.spent > 0 ? Math.round((data.won / data.spent) * 100) : 0
              };
            });
          };

          // 4. ПО ДНЯМ НЕДЕЛИ
          const getCyclicalStats = () => {
            const weekdayMap: Record<number, { spent: number; won: number }> = {
              1: { spent: 0, won: 0 },
              2: { spent: 0, won: 0 },
              3: { spent: 0, won: 0 },
              4: { spent: 0, won: 0 },
              5: { spent: 0, won: 0 },
              6: { spent: 0, won: 0 },
              0: { spent: 0, won: 0 }
            };

            rawLogs.forEach((log: LogEntry) => {
              const d = new Date(parseDbDateToEpoch(log.created_at));
              const day = d.getDay();
              if (weekdayMap[day] !== undefined) {
                weekdayMap[day].spent += Number(log.spent);
                weekdayMap[day].won += Number(log.won);
              }
            });

            const weekdayNames = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
            return [1, 2, 3, 4, 5, 6, 0].map(dayNum => {
              const data = weekdayMap[dayNum];
              const rtp = data.spent > 0 ? Math.round((data.won / data.spent) * 100) : 0;
              let info = "Норма";
              if (dayNum === 5 || dayNum === 6 || dayNum === 0) info = "Снижение RTP";
              if (rtp < 25) info = "Низкая окупаемость";
              return { name: weekdayNames[dayNum], rtp, info };
            });
          };

          // 5. ПО ЧАСАМ (Все время)
          const getHourlyStats = () => {
            const hourlyMap: Record<string, { spent: number; won: number }> = {};
            for (let i = 0; i < 24; i++) {
              const label = `${String(i).padStart(2, "0")}:00`;
              hourlyMap[label] = { spent: 0, won: 0 };
            }

            rawLogs.forEach((log: LogEntry) => {
              const d = new Date(parseDbDateToEpoch(log.created_at));
              const hourLabel = `${String(d.getHours()).padStart(2, "0")}:00`;
              if (hourlyMap[hourLabel]) {
                hourlyMap[hourLabel].spent += Number(log.spent);
                hourlyMap[hourLabel].won += Number(log.won);
              }
            });

            return Object.entries(hourlyMap).map(([hourLabel, data]) => ({
              hour: hourLabel,
              rtp: data.spent > 0 ? Math.round((data.won / data.spent) * 100) : 0
            }));
          };

          setCaseModalData({
            todayStats: getTodayStats(),
            intervalStats: getIntervalStats(),
            weeklyStats: getWeeklyStats(),
            cyclicalStats: getCyclicalStats(),
            hourlyStats: getHourlyStats()
          });
        }
      } catch (err) {
        console.error("Ошибка загрузки данных по кейсу:", err);
      } finally {
        if (active) setLoadingModal(false);
      }
    };
    fetchCaseDetails();
    return () => {
      active = false;
    };
  }, [selectedCase]);

  const generateAnalysis = (caseItem: CaseItem, stats: StatsData) => {
    const rtp = caseItem.rtp;
    let expectationText = "";
    let riskLevel = "критический";
    let riskColor = "text-rose-400";
    
    if (rtp >= 100) {
      expectationText = "демонстрирует положительное математическое ожидание. Операция является прибыльной на текущий момент.";
      riskLevel = "низкий (доходная фаза)";
      riskColor = "text-emerald-400";
    } else if (rtp >= 70) {
      expectationText = "имеет умеренную окупаемость, находящуюся в пределах стандартной статистической погрешности.";
      riskLevel = "умеренный";
      riskColor = "text-amber-400";
    } else {
      expectationText = "демонстрирует крайне низкую окупаемость. Каждая операция приносит убыток на дистанции.";
      riskLevel = "высокий (критический уровень потерь)";
      riskColor = "text-rose-400";
    }

    const mon = stats.cyclicalStats.find(d => d.name === "ПН")?.rtp || 0;
    const tue = stats.cyclicalStats.find(d => d.name === "ВТ")?.rtp || 0;
    const wed = stats.cyclicalStats.find(d => d.name === "СР")?.rtp || 0;
    const thu = stats.cyclicalStats.find(d => d.name === "ЧТ")?.rtp || 0;
    const sat = stats.cyclicalStats.find(d => d.name === "СБ")?.rtp || 0;
    const sun = stats.cyclicalStats.find(d => d.name === "ВС")?.rtp || 0;

    const weekdayAvg = (mon + tue + wed + thu) / 4;
    const weekendAvg = (sat + sun) / 2;
    const diff = Math.round(weekdayAvg - weekendAvg);

    let weekendVerdict = "Распределение окупаемости по дням недели стабильно, аномалий не обнаружено.";
    if (diff > 5) {
      weekendVerdict = `Зафиксировано снижение отдачи в выходные дни (СБ-ВС): RTP падает в среднем на ${diff}% по сравнению с буднями.`;
    } else if (diff < -5) {
      weekendVerdict = `В выходные дни зафиксировано повышение RTP в среднем на ${Math.abs(diff)}% по сравнению с буднями.`;
    }

    const nightAvg = (stats.hourlyStats.slice(0, 4).reduce((acc, curr) => acc + curr.rtp, 0)) / 4;
    const dayAvg = (stats.hourlyStats.slice(6, 12).reduce((acc, curr) => acc + curr.rtp, 0)) / 6;
    const hourDiff = Math.round(nightAvg - dayAvg);
    
    let hourlyVerdict = "Почасовые параметры алгоритма стабильны в течение суток.";
    if (hourDiff > 5) {
      hourlyVerdict = `Зафиксирован ночной подъем окупаемости: с 00:00 до 06:00 RTP в среднем на ${hourDiff}% выше, чем в дневные часы.`;
    } else if (hourDiff < -5) {
      weekendVerdict = `В дневное время RTP в среднем на ${Math.abs(hourDiff)}% выше, чем в ночные часы.`;
    }

    return {
      expectationText,
      riskLevel,
      riskColor,
      weekendVerdict,
      hourlyVerdict
    };
  };

  const analysis = caseModalData ? generateAnalysis(selectedCase, caseModalData) : null;

  return (
    <div 
      className="fixed inset-0 w-full h-full min-h-dvh bg-zinc-950/98 overflow-y-auto p-8 md:p-12 flex flex-col gap-8"
      style={{ zIndex: 999999 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
        className="w-full max-w-325 mx-auto flex flex-col gap-8 h-full relative"
      >
        
        {/* Кнопка закрытия модалки */}
        <button 
          onClick={onClose}
          className="absolute top-0 right-0 text-zinc-400 hover:text-white transition-colors p-2 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ХЕДЕР ПОЛНОЭКРАННОЙ ПАНЕЛИ */}
        <div className="border-b border-zinc-850 pb-6 flex flex-col gap-1 pr-14 mt-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-0.5 rounded font-bold uppercase tracking-wider">
              ГЛУБОКИЙ МАТЕМАТИЧЕСКИЙ АУДИТ КЕЙСА
            </span>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">
              {selectedCase.site}
            </span>
          </div>
          <h4 className="text-3xl font-black text-white tracking-tight uppercase mt-2">
            Кейс: «{selectedCase.name}»
          </h4>
        </div>

        {/* ИНДИКАТОР ЗАГРУЗКИ */}
        {loadingModal || !caseModalData || !analysis ? (
          <div className="flex-1 h-96 flex flex-col items-center justify-center gap-4 font-mono text-xs text-zinc-500">
            <div className="w-8 h-8 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
            <span>Выполнение сложных математических группировок на сервере...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-stretch">
            
            {/* ЛЕВАЯ ЧАСТЬ */}
            <div className="lg:col-span-4 flex flex-col gap-6 justify-between">
              
              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Общие объемы по базе</span>
                
                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-2xl flex flex-col gap-1">
                    <span className="text-[9px] text-zinc-500 uppercase">Всего открытий:</span>
                    <span className="text-lg font-bold text-zinc-200">{selectedCase.count}</span>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-2xl flex flex-col gap-1">
                    <span className="text-[9px] text-zinc-500 uppercase">Траты игроков:</span>
                    <span className="text-lg font-bold text-zinc-200">{selectedCase.spent.toFixed(1)} ₽</span>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-2xl flex flex-col gap-1">
                    <span className="text-[9px] text-zinc-500 uppercase">Выплачено дропом:</span>
                    <span className="text-lg font-bold text-zinc-200">{selectedCase.won.toFixed(1)} ₽</span>
                  </div>
                  <div className="bg-rose-950/20 border border-rose-900/40 p-4 rounded-2xl flex flex-col gap-1">
                    <span className="text-[9px] text-rose-400 uppercase">Взвешенный RTP:</span>
                    <span className="text-lg font-bold text-rose-500">{selectedCase.rtp}%</span>
                  </div>
                </div>
              </div>

              {/* МАТЕМАТИЧЕСКИЙ ВЕРДИКТ */}
              <div className="bg-rose-950/10 border border-rose-900/30 p-5 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Warning className="w-5.5 h-5.5 text-rose-500 shrink-0" />
                  <span className="font-bold text-white uppercase font-mono text-xs">МАТЕМАТИЧЕСКИЙ ВЕРДИКТ:</span>
                </div>
                <div className="text-xs leading-relaxed flex flex-col gap-2">
                  <p className="text-zinc-300">
                    Анализ кейса «{selectedCase.name}» {analysis.expectationText}
                  </p>
                  <p className="text-zinc-300">
                    <strong className="text-zinc-200">Дневные колебания:</strong> {analysis.weekendVerdict}
                  </p>
                  <p className="text-zinc-300">
                    <strong className="text-zinc-200">Суточные колебания:</strong> {analysis.hourlyVerdict}
                  </p>
                  <p className="text-zinc-300 mt-1">
                    Уровень математического риска: <span className={`font-bold font-mono ${analysis.riskColor}`}>{analysis.riskLevel}</span>.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 border-t border-zinc-850 pt-4">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Логи верифицированы</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkle className="w-3.5 h-3.5 text-amber-500" />
                  <span>CASEAUDIT ENGINE PRO</span>
                </div>
              </div>

            </div>

            {/* ПРАВАЯ ЧАСТЬ С ВНЕШНИМИ ВКЛАДКАМИ СРЕЗОВ */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* НАВИГАТОР ПОДДЕРЖИВАЕМЫХ ШКАЛ В МОДАЛКЕ */}
              <div className="overflow-x-auto scrollbar-none w-full bg-zinc-900/50 border border-zinc-800 p-1.5 rounded-xl" style={{ scrollbarWidth: "none" }}>
                <div className="flex gap-2 min-w-max w-full">
                  {modalTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeModalTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveModalTab(tab.id)}
                        className="relative flex-1 py-2 px-4 rounded-lg text-xs font-mono flex items-center justify-center gap-2 cursor-pointer z-10 transition-colors"
                        style={{ color: isActive ? "#ffffff" : "#a1a1aa" }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-modal-chart-tab"
                            className="absolute inset-0 bg-zinc-800 border border-zinc-750 rounded-lg -z-10"
                            transition={{ type: "spring", stiffness: 180, damping: 18 }}
                          />
                        )}
                        <Icon className="w-4.5 h-4.5 shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ПАНЕЛЬ АКТИВНОГО ГРАФИКА */}
              <div className="flex-1 border border-zinc-850 p-6 rounded-2xl bg-zinc-900/20 h-[380px] flex flex-col gap-3">
                <div className="w-full h-full relative">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    {activeModalTab === "today" ? (
                      <AreaChart data={caseModalData.todayStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="modalTodayCase" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="hour" stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} />
                        <YAxis stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} unit="%" />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelStyle={labelStyle}
                          itemStyle={itemStyle}
                          formatter={(value: unknown) => [`${value}%`, "RTP отдачи кейса"]}
                        />
                        <Area type="monotone" connectNulls dataKey="rtpCase" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#modalTodayCase)" name="rtpCase" />
                        <ReferenceLine y={45} stroke="#3f3f46" strokeDasharray="3 3" />
                      </AreaChart>
                    ) : activeModalTab === "intervals" ? (
                      <AreaChart data={caseModalData.intervalStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="modalInterval" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="interval" stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} />
                        <YAxis stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} unit="%" />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelStyle={labelStyle}
                          itemStyle={itemStyle}
                          formatter={(value: unknown) => [`${value}%`, "RTP в этот интервал"]}
                        />
                        <Area type="monotone" connectNulls dataKey="rtp" stroke="#60a5fa" strokeWidth={1.5} fillOpacity={1} fill="url(#modalInterval)" />
                        <ReferenceLine y={45} stroke="#10b981" strokeDasharray="3 3" />
                      </AreaChart>
                    ) : activeModalTab === "weekly" ? (
                      <AreaChart data={caseModalData.weeklyStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="modalColorRtp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} />
                        <YAxis stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} unit="%" />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelStyle={labelStyle}
                          itemStyle={itemStyle}
                          formatter={(value: unknown) => [`${value}%`, "RTP"]}
                        />
                        <Area type="monotone" dataKey="rtp" stroke="#f43f5e" strokeWidth={1.5} fillOpacity={1} fill="url(#modalColorRtp)" />
                        <ReferenceLine y={45} stroke="#10b981" strokeDasharray="3 3" />
                      </AreaChart>
                    ) : activeModalTab === "dayOfWeek" ? (
                      <BarChart data={caseModalData.cyclicalStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} />
                        <YAxis stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} unit="%" />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelStyle={labelStyle}
                          itemStyle={itemStyle}
                          formatter={(value: unknown, _name: unknown, props: unknown) => {
                            const payloadEntry = props as { payload?: { info?: string } } | undefined;
                            return [`${value}%`, payloadEntry?.payload?.info || ""];
                          }}
                        />
                        <Bar dataKey="rtp" radius={[3, 3, 0, 0]}>
                          {caseModalData.cyclicalStats.map((entry, index) => {
                            const isRigged = entry.rtp < 25;
                            return <Cell key={`cell-modal-${index}`} fill={isRigged ? "#f43f5e" : "#52525b"} />;
                          })}
                        </Bar>
                        <ReferenceLine y={45} stroke="#10b981" strokeDasharray="3 3" />
                      </BarChart>
                    ) : (
                      <AreaChart data={caseModalData.hourlyStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorHourlyModal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="hour" stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} />
                        <YAxis stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} unit="%" />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelStyle={labelStyle}
                          itemStyle={itemStyle}
                          formatter={(value: unknown) => [`${value}%`, "RTP"]}
                        />
                        <Area type="step" dataKey="rtp" stroke="#ef4444" strokeWidth={1.2} fillOpacity={1} fill="url(#colorHourlyModal)" />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        )}

      </motion.div>
    </div>
  );
}