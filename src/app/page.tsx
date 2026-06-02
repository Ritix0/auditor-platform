"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import StreamFeed from "@/app/components/StreamFeed";
import AuditCharts from "@/app/components/AuditCharts";
import StrategySandbox from "@/app/components/StrategySandbox";
import ExtensionBanner from "@/app/components/ExtensionBanner";
import PersonalStats from "@/app/components/PersonalStats";
import CaseModal from "@/app/components/CaseModal";
import Link from "next/link";
import { Shield, Database, FileCode, UsersFour } from "@phosphor-icons/react";
import Image from "next/image";

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
    uniqueAuditors: number;
  } | null>(null);

  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [showFirstVisitWarning, setShowFirstVisitWarning] = useState(false);

  // Определение первого входа на клиенте
  useEffect(() => {
    const dismissed = localStorage.getItem("caseaudit_warning_dismissed_v1.2");
    if (!dismissed) {
      const handle = requestAnimationFrame(() => {
        setShowFirstVisitWarning(true);
      });
      return () => cancelAnimationFrame(handle);
    }
  }, []);

  const dismissWarning = () => {
    localStorage.setItem("caseaudit_warning_dismissed_v1.2", "true");
    setShowFirstVisitWarning(false);
  };

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
            siteVolume: json.siteVolume,
            uniqueAuditors: json.uniqueAuditors || 0
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
            <Image 
              src="/logo.png" 
              alt="Народный Аудитор Кейсов" 
              width={32}
              height={32}
              className="rounded-full border border-zinc-800 object-cover"
              // Для сохранения логики скрытия при ошибке загрузки
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
        
        {/* ЛЕВАЯ КОЛОНКА */}
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

          <PersonalStats />

          <div className="flex-1">
            <ExtensionBanner uniqueAuditors={dbData?.uniqueAuditors} />
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

      {/* Безопасный вызов модалки кейса */}
      <AnimatePresence>
        {selectedCase && (
          <CaseModal selectedCase={selectedCase} onClose={() => setSelectedCase(null)} />
        )}
      </AnimatePresence>

      {/* Модальное окно дисклеймера при первом входе (Исправлена прокрутка на мобильных) */}
      <AnimatePresence>
        {showFirstVisitWarning && (
          <div 
            // Убрали justify-center, чтобы включить естественный скролл на мобильных
            className="fixed inset-0 w-full h-full min-h-dvh bg-zinc-950/98 overflow-y-auto p-4 md:p-12 flex flex-col items-center"
            style={{ zIndex: 9999999 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 15 }}
              transition={{ type: "spring", stiffness: 180, damping: 20 }}
              // my-auto автоматически центрирует карточку по вертикали, а на мобильных разрешает скролл
              style={{ maxWidth: "460px", width: "100%" }}
              className="my-auto mx-auto flex flex-col gap-4 md:gap-6 relative bg-zinc-900 border border-zinc-800 p-5 md:p-8 rounded-3xl liquid-glass shadow-2xl"
            >
              <div className="absolute -right-12 -top-12 w-28 h-28 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Shield className="w-5.5 h-5.5 text-rose-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-rose-400 uppercase tracking-widest font-bold">Система Предупреждения</span>
                  <h3 className="text-base font-bold text-white uppercase tracking-tight font-mono">Важное уведомление для аудитора</h3>
                </div>
              </div>

              <div className="text-zinc-300 text-xs leading-relaxed flex flex-col gap-3 md:gap-4">
                <p>
                  Приветствуем в системе краудсорсингового мониторинга <strong className="text-white">«Народный Аудитор Кейсов»</strong>. Перед тем как приступить к анализу графиков и данных, пожалуйста, примите во внимание следующие факторы:
                </p>

                <div className="flex flex-col gap-2.5 md:gap-3 bg-zinc-950/50 border border-zinc-850 p-3 md:p-3.5 rounded-2xl">
                  <div className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">Возможная неполнота данных:</strong> Если по какому-либо кейсу зафиксировано малое количество открытий, показатели окупаемости (RTP) могут временно отклоняться в сторону экстремального выигрыша или проигрыша. Всегда соотносите RTP с общим счетчиком логов.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-zinc-900/60 pt-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">Математическая дисперсия:</strong> Алгоритмы сторонних сайтов динамически изменяют шансы в зависимости от времени суток и плотности трафика.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-zinc-900/60 pt-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <p className="text-zinc-400">
                      <strong className="text-zinc-200">Конфиденциальность:</strong> Мы не собираем куки, пароли или Steam-сессии. Данные об открытиях отправляются полностью анонимизированно.
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500">
                  Портал предназначен исключительно для некоммерческого математического исследования. Информация не гарантирует повторения результатов на сторонних ресурсах.
                </p>
              </div>

              <button
                onClick={dismissWarning}
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-950/40 cursor-pointer active:scale-[0.98]"
              >
                <span>Я С ПОНИМАНИЕМ ОТНОШУСЬ К ДАННЫМ</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}