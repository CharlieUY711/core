"use client";
import { I18nProvider } from "@/lib/experience/i18n-context";
import { ExperienceNav } from "@/components/experience/ExperienceNav";
import { HeroSection } from "@/components/experience/sections/HeroSection";
import { FragmentationSection } from "@/components/experience/sections/FragmentationSection";
import { WhatIfSection } from "@/components/experience/sections/WhatIfSection";
import { DifferenceSection } from "@/components/experience/sections/DifferenceSection";
import { GlobalSection } from "@/components/experience/sections/GlobalSection";
import { VisionSection } from "@/components/experience/sections/VisionSection";
import { GlosarioSection } from "@/components/experience/sections/GlosarioSection";

export default function Home() {
  return (
    <I18nProvider>
      <div style={{ background: "#0A1F3D", minHeight: "100vh", width: "100%" }}>
        <ExperienceNav />
        <main style={{ width: "100%", paddingTop: "90px" }}>
          <HeroSection />
          <FragmentationSection />
          <WhatIfSection />
          <DifferenceSection />
          <GlobalSection />
          <VisionSection />
          <GlosarioSection />
        </main>
      </div>
    </I18nProvider>
  );
}


