"use client";

import React, { useState } from "react";
import { Lock, Sparkle, ShieldCheck } from "@phosphor-icons/react";

interface Step {
  id: string;
  type: "open" | "upgrade";
  param: string;
  cost: number;
}

export default function StrategySandbox() {
  // Статичные демонстрационные шаги для красивого размытого заднего фона
  const [steps] = useState<Step[]>([
    { id: "s1", type: "open", param: "Кейс Нож (x1)", cost: 450 },
    { id: "s2", type: "upgrade", param: "Апгрейд 40% шанс", cost: 150 },
  ]);

  return (
    <div className="bg-zinc-950/40 border border-zinc-850 p-5 rounded-3xl liquid-glass flex flex-col gap-5 h-full relative overflow-hidden">
      
      {/* ШАПКА СИМУЛЯТОРА (ОСТАЕТСЯ АКТИВНОЙ И ЧИТАЕМОЙ) */}
      <div className="border-b border-zinc-850 pb-3 flex justify-between items-center">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">СИМУЛЯТОР СТРАТЕГИЙ</span>
          <h3 className="text-sm font-bold text-zinc-100 mt-0.5">Песочница цепочек кейсов и апгрейдов</h3>
        </div>
        <span className="text-[9px] px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono uppercase font-bold">
          PRO-MOD
        </span>
      </div>

      <p className="text-zinc-400 text-[11px] leading-relaxed">
        Спроектируйте последовательность действий на кейс-сайте. Система смоделирует ее прохождение на основе исторического массива логов из расширения.
      </p>

      {/* ФУНКЦИОНАЛЬНЫЙ БЛОК (ПОЛНОСТЬЮ ЗАБЛЮРЕН И ПЕРЕКРЫТ) */}
      <div className="relative flex-1 flex flex-col gap-4 mt-1">
        
        {/* ЗАБЛЮРЕННЫЙ ФОНОВЫЙ КОНТЕНТ */}
        <div className="flex-1 flex flex-col gap-3 blur-md pointer-events-none select-none opacity-25">
          <div className="flex flex-col gap-3 max-h-47.5 overflow-hidden">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-850 p-2.5 rounded-xl"
              >
                <span className="text-[10px] font-mono text-zinc-600 font-bold w-5">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <select
                  disabled
                  value={step.type}
                  className="bg-zinc-950 border border-zinc-850 text-[11px] font-mono p-1 rounded text-zinc-300 focus:outline-none"
                >
                  <option value="open">КЕЙС</option>
                  <option value="upgrade">АПГРЕЙД</option>
                </select>

                <input
                  disabled
                  type="text"
                  value={step.param}
                  className="flex-1 min-w-15 bg-zinc-950 border border-zinc-850 text-[11px] font-mono p-1.5 rounded text-zinc-200"
                />

                <div className="flex items-center gap-1.5">
                  <input
                    disabled
                    type="number"
                    value={step.cost}
                    className="w-16 bg-zinc-950 border border-zinc-850 text-[11px] font-mono p-1.5 rounded text-rose-400 text-right"
                  />
                  <span className="text-[9px] font-mono text-zinc-600 font-bold">₽</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-850 pt-4 flex flex-col gap-3.5">
            <button disabled className="w-full py-2.5 bg-rose-500 text-white font-mono text-xs font-bold rounded-xl">
              Запустить симуляцию на БД
            </button>
          </div>
        </div>

        {/* ПРЕМИАЛЬНЫЙ СТИЛЬНЫЙ ЗАМОК АКТИВАЦИИ (Z-INDEX OVERLAY) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-20">
          <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl liquid-glass max-w-xs flex flex-col items-center gap-3 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest font-bold flex items-center justify-center gap-1">
                <Sparkle className="w-3 h-3 text-amber-400" />
                <span>PRO-ФУНКЦИОНАЛ</span>
              </span>
              <h4 className="text-xs font-bold text-white uppercase tracking-tight">Песочница закрыта</h4>
            </div>
            
            <p className="text-[10px] text-zinc-400 leading-normal">
              Математический просчет окупаемости сложных цепочек и стратегий на миллионах логов доступен по подписке «Народный Аудитор».
            </p>
            
            <button className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold rounded-lg transition-all active:scale-[0.98] cursor-pointer">
              Скоро появится
            </button>
          </div>
        </div>

      </div>

      {/* СИСТЕМНАЯ СНОСКА (ОСТАЕТСЯ АКТИВНОЙ) */}
      <div className="flex items-center gap-1.5 justify-center text-[9px] font-mono text-zinc-600 border-t border-zinc-850 pt-3">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Синхронизировано со взвешенным RTP базы Supabase</span>
      </div>

    </div>
  );
}