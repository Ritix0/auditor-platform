"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, ReferenceLine
} from "recharts";
import { TrendUp, CalendarCheck, Clock, Warning, Sparkle, CaretDown, CaretUp } from "@phosphor-icons/react";

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
  weeklyStats: { day: string; rtp: number; rtpCase: number | null; rtpUpgrade: number | null }[];
  cyclicalStats: { name: string; rtp: number; info: string }[];
  hourlyStats: { hour: string; rtp: number; rtpCase: number | null; rtpUpgrade: number | null }[];
  topCases: CaseItem[];
  todayStats: { hour: string; rtp: number | null; rtpCase: number | null; rtpUpgrade: number | null }[];
  bestTodayCases: CaseItem[]; // Новое свойство для лучших суточных кейсов
}

interface AuditChartsProps {
  onSelectCase: (caseItem: CaseItem) => void;
}

const SITE_WHITELIST = [
  { id: "all", name: "ВСЕ САЙТЫ" },
  { id: "case-battle", name: "Case-Battle" },
  { id: "mycs2", name: "MyCS2" },
  { id: "easydrop", name: "EasyDrop" }
];

const tabs = [
  { id: "today", label: "Сегодня", icon: Sparkle },
  { id: "weekly", label: "Неделя", icon: TrendUp },
  { id: "dayOfWeek", label: "По дням", icon: CalendarCheck },
  { id: "hourly", label: "По часам", icon: Clock }
] as const;

const tooltipStyle = {
  background: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "12px",
  fontSize: "11px",
  fontFamily: "var(--font-geist-mono)",
  color: "#f4f4f5",
  boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.7)"
};

const labelStyle = {
  color: "#a1a1aa",
  fontWeight: "bold",
  marginBottom: "4px"
};

const itemStyle = {
  color: "#ffffff"
};

