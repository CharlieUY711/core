"use client";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

export function HeroSection() {
  const { t } = useI18n();
  return (
    <section id="hero" style={{
      position:"relative", minHeight:"100vh", display:"flex",
      alignItems:"center", justifyContent:"center", overflow:"hidden",
      background:"radial-gradient(ellipse 80% 60% at 50% -10%, rgba(27,90,196,0.35) 0%, transparent 70%), #0A1F3D"
    }}>
      <div style={{position:"absolute",inset:0,opacity:0.3,
        backgroundImage:"radial-gradient(circle, rgba(59,130,246,0.15) 1px, transparent 1px)",
        backgroundSize:"28px 28px"}} />
      <div style={{position:"relative",zIndex:10,textAlign:"center",
        width:"100%",maxWidth:"900px",margin:"0 auto",padding:"0 24px"}}>
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.8,delay:0.3}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",marginBottom:"32px"}}>
            <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#c9993a"}} />
            <span style={{color:"#8fa3bf",fontFamily:"monospace",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase"}}>
              {t.hero.tagline}
            </span>
          </div>
          <h1 style={{fontWeight:700,lineHeight:1.05,marginBottom:"24px",letterSpacing:"-0.02em",
            fontSize:"clamp(56px,10vw,120px)",
            background:"linear-gradient(135deg,#fff 30%,#f5c870 100%)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            CORE
          </h1>
        </motion.div>
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.7,delay:0.7}}>
          <p style={{color:"#8fa3bf",fontSize:"clamp(16px,2vw,22px)",marginBottom:"12px",letterSpacing:"0.02em"}}>
            {t.hero.tagline}
          </p>
          <p style={{color:"#4a6080",fontSize:"13px",letterSpacing:"0.08em"}}>{t.hero.sub}</p>
        </motion.div>
      </div>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.5}}
        style={{position:"absolute",bottom:"40px",left:"50%",transform:"translateX(-50%)",
          display:"flex",flexDirection:"column",alignItems:"center",gap:"8px"}}>
        <span style={{color:"#4a6080",fontSize:"10px",letterSpacing:"0.15em",textTransform:"uppercase"}}>{t.hero.scroll}</span>
        <motion.div animate={{y:[0,6,0]}} transition={{duration:1.5,repeat:Infinity}}
          style={{width:"1px",height:"32px",background:"linear-gradient(to bottom,#4a6080,transparent)"}} />
      </motion.div>
    </section>
  );
}


