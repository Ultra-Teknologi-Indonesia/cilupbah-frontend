"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

const EASE = [0.32, 0.72, 0, 1] as const;

export default function Home() {
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.1, delayChildren: 0.05 },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: EASE },
    },
  };

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background font-sans">
      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center gap-2.5 px-6 pt-8 sm:px-10">
        <Image
          src="/logo-mark.png"
          alt="Cilupbah Superapp"
          width={32}
          height={32}
          priority
          className="size-8 rounded-xl shadow-xs"
        />
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Cilupbah Superapp
        </span>
      </div>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 pb-16 text-center sm:px-6 sm:pb-24">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex w-full flex-col items-center"
        >
          <motion.span
            variants={item}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:tracking-[0.2em]"
          >
            Sistem Manajemen Gudang Omnichannel
          </motion.span>

          <motion.h1
            variants={item}
            className="mt-6 text-[2rem] font-semibold leading-[1.08] tracking-tight text-foreground sm:mt-7 sm:text-5xl sm:leading-[1.05] lg:text-6xl"
          >
            Selamat datang di Cilupbah Superapp.
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg sm:text-balance"
          >
            Satu tempat untuk mengelola stok, produk, dan pesanan gudang Anda,
            tersinkronisasi otomatis dan siap dijalankan.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-9 w-full sm:mt-10 sm:w-auto"
          >
            <Link
              href="/login"
              className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-primary py-2.5 pl-6 pr-2.5 text-base font-medium text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary/90 active:scale-[0.98] sm:w-auto sm:py-2 sm:pr-2"
            >
              Masuk
              <span className="flex size-9 items-center justify-center rounded-full bg-primary-foreground/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                <ArrowRight className="size-4" />
              </span>
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}
