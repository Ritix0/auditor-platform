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

    // 2. ОБНОВЛЕНИЕ ГЛОБАЛЬНОГО КЭША (Сырые логи)
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

    // 4. СТАНДАРТНАЯ ФИЛЬТРАЦИЯ ГЛОБАЛЬНЫХ ЛОГОВ ПО ПЛОЩАДКАМ
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

    // Возвращаем абсолютно сырые логи. Браузер сам произведет все расчеты шкал.
    return NextResponse.json({
      success: true,
      totalAudited: filteredLogs.length,
      globalRtp,
      siteVolume,
      liveFeed,
      uniqueAuditors: uniqueAuditorsCount,
      rawLogs: filteredLogs
    });

  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}