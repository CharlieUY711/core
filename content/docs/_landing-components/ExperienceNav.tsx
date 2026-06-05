"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageSwitcher } from "@/components/experience/ui/LanguageSwitcher";
import { useI18n } from "@/lib/experience/i18n-context";

export function ExperienceNav() {
  const [visible, setVisible] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
          style={{
            background: "linear-gradient(to bottom, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.8) 100%)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span className="text-white font-medium tracking-[0.2em] text-sm uppercase">
            CORE
          </span>

          <div className="flex items-center gap-6">
            <LanguageSwitcher />
            <a
              href="#vision"
              className="text-xs font-medium tracking-widest uppercase px-4 py-2 border border-[var(--border-strong)] text-white hover:border-white transition-colors"
            >
              {t.nav.cta}
            </a>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
