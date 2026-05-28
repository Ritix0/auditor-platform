"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, EyeClosed } from "@phosphor-icons/react";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <main className="min-h-dvh bg-zinc-950 grid-mesh py-16 px-6 relative">
      <div className="absolute top-1/4 left-1/4 w-120 h-120 rounded-full bg-rose-950/5 blur-[120px] pointer-events-none" />
      
      <div className="max-w-3xl mx-auto flex flex-col gap-10 relative z-10">
        
        <button
          onClick={() => router.push("/")}
          className="self-start flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-mono transition-all active:scale-[0.98] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Вернуться на главную</span>
        </button>

        <div className="border-b border-zinc-850 pb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-500 font-mono text-[10px] font-bold uppercase tracking-wider">
            <EyeClosed className="w-4.5 h-4.5" />
            <span>Конфиденциальность данных</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">
            Политика конфиденциальности
          </h1>
          <span className="text-[10px] font-mono text-zinc-500">
            ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ: 28 МАЯ 2026 Г. / ВЕРСИЯ 1.2.0
          </span>
        </div>

        <div className="bg-emerald-950/10 border border-emerald-900/30 p-5 rounded-2xl flex items-start gap-3">
          <ShieldCheck className="w-5.5 h-5.5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-200 leading-relaxed flex flex-col gap-1">
            <span className="font-bold uppercase font-mono text-[10px] text-white">ГАРАНТИЯ 100% АНОНИМНОСТИ:</span>
            <p>
              Наш краудсорсинговый модуль спроектирован так, чтобы физически исключить сбор любых личных или идентифицирующих данных. Расширение не имеет доступа к вашей истории браузера, куки-файлам, паролям или сессиям Steam. Мы собираем исключительно сухие математические цифры транзакций.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-8 text-zinc-300 text-sm leading-relaxed font-sans">
          
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              1. Общие положения
            </h3>
            <p>
              Настоящая Политика конфиденциальности определяет порядок сбора, хранения и обработки информации, получаемой от пользователей в процессе использования расширения и веб-портала «Народный Аудитор Кейсов» (далее — «Платформа»).
            </p>
            <p>
              Мы строго следуем регламентам защиты персональных данных Европейского Союза (GDPR) и законодательству Российской Федерации (ФЗ-152 «О персональных данных»). Primary-серверы нашего шлюза находятся на территории РФ, что гарантирует соответствие требованиям локализации данных.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              2. Какие данные мы собираем
            </h3>
            <p>
              Мы собираем исключительно сухие математические и технические данные транзакций, необходимые для вычисления RTP и построения графиков окупаемости. К ним относятся:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-zinc-400 text-xs">
              <li>Системный идентификатор площадки (например, `case-battle` или `easydrop`);</li>
              <li>Тип операции (открытие кейса или проведение апгрейда);</li>
              <li>Название кейса;</li>
              <li>Сумма затраченных средств (в рублях);</li>
              <li>Сумма стоимости выпавшего выигрыша (в рублях);</li>
              <li>Математический RTP данной конкретной операции;</li>
              <li>Ваш локальный идентификатор пользователя на конкретном сайте (если вы вручную указали его в попапе расширения).</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              3. Какие данные мы категорически НЕ собираем
            </h3>
            <p>
              Наш код прошел независимый аудит и гарантирует отсутствие сбора следующей информации:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-zinc-400 text-xs">
              <li>Логины, пароли, мобильные аутентификаторы (Steam Guard) или API-ключи Steam;</li>
              <li>Платежные реквизиты, номера карт, электронные кошельки;</li>
              <li>История посещения других сайтов (расширение запускается строго на трех разрешенных доменах);</li>
              <li>Ваши IP-адреса (они отсекаются на уровне прокси-шлюза Cloudflare и не сохраняются в базу данных Supabase).</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              4. Цели обработки данных
            </h3>
            <p>
              Все собираемые данные агрегируются и усредняются. Мы используем их для:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-zinc-400 text-xs">
              <li>Построения общих недельных и суточных графиков RTP для разоблачения мошеннических алгоритмов;</li>
              <li>Предоставления вам вашей личной статистики окупаемости (при указании вашего ID);</li>
              <li>Моделирования вероятности выигрыша в симуляторе стратегий.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              5. Безопасность и защита данных
            </h3>
            <p>
              Все данные передаются в зашифрованном виде (SSL/TLS) на наш шлюз Cloudflare и записываются в защищенную базу данных Supabase PostgreSQL, закрытую жесткими политиками RLS (Row Level Security). Платформа не передает собранную информацию третьим лицам и не использует её в коммерческих целях.
            </p>
          </section>

        </div>

        <div className="border-t border-zinc-850 pt-6 flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>GDPR & FZ-152 COMPLIANCE GUARANTEED</span>
          </div>
          <span>SECURE GATEWAY ENCRYPTION</span>
        </div>

      </div>
    </main>
  );
}