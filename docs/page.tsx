import { I18nProvider } from "@/lib/experience/i18n-context";
import { ExperienceNav } from "@/components/experience/ExperienceNav";
import { HeroSection } from "@/components/experience/sections/HeroSection";
import { FragmentationSection } from "@/components/experience/sections/FragmentationSection";
import { WhatIfSection } from "@/components/experience/sections/WhatIfSection";
import { DifferenceSection } from "@/components/experience/sections/DifferenceSection";
import { VisionSection } from "@/components/experience/sections/VisionSection";

export default function Home() {
  return (
    <I18nProvider>
      <main style={{ background: "var(--void)" }}>
        <ExperienceNav />
        <HeroSection />
        <FragmentationSection />
        <WhatIfSection />
        <DifferenceSection />
        <VisionSection />
      </main>
    </I18nProvider>
  );
}
