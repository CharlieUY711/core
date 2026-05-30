import { CoreGlobe } from "@core/core-globe";
import routes from "@/content/landing/routes.json";
import hubs from "@/content/landing/hubs.json";

export default function Page() {
  return (
    <main className="w-full h-screen bg-black text-white">
      <div className="w-full h-[600px]">
        <CoreGlobe routes={routes} hubs={hubs} />
      </div>
    </main>
  );
}
