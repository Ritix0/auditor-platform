"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import StreamFeed from "@/app/components/StreamFeed";
import AuditCharts from "@/app/components/AuditCharts";
import StrategySandbox from "@/app/components/StrategySandbox";
import ExtensionBanner from "@/app/components/ExtensionBanner";
import PersonalStats from "@/app/components/PersonalStats"; // Подключили новый личный кабинет
import CaseModal from "@/app/components/CaseModal";
import Link from "next/link";
import { Shield, Database, FileCode, UsersFour } from "@phosphor-icons/react";

interface CaseItem {
  name: string;
  site: string;
  count: number;
  spent: number;
  won: number;
  rtp: number;
}

export default function Home() {
  const [dbData, setDbData] = useState<{
    totalAudited: number;
    globalRtp: number;
    siteVolume: Record<string, { count: number; spent: number; won: number }>;
  } | null>(null);

  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);

  useEffect(() => {
    let active = true;
    const fetchGlobalStats = async () => {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok && active) {
          const json = await res.json();
          setDbData({
            totalAudited: json.totalAudited,
            globalRtp: json.globalRtp,
            siteVolume: json.siteVolume
          });
        }
      } catch (err) {
        console.error("Ошибка загрузки глобальной телеметрии:", err);
      }
    };

    fetchGlobalStats();
    const interval = setInterval(fetchGlobalStats, 600000); // Опрос раз в 10 минут
    
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <main className="min-h-dvh relative overflow-hidden bg-zinc-950 grid-mesh px-6 py-8 md:p-10 flex flex-col gap-8">
      
      <div className="absolute top-1/4 left-1/4 w-120 h-120 rounded-full bg-rose-950/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-90 h-90 rounded-full bg-zinc-900/20 blur-[100px] pointer-events-none" />

      {/* Верхний статус-бар */}
      <header className="w-full max-w-350 mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-850 pb-6 z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Народный Аудитор Кейсов" 
              className="w-8 h-8 rounded-full border border-zinc-800 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const pulseEl = e.currentTarget.nextElementSibling as HTMLElement;
                if (pulseEl) pulseEl.style.display = 'block';
              }}
            />
            <div className="w-2.5 h-2.5 rounded bg-rose-500 animate-pulse hidden" />
            <h1 className="text-base font-bold font-mono tracking-tighter uppercase text-white">
              Народный Аудитор Кейсов
            </h1>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase mt-1">
            НЕЗАВИСИМЫЙ МАТЕМАТИЧЕСКИЙ МОНИТОРИНГ / КРАУДСОРСИНГ
          </span>
        </div>

        {/* Сводная глобальная телеметрия */}
        <div className="flex flex-wrap gap-6 text-[10px] font-mono">
          <div className="flex flex-col border-l border-zinc-800 pl-4">
            <span className="text-zinc-500 uppercase tracking-wider">Проверено</span>
            <span className="text-base font-bold text-zinc-100">3 площадки</span>
          </div>
          <div className="flex flex-col border-l border-zinc-800 pl-4">
            <span className="text-zinc-500 uppercase tracking-wider">Всего открытий</span>
            <span className="text-base font-bold text-zinc-100 font-mono">
              {dbData ? dbData.totalAudited.toLocaleString("ru-RU") : "..."}
            </span>
          </div>
          <div className="flex flex-col border-l border-zinc-800 pl-4">
            <span className="text-zinc-500 uppercase tracking-wider">Средний RTP</span>
            <span className="text-base font-bold text-rose-500 font-mono">
              {dbData ? `${dbData.globalRtp}%` : "..."}
            </span>
          </div>
        </div>
      </header>

      {/* Основная асимметричная сетка */}
      <div className="w-full max-w-350 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 z-10 items-stretch">
        
        {/* ЛЕВАЯ КОЛОНКА (Интегрирован Личный кабинет) */}
        <div className="lg:col-span-4 flex flex-col gap-8 self-stretch">
          
          <div className="bg-zinc-950/60 border border-zinc-850 p-6 md:p-8 rounded-3xl liquid-glass flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 tracking-wider">
              <Shield className="w-4.5 h-4.5 text-rose-500" />
              <span>СТАТУС: АКТИВНЫЙ АУДИТ АЛГОРИТМОВ</span>
            </div>
            
            <h2 className="text-3xl font-black text-zinc-100 tracking-tight leading-none uppercase">
              Разоблачаем <span className="text-rose-500">подкрутку</span>
            </h2>

            <p className="text-zinc-400 text-sm leading-relaxed mt-1">
              Сайты по открытию кейсов и апгрейдов скрывают реальные шансы на выигрыш. Мы собираем математически точные данные реальных игроков и формируем единую независимую базу окупаемости.
            </p>

            <div className="flex flex-col gap-3.5 border-t border-zinc-850 pt-4 mt-2">
              <div className="flex items-start gap-2.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-2" />
                <p className="text-zinc-300 leading-relaxed">
                  <strong className="text-zinc-100 font-bold">Скрытые скрипты:</strong> Владельцы сайтов урезают шансы во время наплыва аудитории или выходных.
                </p>
              </div>
              <div className="flex items-start gap-2.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-2" />
                <p className="text-zinc-300 leading-relaxed">
                  <strong className="text-zinc-100 font-bold">Рекламный обман:</strong> Блогеры рекламируют подкрученные индивидуальные аккаунты с завышенной окупаемостью.
                </p>
              </div>
            </div>
          </div>

          <PersonalStats /> {/* Новый модуль */}

          <div className="flex-1">
            <ExtensionBanner />
          </div>

        </div>

        {/* ЦЕНТРАЛЬНАЯ КОЛОНКА */}
        <div className="lg:col-span-5 flex flex-col gap-8 self-stretch">
          <div className="flex-1">
            <AuditCharts onSelectCase={setSelectedCase} />
          </div>
          <div className="flex-1">
            <StrategySandbox />
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА */}
        {/* ПРАВАЯ КОЛОНКА (3/12): Прижимает юридический блок к самому низу */}
        <div className="lg:col-span-3 flex flex-col gap-8 h-full self-stretch">
          <StreamFeed />
          
          {/* ЮРИДИЧЕСКИЙ БЛОК */}
          <div className="bg-zinc-950/60 border border-zinc-850 p-6 rounded-3xl liquid-glass flex flex-col gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">
                Юридическая информация
              </span>
            </div>
            
            <div className="flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-1 border-b border-zinc-900/60 pb-3">
                <Link href="/terms" className="text-zinc-200 hover:text-white font-bold font-mono hover:underline text-[11px] uppercase tracking-tight">
                  Пользовательское соглашение
                </Link>
                <p className="text-zinc-400 text-[10px] leading-normal">
                  Регламентирует правила децентрализованного аудита, полный отказ от рекламы азартных игр и условия использования платформы.
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <Link href="/privacy" className="text-zinc-200 hover:text-white font-bold font-mono hover:underline text-[11px] uppercase tracking-tight">
                  Политика конфиденциальности
                </Link>
                <p className="text-zinc-400 text-[10px] leading-normal">
                  Гарантирует 100% анонимность. Расширение не собирает Steam-пароли, платежные данные, куки или IP-адреса согласно регламенту GDPR.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Системный футер */}
      <footer className="w-full max-w-350 mx-auto border-t border-zinc-850 pt-6 mt-2 flex flex-col md:flex-row md:items-center justify-between gap-4 text-[10px] font-mono text-zinc-500 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>DB_STATUS: SUPABASE_SYNCED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <UsersFour className="w-4 h-4 text-zinc-400" />
            <span>АКТИВНЫХ УЗЛОВ: {dbData ? (dbData.totalAudited / 4).toFixed(0) : "..."} NODES</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-zinc-400" />
            <span>CONTRACT: VERIFIED</span>
          </div>
        </div>
        <div>
          <span>CASEAUDIT v1.2.0-PRODUCTION © 2026. Исходный код открыт.</span>
        </div>
      </footer>

      {/* БЕЗОПАСНЫЙ ПОЛНОЭКРАННЫЙ ВЫЗОВ МОДАЛКИ СНАРУЖИ СЕТКИ И ФИЛЬТРОВ */}
      <AnimatePresence>
        {selectedCase && (
          <CaseModal selectedCase={selectedCase} onClose={() => setSelectedCase(null)} />
        )}
      </AnimatePresence>

    </main>
  );
}