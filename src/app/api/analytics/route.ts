import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

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

let cachedLogs: LogEntry[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 600000; // 10 минут

interface PersonalData {
  totalSpent: number;
  totalWon: number;
  casesCount: number;
  upgradesCount: number;
  rtp: number;
  recentLogs: {
    id: string;
    timestamp: string;
    site: string;
    caseName: string;
    cost: number;
    won: number;
    isProfit: boolean;
    type: string;
  }[];
}

const userCache = new Map<string, { data: PersonalData; timestamp: number }>();
const USER_CACHE_TTL = 1800000; // 30 минут

export async function GET(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Supabase credentials missing in environment" }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const siteFilter = searchParams.get("site") || "all";
    const caseFilter = searchParams.get("case") || "";
    const typeFilter = searchParams.get("type") || "all";
    const userIdQuery = searchParams.get("user_id") || "";

    const nowTime = Date.now();

    // 1. ПЕРСОНАЛЬНЫЙ КЭШ
    if (userIdQuery !== "") {
      const cachedUser = userCache.get(userIdQuery);
      if (cachedUser && nowTime - cachedUser.timestamp < USER_CACHE_TTL) {
        const secondsRemaining = Math.round((USER_CACHE_TTL - (nowTime - cachedUser.timestamp)) / 1000);
        return NextResponse.json({
          success: true,
          fromCache: true,
          cooldownRemaining: secondsRemaining,
          ...cachedUser.data
        });
      }
    }

    // 2. ОБНОВЛЕНИЕ ГЛОБАЛЬНОГО КЭША
    if (nowTime - lastFetchTime > CACHE_TTL || cachedLogs.length === 0) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?order=created_at.desc&limit=5000`, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        }
      });

      if (res.ok) {
        cachedLogs = await res.json();
        lastFetchTime = nowTime;
        console.log(`[CaseAudit Cache] Глобальные логи обновлены. Записей: ${cachedLogs.length}`);
      } else {
        throw new Error("Failed to fetch logs from Supabase");
      }
    }

    // 3. ОБРАБОТКА ПЕРСОНАЛЬНОГО ЗАПРОСА
    if (userIdQuery !== "") {
      const userLogs = cachedLogs.filter(log => log.user_id === userIdQuery);
      
      let userSpent = 0;
      let userWon = 0;
      let userCasesCount = 0;
      let userUpgradesCount = 0;

      userLogs.forEach(log => {
        const spent = Number(log.spent);
        const won = Number(log.won);
        
        if (log.type === "case") {
          userCasesCount += 1;
        } else if (log.type === "upgrade") {
          userUpgradesCount += 1;
        }
        userSpent += spent;
        userWon += won;
      });

      const userRtp = userSpent > 0 ? Math.round((userWon / userSpent) * 100) : 0;
      
      const userRecent = userLogs.slice(0, 3).map(log => ({
        id: String(log.id),
        timestamp: new Date(log.created_at).toLocaleTimeString("ru-RU", { hour12: false }),
        site: log.site,
        caseName: log.type === "upgrade" ? "Апгрейд скина" : log.item_name,
        cost: Number(log.spent),
        won: Number(log.won),
        isProfit: Number(log.won) > Number(log.spent),
        type: log.type
      }));

      const personalData = {
        totalSpent: userSpent,
        totalWon: userWon,
        casesCount: userCasesCount,
        upgradesCount: userUpgradesCount,
        rtp: userRtp,
        recentLogs: userRecent
      };

      userCache.set(userIdQuery, {
        data: personalData,
        timestamp: nowTime
      });

      return NextResponse.json({
        success: true,
        fromCache: false,
        cooldownRemaining: Math.round(USER_CACHE_TTL / 1000),
        ...personalData
      });
    }

    // ВЫЧИСЛЕНИЕ УНИКАЛЬНЫХ АУДИТОРОВ
    const uniqueUsers = new Set<string>();
    cachedLogs.forEach(log => {
      if (
        log.user_id && 
        typeof log.user_id === "string" && 
        log.user_id.trim() !== "" && 
        log.user_id.trim() !== "null" && 
        log.user_id.trim() !== "undefined"
      ) {
        uniqueUsers.add(log.user_id.trim());
      }
    });
    const uniqueAuditorsCount = uniqueUsers.size;

    // 4. СТАНДАРТНАЯ ФИЛЬТРАЦИЯ ГЛОБАЛЬНЫХ ЛОГОВ
    let filteredLogs = cachedLogs;
    if (caseFilter !== "") {
      filteredLogs = filteredLogs.filter(log => log.item_name === caseFilter);
    }
    if (siteFilter !== "all") {
      filteredLogs = filteredLogs.filter(log => log.site === siteFilter);
    }
    if (typeFilter !== "all") {
      filteredLogs = filteredLogs.filter(log => log.type === typeFilter);
    }

    let totalSpent = 0;
    let totalWon = 0;
    const siteVolume: Record<string, { count: number; spent: number; won: number }> = {
      "case-battle": { count: 0, spent: 0, won: 0 },
      "mycs2": { count: 0, spent: 0, won: 0 },
      "easydrop": { count: 0, spent: 0, won: 0 }
    };

    filteredLogs.forEach(log => {
      const spent = Number(log.spent);
      const won = Number(log.won);
      totalSpent += spent;
      totalWon += won;

      if (siteVolume[log.site]) {
        siteVolume[log.site].count += 1;
        siteVolume[log.site].spent += spent;
        siteVolume[log.site].won += won;
      }
    });

    const globalRtp = totalSpent > 0 ? Math.round((totalWon / totalSpent) * 100) : 0;

    // Срез за сегодняшний календарный день (Резолюция по часам)
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const todayLogs = filteredLogs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate.getFullYear() === todayYear &&
             logDate.getMonth() === todayMonth &&
             logDate.getDate() === todayDate;
    });

    const todayHourlyMap: Record<number, {
      spentAll: number; wonAll: number;
      spentCase: number; wonCase: number;
      spentUpgrade: number; wonUpgrade: number;
    }> = {};

    for (let i = 0; i < 24; i++) {
      todayHourlyMap[i] = {
        spentAll: 0, wonAll: 0,
        spentCase: 0, wonCase: 0,
        spentUpgrade: 0, wonUpgrade: 0
      };
    }

    todayLogs.forEach(log => {
      const hour = new Date(log.created_at).getHours();
      const spent = Number(log.spent);
      const won = Number(log.won);

      todayHourlyMap[hour].spentAll += spent;
      todayHourlyMap[hour].wonAll += won;

      if (log.type === "case") {
        todayHourlyMap[hour].spentCase += spent;
        todayHourlyMap[hour].wonCase += won;
      } else if (log.type === "upgrade") {
        todayHourlyMap[hour].spentUpgrade += spent;
        todayHourlyMap[hour].wonUpgrade += won;
      }
    });

    const todayStats = Object.entries(todayHourlyMap).map(([hour, data]) => ({
      hour: `${hour.padStart(2, "0")}:00`,
      rtp: data.spentAll > 0 ? Math.round((data.wonAll / data.spentAll) * 100) : 0,
      rtpCase: data.spentCase > 0 ? Math.round((data.wonCase / data.spentCase) * 100) : null,
      rtpUpgrade: data.spentUpgrade > 0 ? Math.round((data.wonUpgrade / data.spentUpgrade) * 100) : null
    }));

    // Вычисление интервальных срезов по 30 минут за сегодняшний день
    const intervalMap: Record<string, { spent: number; won: number }> = {};
    for (let hour = 0; hour < 24; hour++) {
      for (const min of [0, 30]) {
        const label = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
        intervalMap[label] = { spent: 0, won: 0 };
      }
    }

    todayLogs.forEach(log => {
      const date = new Date(log.created_at);
      const hour = date.getHours();
      const minutes = date.getMinutes();
      const minGroup = minutes < 30 ? 0 : 30;
      const label = `${String(hour).padStart(2, "0")}:${String(minGroup).padStart(2, "0")}`;
      if (intervalMap[label]) {
        intervalMap[label].spent += Number(log.spent);
        intervalMap[label].won += Number(log.won);
      }
    });

    const intervalStats = Object.entries(intervalMap).map(([interval, data]) => ({
      interval,
      rtp: data.spent > 0 ? Math.round((data.won / data.spent) * 100) : 0
    }));

    // Сводка по неделям
    const weeklyMap = new Map<string, { spent: number; won: number }>();
    filteredLogs.forEach(log => {
      const dateStr = log.created_at.split("T")[0];
      const current = weeklyMap.get(dateStr) || { spent: 0, won: 0 };
      weeklyMap.set(dateStr, {
        spent: current.spent + Number(log.spent),
        won: current.won + Number(log.won)
      });
    });

    const weeklyStats = Array.from(weeklyMap.entries())
      .map(([date, data]) => ({
        day: date.split("-").slice(1).reverse().join("."),
        rtp: data.spent > 0 ? Math.round((data.won / data.spent) * 100) : 0
      }))
      .reverse()
      .slice(-7);

    // Расчет циклической дневной статистики
    const weekdayMap: Record<number, { spent: number; won: number; count: number }> = {
      1: { spent: 0, won: 0, count: 0 },
      2: { spent: 0, won: 0, count: 0 },
      3: { spent: 0, won: 0, count: 0 },
      4: { spent: 0, won: 0, count: 0 },
      5: { spent: 0, won: 0, count: 0 },
      6: { spent: 0, won: 0, count: 0 },
      0: { spent: 0, won: 0, count: 0 }
    };

    filteredLogs.forEach(log => {
      const date = new Date(log.created_at);
      const day = date.getDay();
      if (weekdayMap[day] !== undefined) {
        weekdayMap[day].spent += Number(log.spent);
        weekdayMap[day].won += Number(log.won);
        weekdayMap[day].count += 1;
      }
    });

    const weekdayNames = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
    const cyclicalStats = [1, 2, 3, 4, 5, 6, 0].map(dayNum => {
      const data = weekdayMap[dayNum];
      const rtp = data.spent > 0 ? Math.round((data.won / data.spent) * 100) : 0;
      let info = "Норма";
      if (dayNum === 5 || dayNum === 6 || dayNum === 0) info = "Снижение RTP";
      if (rtp < 25) info = "Низкая окупаемость";
      return {
        name: weekdayNames[dayNum],
        rtp,
        info
      };
    });

    // Почасовая статистика
    const hourlyMap: Record<number, { spent: number; won: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyMap[i] = { spent: 0, won: 0 };
    }

    filteredLogs.forEach(log => {
      const date = new Date(log.created_at);
      const hour = date.getHours();
      if (hourlyMap[hour]) {
        hourlyMap[hour].spent += Number(log.spent);
        hourlyMap[hour].won += Number(log.won);
      }
    });

    const hourlyStats = Object.entries(hourlyMap).map(([hour, data]) => ({
      hour: `${hour.padStart(2, "0")}:00`,
      rtp: data.spent > 0 ? Math.round((data.won / data.spent) * 100) : 0
    }));

    const liveFeed = filteredLogs.slice(0, 15).map(log => ({
      id: String(log.id),
      timestamp: new Date(log.created_at).toLocaleTimeString("ru-RU", { hour12: false }),
      user: log.user_id ? `ID: ${log.user_id}` : "Анонимный аудитор",
      site: log.site,
      caseName: log.type === "upgrade" ? "Апгрейд скина" : log.item_name,
      cost: Number(log.spent),
      won: Number(log.won),
      isProfit: Number(log.won) > Number(log.spent),
      type: log.type
    }));

    const caseMetrics: Record<string, { spent: number; won: number; count: number; site: string }> = {};
    filteredLogs.forEach(log => {
      if (log.type === "case" && log.item_name !== "unknown") {
        if (!caseMetrics[log.item_name]) {
          caseMetrics[log.item_name] = { spent: 0, won: 0, count: 0, site: log.site };
        }
        caseMetrics[log.item_name].spent += Number(log.spent);
        caseMetrics[log.item_name].won += Number(log.won);
        caseMetrics[log.item_name].count += 1;
      }
    });

    const topCases = Object.entries(caseMetrics)
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

    return NextResponse.json({
      success: true,
      totalAudited: filteredLogs.length,
      globalRtp,
      siteVolume,
      weeklyStats,
      cyclicalStats,
      hourlyStats,
      liveFeed,
      topCases,
      uniqueAuditors: uniqueAuditorsCount,
      todayStats,
      intervalStats // Передаем на фронтенд расчет интервалов за сегодня
    });

  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}