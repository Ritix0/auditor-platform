"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MagnifyingGlass, User, ShieldCheck, ArrowUpRight, ArrowDownRight, Clock } from "@phosphor-icons/react";

interface UserRecentLog {
  id: string;
  timestamp: string;
  site: string;
  caseName: string;
  cost: number;
  won: number;
  isProfit: boolean;
}

interface UserStats {
  totalSpent: number;
  totalWon: number;
  casesCount: number;
  upgradesCount: number;
  rtp: number;
  recentLogs: UserRecentLog[];
}

export default function PersonalStats() {
  const [userIdInput, setUserIdInput] = useState("");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0); // Таймер обратного отсчета (в секундах)
  const [errorText, setErrorText] = useState("");

  // Таймер обратного отсчета для защиты от спама
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = userIdInput.trim();
    if (!id) return;

    if (cooldown > 0) {
      setErrorText(`Превышен лимит запросов. Повторное обновление базы будет доступно через ${Math.ceil(cooldown / 60)} мин.`);
      return;
    }

    setLoading(true);
    setErrorText("");
    setStats(null);

    try {
      const res = await fetch(`/api/analytics?user_id=${encodeURIComponent(id)}`);
      if (res.ok) {
        const json = await res.json();
        
        if (json.cooldownRemaining && json.cooldownRemaining > 0) {
          setCooldown(json.cooldownRemaining);
        }

        if (json.casesCount === 0 && json.upgradesCount === 0) {
          setErrorText("В базе данных пока нет залогированных транзакций для этого ID.");
        } else {
          setStats({
            totalSpent: json.totalSpent,
            totalWon: json.totalWon,
            casesCount: json.casesCount,
            upgradesCount: json.upgradesCount,
            rtp: json.rtp,
            recentLogs: json.recentLogs || []
          });
        }
      } else {
        throw new Error();
      }
    } catch {
      setErrorText("Не удалось получить личную статистику. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  const getCooldownText = () => {
    const min = Math.floor(cooldown / 60);
    const sec = cooldown % 60;
    return `${min}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="bg-zinc-950/60 border border-zinc-850 p-6 rounded-3xl liquid-glass flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <User className="w-5 h-5 text-rose-500 animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">ПЕРСОНАЛЬНЫЙ КАБИНЕТ АУДИТОРА</span>
      </div>

      <h3 className="text-xl font-bold text-zinc-100 tracking-tight leading-snug">
        Ваша личная статистика
      </h3>

      <p className="text-zinc-400 text-xs leading-relaxed">
        Введите ваш уникальный ID, скопированный из профиля или адресной строки поддерживаемых сайтов, для вывода личной истории аудита.
      </p>

      {/* ФОРМА ПОИСКА */}
      <form onSubmit={handleSearch} className="flex gap-2 mt-1">
        <input
          type="text"
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          placeholder="Введите ваш ID (SteamID или локальный)..."
          className="flex-1 bg-zinc-950 border border-zinc-850 text-xs font-mono p-2.5 rounded-xl text-zinc-200 focus:outline-none focus:border-rose-500 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !userIdInput.trim()}
          className="px-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-zinc-500/30 border-t-zinc-300 rounded-full animate-spin" />
          ) : (
            <MagnifyingGlass className="w-4 h-4" />
          )}
        </button>
      </form>

      {/* ОШИБКИ И ПРЕДУПРЕЖДЕНИЯ */}
      {errorText && (
        <span className="text-[10px] font-mono text-amber-500 leading-normal bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg">
          {errorText}
        </span>
      )}

      {/* ОТОБРАЖЕНИЕ ЛИЧНЫХ ДАННЫХ */}
      <AnimatePresence mode="popLayout">
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-4 border-t border-zinc-850 pt-4 mt-1"
          >
            <div className="grid grid-cols-3 gap-3 font-mono text-center">
              <div className="bg-zinc-900/30 border border-zinc-850 p-2.5 rounded-xl flex flex-col gap-0.5">
                <span className="text-[8px] text-zinc-500 uppercase">Попыток:</span>
                <span className="text-xs font-bold text-zinc-300">{stats.casesCount + stats.upgradesCount}</span>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-850 p-2.5 rounded-xl flex flex-col gap-0.5">
                <span className="text-[8px] text-zinc-500 uppercase">Бюджет:</span>
                <span className="text-xs font-bold text-zinc-300">{stats.totalSpent.toFixed(0)} ₽</span>
              </div>
              <div className="bg-rose-950/20 border border-rose-900/40 p-2.5 rounded-xl flex flex-col gap-0.5">
                <span className="text-[8px] text-rose-400 uppercase">Ваш RTP:</span>
                <span className={`text-xs font-bold ${stats.rtp > 45 ? "text-emerald-400" : "text-rose-500"}`}>{stats.rtp}%</span>
              </div>
            </div>

            {/* МИНИ-ТЕРМИНАЛ ЛОГОВ ПОЛЬЗОВАТЕЛЯ */}
            {stats.recentLogs.length > 0 && (
              <div className="flex flex-col gap-2 bg-zinc-900/40 border border-zinc-850 p-3 rounded-2xl">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Последний личный дроп:</span>
                <div className="flex flex-col gap-2 font-mono text-[10px]">
                  {stats.recentLogs.map((log, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-zinc-900/50 pb-1.5 last:border-0 last:pb-0">
                      <div className="flex flex-col">
                        <span className="text-zinc-300 font-bold truncate max-w-[120px]">{log.caseName}</span>
                        <span className="text-[8px] text-zinc-500 uppercase">{log.site}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-500">+{log.won.toFixed(0)} ₽</span>
                        {log.isProfit ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Защитный Кулдаун-Таймер */}
            {cooldown > 0 && (
              <div className="flex items-center gap-2 justify-center text-[10px] font-mono text-zinc-500 bg-zinc-900/50 border border-zinc-850 p-2 rounded-xl">
                <Clock className="w-4 h-4 text-rose-500" />
                <span>Кулдаун обновления БД: <strong className="text-rose-400 font-mono">{getCooldownText()}</strong></span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1.5 justify-center text-[9px] font-mono text-zinc-600 border-t border-zinc-850 pt-3">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Запросы к базе данных ограничены 30 минутами</span>
      </div>
    </div>
  );
}