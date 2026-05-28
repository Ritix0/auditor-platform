"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { DownloadSimple, Cpu, Users, Code, PaperPlaneTilt } from "@phosphor-icons/react";

interface ExtensionBannerProps {
  uniqueAuditors?: number; // Принимаем реальное число свыше из родителя
}

export default function ExtensionBanner({ uniqueAuditors }: ExtensionBannerProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative bg-zinc-950/60 border border-zinc-850 p-5 rounded-3xl liquid-glass overflow-hidden flex flex-col justify-between h-full glow-rose gap-5">
      <div className="absolute inset-0 grid-mesh opacity-10 pointer-events-none" />
      <div className="absolute -right-20 -top-20 w-44 h-44 rounded-full bg-rose-500/5 blur-[60px] pointer-events-none" />

      {/* ШАПКА БАННЕРА */}
      <div className="relative z-10 flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-rose-500 animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400">КРАУДСОРСИНГОВЫЙ МОДУЛЬ</span>
        </div>

        <h3 className="text-xl font-bold text-zinc-100 tracking-tight leading-snug">
          Анонимный аудит из вашего браузера
        </h3>

        <p className="text-zinc-400 text-xs leading-relaxed">
          Установите легковесное расширение. Оно работает абсолютно незаметно в фоновом режиме, фиксируя реальный математический результат выпадения скинов.
        </p>
      </div>

      {/* ЦЕНТРАЛЬНЫЙ БЛОК: QR-КОД */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-3 shrink-0">
        <div 
          className="bg-white border border-zinc-200 rounded-2xl relative overflow-hidden p-1.5 shadow-[0_8px_30px_rgba(255,255,255,0.08)] mx-auto flex items-center justify-center shrink-0"
          style={{ width: "160px", height: "160px", minWidth: "160px", minHeight: "160px" }}
        >
          {!imageError ? (
            <img 
              src="/tg-qr.png" 
              alt="Telegram QR Protocol" 
              className="absolute inset-0 w-full h-full object-contain rounded-xl block p-1"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-center p-4 gap-2">
              <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-rose-500/80" />
              <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-rose-500/80" />
              <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-rose-500/80" />
              <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-rose-500/80" />
              <PaperPlaneTilt className="w-6 h-6 text-blue-400 animate-pulse" />
              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Аудит в Telegram</span>
            </div>
          )}
        </div>

        <div className="text-center flex flex-col gap-1">
          <p className="text-[10px] text-zinc-400 leading-normal max-w-[210px] mx-auto">
            Наведите камеру смартфона на QR-код для мгновенного перехода в официальный канал:
          </p>
          <a 
            href="https://t.me/caseaudit_protocol" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs font-mono font-bold text-blue-400 hover:text-blue-300 underline tracking-tight"
          >
            t.me/caseaudit_protocol
          </a>
        </div>
      </div>

      {/* НИЖНЯЯ ЧАСТЬ И КНОПКА СКАЧИВАНИЯ */}
      <div className="relative z-10 flex flex-col gap-3 shrink-0">
        <div className="flex flex-wrap gap-1 text-[9px] font-mono text-zinc-500 justify-center">
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">CHROME</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-850">FIREFOX</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-850">OPERA</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-850">EDGE</span>
        </div>

        <motion.a
          href="https://github.com/Ritix0/caseaudit-extension/releases/download/v1.2.0/auditor-extension.zip"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
          className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-mono font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-950/40 cursor-pointer"
        >
          <DownloadSimple className="w-4 h-4 animate-bounce" />
          <span>СКАЧАТЬ РАСШИРЕНИЕ</span>
        </motion.a>

        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 border-t border-zinc-850 pt-3 mt-1">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span>Аудиторов в сети:</span>
          </div>
          <span className="font-bold text-zinc-300 font-mono">
            {uniqueAuditors !== undefined ? uniqueAuditors.toLocaleString("ru-RU") : "..."}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-1">
            <Code className="w-3.5 h-3.5 text-zinc-400" />
            <span>Исходный код:</span>
          </div>
          <a 
            href="https://github.com/Ritix0/caseaudit-extension" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-zinc-400 hover:text-white underline"
          >
            GitHub Repo
          </a>
        </div>
      </div>

    </div>
  );
}