"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, ReferenceLine
} from "recharts";
import { TrendUp, CalendarCheck, Clock, Warning, Sparkle } from "@phosphor-icons/react";

interface CaseItem {
  name: string;
  site: string;
  count: number;
  spent: number;
  won: number;
  rtp: number;
}

interface StatsData {
  weeklyStats: { day: string; rtp: number; rtpCase: number | null; rtpUpgrade: number | null }[];
  cyclicalStats: { name: string; rtp: number; info: string }[];
  hourlyStats: { hour: string; rtp: number; rtpCase: number | null; rtpUpgrade: number | null }[];
  topCases: CaseItem[];
  todayStats: { hour: string; rtp: number; rtpCase: number | null; rtpUpgrade: number | null }[];
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

  useEffect(() => {
    let active = true;
    const fetchChartData = async () => {
      try {
        const res = await fetch(`/api/analytics?site=${selectedSite}&type=${selectedType}`);
        if (res.ok && active) {
          const json = await res.json();
          setChartData({
            weeklyStats: json.weeklyStats || [],
            cyclicalStats: json.cyclicalStats || [],
            hourlyStats: json.hourlyStats || [],
            topCases: json.topCases || [],
            todayStats: json.todayStats || []
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
      const rtpList = chartData.todayStats.map(d => d.rtp).filter(r => r > 0);
      const avgRtp = rtpList.length > 0 ? rtpList.reduce((a, b) => a + b, 0) / rtpList.length : 0;
      if (avgRtp === 0) {
        return "В скользящих сутках не зафиксировано достаточного объема транзакций для составления локального вердикта.";
      }
      if (avgRtp < 45) {
        return `Скользящий средний RTP составляет ${Math.round(avgRtp)}%. Фиксируется снижение отдачи алгоритмов относительно нормы в 45%.`;
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
        
        {/* Сайт-фильтр */}
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

        {/* Тип-фильтр */}
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

      {/* КАСТОМНАЯ ЛЕГЕНДА С КОРРЕКТНЫМИ ЦВЕТАМИ */}
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
      <div className="flex-1 min-h-55 relative mt-2">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-zinc-500">
            Синхронизация шкал с базой данных...
          </div>
        ) : chartData ? (
          <ResponsiveContainer width="100%" height="100%">
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