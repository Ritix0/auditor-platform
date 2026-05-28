"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
// Заменено Activity на Pulse
import { Terminal, Shield, ArrowUpRight, ArrowDownRight, Pulse } from "@phosphor-icons/react";

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
          const liveLogs: AuditLog[] = (json.liveFeed || []).slice(0, 10);
          
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
    const interval = setInterval(fetchLiveLogs, 600000);
    
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const totalCost = logs.reduce((acc, curr) => acc + curr.cost, 0);
  const totalWon = logs.reduce((acc, curr) => acc + curr.won, 0);
  const avgRtp = totalCost > 0 ? Math.round((totalWon / totalCost) * 100) : 0;

  return (
    <div className="flex flex-col bg-zinc-950/60 border border-zinc-850 p-4 rounded-3xl liquid-glass overflow-hidden gap-4 flex-1 h-full">
      
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

      <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-0.5 justify-start">
        <AnimatePresence initial={false} mode="popLayout">
          {logs.map((log) => {
            const opRtp = log.cost > 0 ? Math.round((log.won / log.cost) * 100) : 0;
            return (
              <motion.div
                key={log.id}
                layout
                initial={{ opacity: 0, y: -15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ type: "spring", stiffness: 140, damping: 15 }}
                className={`flex flex-col gap-1.5 p-3 rounded-2xl border transition-all duration-300 shrink-0 ${
                  log.isProfit 
                    ? "border-emerald-500/30 bg-emerald-500/5 glow-emerald" 
                    : "border-zinc-850 bg-zinc-900/40 hover:border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Terminal className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="text-zinc-300 font-bold truncate max-w-20">{log.user}</span>
                    <span className="shrink-0">→</span>
                    <span className="text-zinc-400 underline decoration-zinc-800 truncate max-w-22.5">{log.site}</span>
                  </div>
                  <span className="shrink-0 font-mono">{log.timestamp}</span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-100 font-semibold truncate max-w-30">{log.caseName}</span>
                    <span className="text-[8px] text-zinc-500 uppercase tracking-wide">
                      {log.type === "upgrade" ? "Апгрейд" : "Кейс"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-right flex flex-col">
                      <span className="text-[8px] text-zinc-500 font-mono">RTP {opRtp}%</span>
                      <span className="text-zinc-400 font-bold font-mono">
                        {log.cost.toFixed(0)} → <span className={log.isProfit ? "text-emerald-400" : "text-zinc-300"}>{log.won.toFixed(0)}</span> ₽
                      </span>
                    </div>
                    {log.isProfit ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    )}
                  </div>
                </div>

              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="mt-auto border-t border-zinc-850 pt-3 flex flex-col gap-2 font-mono text-[10px] shrink-0">
        <div className="flex justify-between text-zinc-500">
          <span className="flex items-center gap-1">
            {/* Использована замененная иконка Pulse */}
            <Pulse className="w-3.5 h-3.5 text-emerald-500" />
            <span>АКТИВНОСТЬ ЛЕНТЫ:</span>
          </span>
          <span className="text-emerald-400 font-bold uppercase tracking-wider animate-pulse">ОТЛИЧНАЯ</span>
        </div>
        <div className="flex justify-between text-zinc-500">
          <span>ЛИЧНЫХ ЛОГОВ В ЛЕНТЕ:</span>
          <span className="text-zinc-300 font-bold">
            {logs.filter(l => l.user.startsWith("ID:")).length}
          </span>
        </div>
        <div className="flex justify-between text-zinc-500">
          <span>СРЕДНИЙ RTP ЛЕНТЫ ({logs.length} ШТ):</span>
          <span className={`font-bold ${avgRtp > 45 ? "text-emerald-400" : "text-rose-500"}`}>
            {avgRtp}%
          </span>
        </div>
      </div>

      <div className="text-[9px] font-mono text-zinc-500 flex items-center gap-1 justify-center border-t border-zinc-850 pt-2 shrink-0">
        <Shield className="w-3 h-3 text-emerald-500" />
        <span>Данные шифруются согласно регламенту защиты</span>
      </div>

    </div>
  );
}