export default function AuditCharts({ onSelectCase }: AuditChartsProps) {
  const [activeTab, setActiveTab] = useState<"today" | "weekly" | "dayOfWeek" | "hourly">("today");
  const [selectedSite, setSelectedSite] = useState("all");
  const [selectedType, setSelectedType] = useState<"all" | "case" | "upgrade">("all");
  const [chartData, setChartData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const parseDbDateToEpoch = (createdAt: string) => {
    if (!createdAt) return Date.now();
    const cleanStr = createdAt.replace(" ", "T");
    let localDate = new Date(cleanStr);
    
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
    
    const browserOffsetMin = new Date().getTimezoneOffset();
    const mskOffsetMin = -180;
    const diffMin = browserOffsetMin - mskOffsetMin;
    return localDate.getTime() - (diffMin * 60 * 1000);
  };

  const [isBestCasesExpanded, setIsBestCasesExpanded] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  useEffect(() => {
    let active = true;
    const fetchChartData = async () => {
      try {
        const res = await fetch(`/api/analytics?site=${selectedSite}&type=${selectedType}`);
        if (res.ok && active) {
          const json = await res.json();
          const rawLogs: LogEntry[] = json.rawLogs || [];

          // Оптимизация: разбор дат производится один раз для всех графиков
          const parsed: ParsedLog[] = rawLogs
            .map((l: LogEntry) => ({ 
              ...l, 
              epoch: parseDbDateToEpoch(l.created_at) 
            }))
            .filter((l: ParsedLog) => !isNaN(l.epoch));

          if (parsed.length === 0) {
            setChartData(null);
            setLoading(false);
            return;
          }

          // Поиск последнего активного дня в базе данных
          const maxEpoch = Math.max(...parsed.map((l: ParsedLog) => l.epoch));
          const targetDate = new Date(maxEpoch);
          const tYear = targetDate.getFullYear();
          const tMonth = targetDate.getMonth();
          const tDay = targetDate.getDate();

          // Выборка логов строго за этот день
          const dayLogs = parsed.filter((l: ParsedLog) => {
            const d = new Date(l.epoch);
            return d.getFullYear() === tYear && d.getMonth() === tMonth && d.getDate() === tDay;
          });

          // 1. СЕГОДНЯ
          const getTodayStats = () => {
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

                const isCase = log.type === "case" || log.type === "cases" || log.type === "open";
                const isUpgrade = log.type === "upgrade" || log.type === "upgrades";
                if (isCase) {
                  hourlyMap[hourLabel].spentCase += spent;
                  hourlyMap[hourLabel].wonCase += won;
                } else if (isUpgrade) {
                  hourlyMap[hourLabel].spentUpgrade += spent;
                  hourlyMap[hourLabel].wonUpgrade += won;
                }
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
                rtpUpgrade: isFuture ? null : (data.spentUpgrade > 0 ? Math.round((data.wonUpgrade / data.spentUpgrade) * 100) : 0)
              };
            });
          };

          // 2. НЕДЕЛЯ
          const getWeeklyStats = () => {
            const daysMap = new Map<string, { spentAll: number; wonAll: number; spentCase: number; wonCase: number; spentUpgrade: number; wonUpgrade: number }>();
            const daysList: string[] = [];

            for (let i = 6; i >= 0; i--) {
              const d = new Date(targetDate.getTime() - i * 24 * 60 * 60 * 1000);
              const label = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
              daysList.push(label);
              daysMap.set(label, { spentAll: 0, wonAll: 0, spentCase: 0, wonCase: 0, spentUpgrade: 0, wonUpgrade: 0 });
            }

            parsed.forEach((log: ParsedLog) => {
              const d = new Date(log.epoch);
              const label = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
              if (daysMap.has(label)) {
                const current = daysMap.get(label)!;
                const spent = Number(log.spent);
                const won = Number(log.won);

                current.spentAll += spent;
                current.wonAll += won;

                const isCase = log.type === "case" || log.type === "cases" || log.type === "open";
                const isUpgrade = log.type === "upgrade" || log.type === "upgrades";
                if (isCase) {
                  current.spentCase += spent;
                  current.wonCase += won;
                } else if (isUpgrade) {
                  current.spentUpgrade += spent;
                  current.wonUpgrade += won;
                }
              }
            });

            return daysList.map(label => {
              const data = daysMap.get(label)!;
              return {
                day: label,
                rtp: data.spentAll > 0 ? Math.round((data.wonAll / data.spentAll) * 100) : 0,
                rtpCase: data.spentCase > 0 ? Math.round((data.wonCase / data.spentCase) * 100) : 0,
                rtpUpgrade: data.spentUpgrade > 0 ? Math.round((data.wonUpgrade / data.spentUpgrade) * 100) : 0
              };
            });
          };

          // 3. ПО ДНЯМ НЕДЕЛИ
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

            parsed.forEach((log: ParsedLog) => {
              const d = new Date(log.epoch);
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

          // 4. ПО ЧАСАМ (За все время)
          const getHourlyStats = () => {
            const hourlyMap: Record<string, { spentAll: number; wonAll: number; spentCase: number; wonCase: number; spentUpgrade: number; wonUpgrade: number }> = {};
            for (let i = 0; i < 24; i++) {
              const label = `${String(i).padStart(2, "0")}:00`;
              hourlyMap[label] = { spentAll: 0, wonAll: 0, spentCase: 0, wonCase: 0, spentUpgrade: 0, wonUpgrade: 0 };
            }

            parsed.forEach((log: ParsedLog) => {
              const d = new Date(log.epoch);
              const hourLabel = `${String(d.getHours()).padStart(2, "0")}:00`;
              if (hourlyMap[hourLabel]) {
                const spent = Number(log.spent);
                const won = Number(log.won);
                hourlyMap[hourLabel].spentAll += spent;
                hourlyMap[hourLabel].wonAll += won;

                const isCase = log.type === "case" || log.type === "cases" || log.type === "open";
                const isUpgrade = log.type === "upgrade" || log.type === "upgrades";
                if (isCase) {
                  hourlyMap[hourLabel].spentCase += spent;
                  hourlyMap[hourLabel].wonCase += won;
                } else if (isUpgrade) {
                  hourlyMap[hourLabel].spentUpgrade += spent;
                  hourlyMap[hourLabel].wonUpgrade += won;
                }
              }
            });

            return Object.entries(hourlyMap).map(([hourLabel, data]) => ({
              hour: hourLabel,
              rtp: data.spentAll > 0 ? Math.round((data.wonAll / data.spentAll) * 100) : 0,
              rtpCase: data.spentCase > 0 ? Math.round((data.wonCase / data.spentCase) * 100) : 0,
              rtpUpgrade: data.spentUpgrade > 0 ? Math.round((data.wonUpgrade / data.spentUpgrade) * 100) : 0
            }));
          };

          // 5. ПОПУЛЯРНЫЕ КЕЙСЫ
          const getTopCases = () => {
            const caseMetrics: Record<string, { spent: number; won: number; count: number; site: string }> = {};
            parsed.forEach((log: ParsedLog) => {
              const isCase = log.type === "case" || log.type === "cases" || log.type === "open";
              if (isCase && log.item_name !== "unknown") {
                if (!caseMetrics[log.item_name]) {
                  caseMetrics[log.item_name] = { spent: 0, won: 0, count: 0, site: log.site };
                }
                caseMetrics[log.item_name].spent += Number(log.spent);
                caseMetrics[log.item_name].won += Number(log.won);
                caseMetrics[log.item_name].count += 1;
              }
            });

            return Object.entries(caseMetrics)
              .map(([name, data]) => ({
                name,
                site: data.site,
                count: data.count,
                spent: data.spent,
                won: data.won,
                rtp: Math.round((data.won / data.spent) * 100)
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 4);
          };

          // 6. 3 ЛУЧШИХ КЕЙСА ЗА СЕГОДНЯ
          // 6. 3 ЛУЧШИХ КЕЙСА ЗА СЕГОДНЯ (Ступенчатый отбор по количеству открытий и RTP)
            const getBestTodayCases = () => {
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

              const dayCaseLogs = dayLogs.filter((log: ParsedLog) => {
                const isCase = log.type === "case" || log.type === "cases" || log.type === "open";
                return isCase && log.item_name !== "unknown";
              });

              const caseMetrics: Record<string, { spent: number; won: number; count: number; site: string }> = {};
              dayCaseLogs.forEach((log: ParsedLog) => {
                if (!caseMetrics[log.item_name]) {
                  caseMetrics[log.item_name] = { spent: 0, won: 0, count: 0, site: log.site };
                }
                caseMetrics[log.item_name].spent += Number(log.spent);
                caseMetrics[log.item_name].won += Number(log.won);
                caseMetrics[log.item_name].count += 1;
              });

              const allTodayCases = Object.entries(caseMetrics).map(([name, data]) => ({
                name,
                site: data.site,
                count: data.count,
                spent: data.spent,
                won: data.won,
                rtp: Math.round((data.won / data.spent) * 100)
              }));

              if (allTodayCases.length === 0) return [];

              // Массив ступеней выборки по количеству открытий (от большего к меньшему)
              const tiers = [1200, 800, 500, 300, 100, 50, 10];
              let selectedCases: typeof allTodayCases = [];

              for (const tier of tiers) {
                // Фильтруем кейсы, которые набрали этот порог открытий
                const tierCases = allTodayCases.filter(c => c.count >= tier);
                // Если кейсы в этой ступени есть и хотя бы у одного из них RTP >= 110%
                if (tierCases.length > 0 && tierCases.some(c => c.rtp >= 110)) {
                  selectedCases = tierCases;
                  break; // Прерываем цикл, так как нашли максимально достоверную ступень
                }
              }

              // Если ни одна ступень не подошла (мало логов или везде RTP < 110), берем все доступные кейсы за сегодня
              if (selectedCases.length === 0) {
                selectedCases = allTodayCases;
              }

              // Сортируем по RTP и забираем топ-3 лучших
              return selectedCases
                .sort((a, b) => b.rtp - a.rtp)
                .slice(0, 3);
            };

          setChartData({
            todayStats: getTodayStats(),
            weeklyStats: getWeeklyStats(),
            cyclicalStats: getCyclicalStats(),
            hourlyStats: getHourlyStats(),
            topCases: getTopCases(),
            bestTodayCases: getBestTodayCases()
          });
        }
      } catch (err) {
        console.error("Ошибка получения чарт-логов:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchChartData();

    return () => {
      active = false;
    };
  }, [selectedSite, selectedType]);

  const getGlobalVerdict = () => {
    if (!chartData) return "Ожидание данных...";

    if (activeTab === "today") {
      const rtpList = chartData.todayStats.map(d => d.rtp).filter(r => r !== null && r > 0);
      const avgRtp = rtpList.length > 0 ? rtpList.reduce<number>((a, b) => (a ?? 0) + (b ?? 0), 0) / rtpList.length : 0;
      if (avgRtp === 0) {
        return "В сутках последнего лога не зафиксировано достаточного объема транзакций для составления вердикта.";
      }
      if (avgRtp < 45) {
        return `Средний RTP за день активности составляет ${Math.round(avgRtp)}%. Фиксируется снижение отдачи алгоритмов относительно нормы в 45%.`;
      }
      return `Суточный показатель RTP стабилен и составляет ${Math.round(avgRtp)}%. Системы работают в пределах стандартного математического ожидания.`;
    }
    
    if (activeTab === "dayOfWeek") {
      const mon = chartData.cyclicalStats.find(d => d.name === "ПН")?.rtp || 0;
      const tue = chartData.cyclicalStats.find(d => d.name === "ВТ")?.rtp || 0;
      const wed = chartData.cyclicalStats.find(d => d.name === "СР")?.rtp || 0;
      const thu = chartData.cyclicalStats.find(d => d.name === "ЧТ")?.rtp || 0;
      const sat = chartData.cyclicalStats.find(d => d.name === "СБ")?.rtp || 0;
      const sun = chartData.cyclicalStats.find(d => d.name === "ВС")?.rtp || 0;

      const weekdayAvg = (mon + tue + wed + thu) / 4;
      const weekendAvg = (sat + sun) / 2;
      const diff = Math.round(weekdayAvg - weekendAvg);

      if (diff > 5) {
        return `Анализ выявляет снижение окупаемости в выходные дни на ${diff}% по сравнению с буднями. Алгоритмы отдачи урезаются в дни пикового наплыва аудитории.`;
      }
      return `Статистика показывает стабильное распределение окупаемости в течение недели. Резких снижений отдачи на выходных не зафиксировано.`;
    }

    if (activeTab === "hourly") {
      const nightAvg = (chartData.hourlyStats.slice(0, 4).reduce((acc, curr) => acc + curr.rtp, 0)) / 4;
      const dayAvg = (chartData.hourlyStats.slice(6, 12).reduce((acc, curr) => acc + curr.rtp, 0)) / 6;
      const hourDiff = Math.round(nightAvg - dayAvg);

      if (hourDiff > 5) {
        return `Зафиксирован ночной подъем отдачи (в среднем на ${hourDiff}% выше нормы). Алгоритмы завышают шансы в малолюдные часы для привлечения ночных игроков.`;
      }
      return `Почасовой анализ показывает равномерное распределение шансов в течение суток. Крупных временных отклонений в алгоритмах не обнаружено.`;
    }

    const rtpList = chartData.weeklyStats.map(d => d.rtp);
    const avgRtp = rtpList.length > 0 ? rtpList.reduce((a, b) => a + b, 0) / rtpList.length : 0;
    if (avgRtp < 45) {
      return `Взвешенный показатель окупаемости за прошедшую неделю составил ${Math.round(avgRtp)}%, что существенно ниже честного математического порога (45%).`;
    }
    return `Взвешенный показатель окупаемости за прошедшую неделю стабилен и составляет в среднем ${Math.round(avgRtp)}%.`;
  };

  return (
    <div className="bg-zinc-950/40 border border-zinc-850 p-6 rounded-3xl liquid-glass flex flex-col gap-6 h-full">
      
      {/* СЕЛЕКТОР ПЛОЩАДОК И ТИПА ОПЕРАЦИЙ */}
      <div className="flex flex-col gap-4 border-b border-zinc-850 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">АУДИТИРУЕМАЯ ПЛОЩАДКА</span>
            <div className="flex flex-wrap gap-2">
              {SITE_WHITELIST.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setSelectedSite(item.id); setLoading(true); }}
                  className={`px-3 py-1 text-xs font-mono border rounded-lg transition-all duration-200 cursor-pointer ${
                    selectedSite === item.id
                      ? "bg-rose-500/10 border-rose-500 text-rose-300"
                      : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1">
            <span className="text-[9px] font-mono text-zinc-500 tracking-wider">ИСТОЧНИК ДАННЫХ</span>
            <span className="text-[10px] font-mono text-emerald-400 px-3 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 uppercase font-bold">
              Supabase Live DB
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-zinc-900/80 pt-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">ТИП АНАЛИЗИРУЕМЫХ ОПЕРАЦИЙ</span>
          <div className="flex gap-2">
            {[
              { id: "all", label: "Все операции" },
              { id: "case", label: "Только Кейсы" },
              { id: "upgrade", label: "Только Апгрейды" }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedType(t.id as "all" | "case" | "upgrade"); setLoading(true); }}
                className={`px-3 py-1.5 text-xs font-mono border rounded-lg transition-all duration-200 cursor-pointer ${
                  selectedType === t.id
                    ? "bg-rose-500/10 border-rose-500 text-rose-300"
                    : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ТАБ-НАВИГАЦИЯ ВРЕМЕННЫХ ИНТЕРВАЛОВ */}
      <div className="overflow-x-auto scrollbar-none w-full bg-zinc-900/50 border border-zinc-800 p-1.5 rounded-xl" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-2 min-w-max md:w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex-1 py-2 px-4 rounded-lg text-xs font-mono flex items-center justify-center gap-2 cursor-pointer z-10 transition-colors"
                style={{ color: isActive ? "#ffffff" : "#a1a1aa" }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-chart-tab"
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

      {selectedType === "all" && (activeTab === "today" || activeTab === "weekly" || activeTab === "hourly") && (
        <div className="flex flex-wrap gap-4 items-center justify-center border-b border-zinc-900 pb-3 -mt-3 text-[9px] font-mono tracking-wider">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span className="text-zinc-400 uppercase">ОКУПАЕМОСТЬ КЕЙСОВ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
            <span className="text-zinc-400 uppercase">ОКУПАЕМОСТЬ АПГРЕЙДОВ</span>
          </div>
        </div>
      )}

      {/* ТЕЛО ГРАФИКА */}
      <div className="w-full h-60 relative mt-2">
        {loading || !isMounted ? (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-zinc-500">
            Синхронизация шкал с базой данных...
          </div>
        ) : chartData ? (
          <ResponsiveContainer width="100%" height={240} minWidth={0} minHeight={0}>
            {activeTab === "today" ? (
              <AreaChart data={chartData.todayStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTodayCase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTodayUpgrade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} />
                <YAxis stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={labelStyle}
                  itemStyle={itemStyle}
                  formatter={(value: unknown, name: unknown) => {
                    const label = name === "rtpCase" ? "RTP Кейсов" : name === "rtpUpgrade" ? "RTP Апгрейдов" : "Средний RTP";
                    return [`${value}%`, label];
                  }}
                />
                {selectedType === "all" ? (
                  <>
                    <Area type="monotone" connectNulls dataKey="rtpCase" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorTodayCase)" name="rtpCase" />
                    <Area type="monotone" connectNulls dataKey="rtpUpgrade" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorTodayUpgrade)" name="rtpUpgrade" />
                  </>
                ) : selectedType === "case" ? (
                  <Area type="monotone" connectNulls dataKey="rtpCase" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorTodayCase)" name="rtpCase" />
                ) : (
                  <Area type="monotone" connectNulls dataKey="rtpUpgrade" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorTodayUpgrade)" name="rtpUpgrade" />
                )}
                <ReferenceLine y={45} stroke="#3f3f46" strokeDasharray="3 3" />
              </AreaChart>
            ) : activeTab === "weekly" ? (
              <AreaChart data={chartData.weeklyStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWeeklyCase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorWeeklyUpgrade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} />
                <YAxis stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={labelStyle}
                  itemStyle={itemStyle}
                  formatter={(value: unknown, name: unknown) => {
                    const label = name === "rtpCase" ? "RTP Кейсов" : name === "rtpUpgrade" ? "RTP Апгрейдов" : "Средний RTP";
                    return [`${value}%`, label];
                  }}
                />
                {selectedType === "all" ? (
                  <>
                    <Area type="monotone" connectNulls dataKey="rtpCase" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorWeeklyCase)" name="rtpCase" />
                    <Area type="monotone" connectNulls dataKey="rtpUpgrade" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorWeeklyUpgrade)" name="rtpUpgrade" />
                  </>
                ) : selectedType === "case" ? (
                  <Area type="monotone" connectNulls dataKey="rtpCase" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorWeeklyCase)" name="rtpCase" />
                ) : (
                  <Area type="monotone" connectNulls dataKey="rtpUpgrade" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorWeeklyUpgrade)" name="rtpUpgrade" />
                )}
                <ReferenceLine y={45} stroke="#3f3f46" strokeDasharray="3 3" />
              </AreaChart>
            ) : activeTab === "dayOfWeek" ? (
              <BarChart data={chartData.cyclicalStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                <Bar dataKey="rtp" radius={[4, 4, 0, 0]}>
                  {chartData.cyclicalStats.map((entry, index) => {
                    const isRigged = entry.rtp < 25;
                    return <Cell key={`cell-${index}`} fill={isRigged ? "#f43f5e" : "#52525b"} />;
                  })}
                </Bar>
                <ReferenceLine y={45} stroke="#10b981" strokeDasharray="3 3" />
              </BarChart>
            ) : (
              <AreaChart data={chartData.hourlyStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHourlyCase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHourlyUpgrade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} />
                <YAxis stroke="#52525b" fontSize={9} fontFamily="var(--font-geist-mono)" tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={labelStyle}
                  itemStyle={itemStyle}
                  formatter={(value: unknown, name: unknown) => {
                    const label = name === "rtpCase" ? "RTP Кейсов" : name === "rtpUpgrade" ? "RTP Апгрейдов" : "Средний RTP";
                    return [`${value}%`, label];
                  }}
                />
                {selectedType === "all" ? (
                  <>
                    <Area type="step" connectNulls dataKey="rtpCase" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorHourlyCase)" name="rtpCase" />
                    <Area type="step" connectNulls dataKey="rtpUpgrade" stroke="#f43f5e" strokeWidth={1.5} fillOpacity={1} fill="url(#colorHourlyUpgrade)" name="rtpUpgrade" />
                  </>
                ) : selectedType === "case" ? (
                  <Area type="step" connectNulls dataKey="rtpCase" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorHourlyCase)" name="rtpCase" />
                ) : (
                  <Area type="step" connectNulls dataKey="rtpUpgrade" stroke="#f43f5e" strokeWidth={1.5} fillOpacity={1} fill="url(#colorHourlyUpgrade)" name="rtpUpgrade" />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-zinc-500">
            Ожидание логов...
          </div>
        )}
      </div>

      <div className="bg-rose-950/20 border border-rose-900/40 p-3 rounded-xl flex items-start gap-2.5 mt-2">
        <Warning className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <p className="text-rose-200">
            <strong className="text-white">Телеметрия:</strong> {getGlobalVerdict()}
          </p>
        </div>
      </div>

      {/* НОВЫЙ БЛОК: 3 ЛУЧШИХ КЕЙСА ЗА СЕГОДНЯ */}
      <div className="border-t border-zinc-850 pt-5 flex flex-col gap-3">
        <div 
          onClick={() => setIsBestCasesExpanded(!isBestCasesExpanded)}
          className="flex items-center justify-between cursor-pointer select-none group"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1">
              3 лучших кейса за сегодня
              {isBestCasesExpanded ? (
                <CaretUp className="w-3 h-3 text-emerald-500" />
              ) : (
                <CaretDown className="w-3 h-3 text-emerald-500" />
              )}
            </span>
          </div>
          <span className="text-[9px] font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors uppercase">
            {isBestCasesExpanded ? "СВЕРНУТЬ" : "РАЗВЕРНУТЬ"}
          </span>
        </div>

        <AnimatePresence initial={false}>
          {isBestCasesExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              {/* Строгая сетка на 3 горизонтальных элемента с уменьшенным gap */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {loading ? (
                  <div className="col-span-3 text-center text-[10px] font-mono text-zinc-600 py-3">
                    Расчет показателей...
                  </div>
                ) : chartData && chartData.bestTodayCases && chartData.bestTodayCases.length > 0 ? (
                  chartData.bestTodayCases.map((caseItem, idx) => {
                    const isHighRtp = caseItem.rtp >= 110; // Выделяем зеленым те, что вышли в плюс
                    return (
                      <motion.div
                        key={`best-today-${idx}`}
                        whileHover={{ scale: 1.01, y: -0.5 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => onSelectCase(caseItem)}
                        // Оптимальная высота 76px и внутренний отступ 2.5
                        className="bg-emerald-950/5 hover:bg-emerald-950/10 border border-emerald-900/15 hover:border-emerald-500/30 p-2.5 rounded-xl flex flex-col justify-between h-[76px] cursor-pointer transition-all"
                      >
                        {/* Упорядоченная вертикальная шапка */}
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-zinc-200 truncate leading-tight" title={caseItem.name}>
                            {caseItem.name}
                          </span>
                          <span className="text-[6.5px] font-mono font-bold text-emerald-400/80 uppercase tracking-wider mt-0.5">
                            {caseItem.site}
                          </span>
                        </div>

                        {/* Упорядоченный табличный блок метрик без наложений */}
                        <div className="flex flex-col gap-0.5 border-t border-zinc-900/80 pt-1 font-mono text-[8.5px]">
                          <div className="flex justify-between text-zinc-500 leading-none">
                            <span>Открыто:</span>
                            <span className="text-zinc-300 font-bold">{caseItem.count}</span>
                          </div>
                          <div className="flex justify-between leading-none">
                            <span>RTP дня:</span>
                            <span className={`font-black ${isHighRtp ? "text-emerald-400" : "text-zinc-300"}`}>
                              {caseItem.rtp}%
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="col-span-3 text-center text-[10px] font-mono text-zinc-600 py-3">
                    Для расчета суточного топа требуется накопление логов за день.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ЖИВОЙ ТОП ПОПУЛЯРНЫХ КЕЙСОВ ИЗ БАЗЫ ДАННЫХ */}
      <div className="border-t border-zinc-850 pt-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">ПОПУЛЯРНЫЕ КЕЙСЫ В БАЗЕ</span>
          <span className="text-[9px] font-mono text-zinc-600">Кликните по кейсу для детального аудита</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            <div className="col-span-2 text-center text-xs font-mono text-zinc-600 py-4">
              Загрузка топа...
            </div>
          ) : chartData && chartData.topCases.length > 0 ? (
            chartData.topCases.map((caseItem, idx) => {
              const isLowRtp = caseItem.rtp < 30;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onSelectCase(caseItem)}
                  className="bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700 p-3.5 rounded-2xl flex flex-col gap-2 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-200 truncate">{caseItem.name}</span>
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-750 text-zinc-400">
                      {caseItem.site}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mt-1 font-mono">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-zinc-500 uppercase">Открытий:</span>
                      <span className="text-[11px] font-bold text-zinc-300">{caseItem.count}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[8px] text-zinc-500 uppercase">Реальный RTP:</span>
                      <span className={`text-[11px] font-bold ${isLowRtp ? "text-rose-400" : "text-emerald-400"}`}>
                        {caseItem.rtp}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-2 text-center text-xs font-mono text-zinc-600 py-4">
              Для отображения топа требуется накопление логов в базе.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}