"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Shield, ArrowUpRight, ArrowDownRight } from "@phosphor-icons/react";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  site: string;
  caseName: string;
  cost: number;
  won: number;
  isProfit: boolean;
  type: string;
}

export default function StreamFeed() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const cacheRef = useRef<string[]>([]);

  useEffect(() => {
    let active = true;
    const fetchLiveLogs = async () => {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok && active) {
          const json = await res.json();
          // Изменено: Ограничиваемся строго максимум 5 самыми свежими записями
          const liveLogs: AuditLog[] = (json.liveFeed || []).slice(0, 5);
          
          if (liveLogs.length > 0) {
            const newIds = liveLogs.map(l => l.id);
            const hasChanges = JSON.stringify(newIds) !== JSON.stringify(cacheRef.current);
            
            if (hasChanges) {
              setLogs(liveLogs);
              cacheRef.current = newIds;
            }
          }
        }
      } catch (err) {
        console.error("Ошибка загрузки живой ленты:", err);
      }
    };

    fetchLiveLogs();
    const interval = setInterval(fetchLiveLogs, 600000); // Опрос раз в 10 минут
    
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col bg-zinc-950/60 border border-zinc-850 p-4 rounded-3xl liquid-glass overflow-hidden gap-4">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-rose-500 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span className="text-[11px] font-mono tracking-wider text-zinc-400 font-bold uppercase">ТЕЛЕМЕТРИЯ АУДИТА (БД LIVE)</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] font-mono text-emerald-400 font-bold">ONLINE</span>
        </div>
      </div>

      {/* Список логов: Высота жестко контролируется адаптивным классом (макс 5 логов) */}
      <div className="flex flex-col gap-3 overflow-y-auto pr-0.5 justify-start adaptive-feed-height">
        <AnimatePresence initial={false} mode="popLayout">
          {logs.map((log) => (
            <motion.div
              key={log.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: "spring", stiffness: 140, damping: 15 }}
              className={`flex flex-col gap-2 p-3.5 rounded-2xl border transition-all duration-300 shrink-0 ${
                log.isProfit 
                  ? "border-emerald-500/30 bg-emerald-500/5 glow-emerald" 
                  : "border-zinc-850 bg-zinc-900/40 hover:border-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Terminal className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="text-zinc-300 font-bold truncate max-w-20">{log.user}</span>
                  <span className="shrink-0">→</span>
                  <span className="text-zinc-400 underline decoration-zinc-700 truncate max-w-22.5">{log.site}</span>
                </div>
                <span className="shrink-0">{log.timestamp}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono mt-1">
                <div className="flex flex-col">
                  <span className="text-zinc-500 text-[9px] uppercase">Объект:</span>
                  <span className="text-zinc-100 font-semibold truncate max-w-37.5">{log.caseName}</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 text-[9px] uppercase">Трата:</span>
                  <span className="text-rose-400 block font-bold font-mono">{log.cost.toFixed(2)} ₽</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1.5 border-t border-zinc-850 pt-1.5 text-xs font-mono">
                <div className="flex flex-col">
                  <span className="text-zinc-500 text-[9px] uppercase">Действие:</span>
                  <span className="text-zinc-400 truncate max-w-37.5 font-medium uppercase text-[10px]">
                    {log.type === "upgrade" ? "КОНТРАКТ АПГРЕЙДА" : "ОТКРЫТИЕ КЕЙСА"}
                  </span>
                </div>
                <div className="text-right flex items-center gap-1">
                  {log.isProfit ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                  )}
                  <span className={`font-bold font-mono ${log.isProfit ? "text-emerald-400" : "text-zinc-400"}`}>
                    {log.won.toFixed(2)} ₽
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-[9px] font-mono mt-1 text-zinc-500 border-t border-dashed border-zinc-800/60 pt-1">
                <span>RTP ОПЕРАЦИИ:</span>
                <span className={log.isProfit ? "text-emerald-400" : "text-rose-400"}>
                  {log.cost > 0 ? Math.round((log.won / log.cost) * 100) : 0}%
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-2 text-[9px] font-mono text-zinc-500 flex items-center gap-1 justify-center border-t border-zinc-850 pt-2 shrink-0">
        <Shield className="w-3 h-3 text-emerald-500" />
        <span>Данные шифруются согласно регламенту защиты</span>
      </div>
    </div>
  );
}