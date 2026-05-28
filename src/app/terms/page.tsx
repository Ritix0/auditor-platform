"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Warning, Scales } from "@phosphor-icons/react";

export default function TermsPage() {
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
            <Scales className="w-4.5 h-4.5" />
            <span>Юридический регламент</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">
            Пользовательское соглашение
          </h1>
          <span className="text-[10px] font-mono text-zinc-500">
            ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ: 28 МАЯ 2026 Г. / ВЕРСИЯ 1.2.0
          </span>
        </div>

        <div className="bg-rose-950/10 border border-rose-900/30 p-5 rounded-2xl flex items-start gap-3">
          <Warning className="w-5.5 h-5.5 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-200 leading-relaxed flex flex-col gap-1">
            <span className="font-bold uppercase font-mono text-[10px] text-white">ВАЖНОЕ ПРАВОВОЕ УВЕДОМЛЕНИЕ:</span>
            <p>
              Проект «Народный Аудитор Кейсов» является независимой аналитической платформой и SaaS-сервисом децентрализованного мониторинга. Мы категорически не пропагандируем, не организуем, не проводим азартные игры на деньги и не принимаем платежи в пользу игорных ресурсов. Платформа создана в научно-образовательных целях для выявления манипуляций вероятностями.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-8 text-zinc-300 text-sm leading-relaxed font-sans">
          
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              1. Общие положения
            </h3>
            <p>
              Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует порядок использования аналитического веб-портала и легковесного браузерного расширения «Народный Аудитор Кейсов» (далее — «Платформа»).
            </p>
            <p>
              Используя Платформу, устанавливая расширение, оформляя профессиональную подписку PRO-MOD или просматривая собранную статистику, вы безоговорочно соглашаетесь с условиями настоящего Соглашения. Если вы не согласны с какими-либо пунктами, вы обязаны немедленно прекратить использование Платформы и удалить расширение.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              2. Статус платформы и отказ от ответственности
            </h3>
            <p>
              Платформа предоставляет сухую математическую и статистическую информацию, собранную методом краудсорсинга (добровольного объединения данных реальных пользователей).
            </p>
            <p>
              Вся аналитическая информация, симуляции, показатели RTP (Return to Player) и математические ожидания носят справочно-информационный характер. Платформа не гарантирует выигрыш или возврат средств на сторонних сайтах и не несет никакой ответственности за любые финансовые убытки, понесенные пользователями на сторонних ресурсах.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              3. Правила использования краудсорсингового модуля (Расширения)
            </h3>
            <p>
              Устанавливая расширение, вы соглашаетесь с тем, что оно будет в автоматическом и полностью анонимном режиме отправлять на наш защищенный шлюз математические параметры ваших транзакций (затраты на открытие, выпавший выигрыш, тип операции и название кейса) на поддерживаемых сайтах.
            </p>
            <p>
              Категорически запрещается осуществлять попытки взлома шлюза, отправлять ложные, сфальсифицированные или искусственно сгенерированные транзакции с целью искажения глобальной статистики RTP. Любые подобные действия будут автоматически блокироваться на уровне шлюза безопасности Cloudflare.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              4. Открытый исходный код и лицензирование
            </h3>
            <p>
              Исходный код браузерного расширения и веб-платформы является полностью открытым, верифицированным и распространяется под свободной лицензией MIT. Вы имеете право проводить независимый аудит безопасности нашего кода в репозитории GitHub.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              5. Изменение условий
            </h3>
            <p>
              Администрация Платформы оставляет за собой право в одностороннем порядке изменять условия настоящего Соглашения в любой момент без предварительного уведомления пользователей. Актуальная версия Соглашения всегда доступна на этой странице.
            </p>
          </section>

        </div>

        <div className="border-t border-zinc-850 pt-6 flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>CASEAUDIT COMPLIANCE SECURED</span>
          </div>
          <span>MIT LICENSE PROTOCOL</span>
        </div>

      </div>
    </main>
  );
}