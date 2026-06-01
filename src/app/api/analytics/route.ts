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
    
    // Считываем смещение таймзоны клиента в минутах (например, -180 для Москвы)
    const clientOffset = Number(searchParams.get("timezoneOffset") || "0");

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

    // Вспомогательная функция для приведения даты UTC к локальной дате клиента на сервере
    const getLocalDate = (createdAt: string) => {
      const utcDate = new Date(createdAt);
      return new Date(utcDate.getTime() - clientOffset * 60000);
    };

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
        
        const isCase = log.type === "case" || log.type === "cases" || log.type === "open";
        const isUpgrade = log.type === "upgrade" || log.type === "upgrades";

        if (isCase) {
          userCasesCount += 1;
        } else if (isUpgrade) {
          userUpgradesCount += 1;
        }
        userSpent += spent;
        userWon += won;
      });

      const userRtp = userSpent > 0 ? Math.round((userWon / userSpent) * 100) : 0;
      
      const userRecent = userLogs.slice(0, 3).map(log => ({
        id: String(log.id),
        timestamp: getLocalDate(log.created_at).toLocaleTimeString("ru-RU", { hour12: false }),
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

    // Определение текущего времени в таймзоне клиента
    const nowLocal = new Date(Date.now() - clientOffset * 60000);
    const todayYear = nowLocal.getUTCFullYear();
    const todayMonth = nowLocal.getUTCMonth();
    const todayDate = nowLocal.getUTCDate();

    // Фильтрация логов строго за сегодняшний календарный день клиента
    const todayLogs = filteredLogs.filter(log => {
      const localLogDate = getLocalDate(log.created_at);
      return localLogDate.getUTCFullYear() === todayYear &&
             localLogDate.getUTCMonth() === todayMonth &&
             localLogDate.getUTCDate() === todayDate;
    });

    const todayHourlyMap: Record<string, {
      spentAll: number; wonAll: number;
      spentCase: number; wonCase: number;
      spentUpgrade: number; wonUpgrade: number;
    }> = {};

    // Генерируем полную суточную шкалу от 00:00 до 23:00 для текущего дня
    const hoursList: string[] = [];
    for (let i = 0; i < 24; i++) {
      const hourLabel = `${String(i).padStart(2, "0")}:00`;
      hoursList.push(hourLabel);
      todayHourlyMap[hourLabel] = {
        spentAll: 0, wonAll: 0,
        spentCase: 0, wonCase: 0,
        spentUpgrade: 0, wonUpgrade: 0
      };
    }

    todayLogs.forEach(log => {
      const localLogDate = getLocalDate(log.created_at);
      const hourLabel = `${String(localLogDate.getUTCHours()).padStart(2, "0")}:00`;
      
      if (todayHourlyMap[hourLabel]) {
        const spent = Number(log.spent);
        const won = Number(log.won);

        todayHourlyMap[hourLabel].spentAll += spent;
        todayHourlyMap[hourLabel].wonAll += won;

        const isCase = log.type === "case" || log.type === "cases" || log.type === "open";
        const isUpgrade = log.type === "upgrade" || log.type === "upgrades";

        if (isCase) {
          todayHourlyMap[hourLabel].spentCase += spent;
          todayHourlyMap[hourLabel].wonCase += won;
        } else if (isUpgrade) {
          todayHourlyMap[hourLabel].spentUpgrade += spent;
          todayHourlyMap[hourLabel].wonUpgrade += won;
        }
      }
    });

    const todayStats = hoursList.map(hourLabel => {
      const data = todayHourlyMap[hourLabel];
      const hourNum = parseInt(hourLabel.split(":")[0], 10);
      const currentHour = nowLocal.getUTCHours();

      // Маскируем будущие часы таймзоны клиента как null, чтобы линия графика аккуратно обрывалась на текущем моменте
      const isFutureHour = hourNum > currentHour;

      return {
        hour: hourLabel,
        rtp: isFutureHour ? null : (data.spentAll > 0 ? Math.round((data.wonAll / data.spentAll) * 100) : 0),
        rtpCase: isFutureHour ? null : (data.spentCase > 0 ? Math.round((data.wonCase / data.spentCase) * 100) : 0),
        rtpUpgrade: isFutureHour ? null : (data.spentUpgrade > 0 ? Math.round((data.wonUpgrade / data.spentUpgrade) * 100) : 0)
      };
    });

    // Вычисление интервальных срезов по 30 минут за сегодняшний день
    const intervalMap: Record<string, { spent: number; won: number }> = {};
    const intervalList: string[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      for (const min of [0, 30]) {
        const label = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
        intervalMap[label] = { spent: 0, won: 0 };
        intervalList.push(label);
      }
    }

    todayLogs.forEach(log => {
      const localLogDate = getLocalDate(log.created_at);
      const minGroup = localLogDate.getUTCMinutes() < 30 ? "00" : "30";
      const label = `${String(localLogDate.getUTCHours()).padStart(2, "0")}:${minGroup}`;
      if (intervalMap[label]) {
        intervalMap[label].spent += Number(log.spent);
        intervalMap[label].won += Number(log.won);
      }
    });

    const intervalStats = intervalList.map(label => {
      const [hourStr, minStr] = label.split(":");
      const hourNum = parseInt(hourStr, 10);
      const minNum = parseInt(minStr, 10);
      const currentHour = nowLocal.getUTCHours();
      const currentMin = nowLocal.getUTCMinutes();

      // Маскируем будущие 30-минутные интервалы
      const isFutureInterval = hourNum > currentHour || (hourNum === currentHour && minNum > currentMin);

      const data = intervalMap[label];
      return {
        interval: label,
        rtp: isFutureInterval ? null : (data.spent > 0 ? Math.round((data.won / data.spent) * 100) : 0)
      };
    });

    // Сводка по неделям в таймзоне клиента
    const weeklyMap = new Map<string, {
      spentAll: number; wonAll: number;
      spentCase: number; wonCase: number;
      spentUpgrade: number; wonUpgrade: number;
    }>();

    filteredLogs.forEach(log => {
      const localLogDate = getLocalDate(log.created_at);
      const dateStr = `${localLogDate.getUTCFullYear()}-${String(localLogDate.getUTCMonth() + 1).padStart(2, "0")}-${String(localLogDate.getUTCDate()).padStart(2, "0")}`;
      
      const current = weeklyMap.get(dateStr) || {
        spentAll: 0, wonAll: 0,
        spentCase: 0, wonCase: 0,
        spentUpgrade: 0, wonUpgrade: 0
      };

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

      weeklyMap.set(dateStr, current);
    });

    const weeklyStats = Array.from(weeklyMap.entries())
      .map(([date, data]) => ({
        day: date.split("-").slice(1).reverse().join("."),
        rtp: data.spentAll > 0 ? Math.round((data.wonAll / data.spentAll) * 100) : 0,
        rtpCase: data.spentCase > 0 ? Math.round((data.wonCase / data.spentCase) * 100) : 0,
        rtpUpgrade: data.spentUpgrade > 0 ? Math.round((data.wonUpgrade / data.spentUpgrade) * 100) : 0
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
      const localLogDate = getLocalDate(log.created_at);
      const day = localLogDate.getUTCDay();
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

    // Почасовая статистика за все время
    const hourlyMap: Record<string, {
      spentAll: number; wonAll: number;
      spentCase: number; wonCase: number;
      spentUpgrade: number; wonUpgrade: number;
    }> = {};

    for (let i = 0; i < 24; i++) {
      const label = `${String(i).padStart(2, "0")}:00`;
      hourlyMap[label] = {
        spentAll: 0, wonAll: 0,
        spentCase: 0, wonCase: 0,
        spentUpgrade: 0, wonUpgrade: 0
      };
    }

    filteredLogs.forEach(log => {
      const localLogDate = getLocalDate(log.created_at);
      const hourLabel = `${String(localLogDate.getUTCHours()).padStart(2, "0")}:00`;
      const spent = Number(log.spent);
      const won = Number(log.won);

      if (hourlyMap[hourLabel]) {
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

    const hourlyStats = Object.entries(hourlyMap).map(([hourLabel, data]) => ({
      hour: hourLabel,
      rtp: data.spentAll > 0 ? Math.round((data.wonAll / data.spentAll) * 100) : 0,
      rtpCase: data.spentCase > 0 ? Math.round((data.wonCase / data.spentCase) * 100) : 0,
      rtpUpgrade: data.spentUpgrade > 0 ? Math.round((data.wonUpgrade / data.spentUpgrade) * 100) : 0
    }));

    const liveFeed = filteredLogs.slice(0, 15).map(log => ({
      id: String(log.id),
      timestamp: getLocalDate(log.created_at).toLocaleTimeString("ru-RU", { hour12: false }),
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
      intervalStats
    });

  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}