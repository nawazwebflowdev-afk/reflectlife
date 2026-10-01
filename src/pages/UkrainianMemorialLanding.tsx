import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Image, Users, Flame, ArrowRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import portraitPlaceholder from "@/assets/portrait-placeholder.webp";

export default function UkrainianMemorialLanding() {
  const [examples, setExamples] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("memorials").select("id,slug,name,date_of_birth,date_of_death,preview_image_url").eq("is_public", true).eq("privacy_level", "public").order("created_at", { ascending: false }).limit(3).then(({ data }) => setExamples(data ?? []));
  }, []);
  return <main className="bg-background text-foreground">
    <Helmet><html lang="uk" /><title>Пам'ять, яка залишається | Reflectlife</title><meta name="description" content="Створіть теплу сторінку пам'яті, щоб берегти історії та бути разом із рідними в Україні й за кордоном." /><link rel="canonical" href="https://reflectlife.net/uk/pamiat" /></Helmet>
    <section className="relative min-h-[72vh] flex items-end overflow-hidden">
      <img src="/og-default.webp" alt="Свічка пам'яті Reflectlife" width={1200} height={630} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      <div className="relative container mx-auto px-4 pb-14 max-w-5xl">
        <p className="text-sm font-semibold text-primary mb-3">Reflectlife українською</p>
        <h1 className="font-serif text-4xl md:text-6xl font-bold max-w-3xl">Пам'ять, яка залишається</h1>
        <p className="mt-5 text-lg md:text-xl max-w-2xl text-foreground/80">Збережіть фотографії, історії та слова, до яких хочеться повертатися. Створіть тихе місце пам'яті для всієї родини — поруч чи за тисячі кілометрів.</p>
        <Button asChild size="lg" className="mt-7"><Link to="/signup">Створити сторінку пам'яті <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </div>
    </section>
    <section className="py-16 border-y"><div className="container mx-auto px-4 max-w-5xl"><h2 className="font-serif text-3xl font-bold text-center mb-10">Три прості кроки</h2><div className="grid md:grid-cols-3 gap-8">
      {[{i:Heart,t:"Розкажіть про близьку людину",d:"Додайте ім'я, важливі дати й кілька слів про життя."},{i:Image,t:"Збережіть найдорожче",d:"Зберіть світлини, спогади та родинні історії в одному місці."},{i:Users,t:"Будьте разом у пам'яті",d:"Запросіть рідних, щоб вони могли додавати свої спогади й запалювати свічки."}].map(({i:Icon,t,d},n)=><div key={t} className="text-center"><div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><Icon className="h-6 w-6 text-primary" /></div><p className="text-sm text-muted-foreground mb-2">Крок {n+1}</p><h3 className="font-serif text-xl font-semibold">{t}</h3><p className="mt-2 text-muted-foreground">{d}</p></div>)}
    </div></div></section>
    {examples.length > 0 && <section className="py-16"><div className="container mx-auto px-4 max-w-5xl"><h2 className="font-serif text-3xl font-bold mb-8">Історії, які бережуть</h2><div className="grid sm:grid-cols-3 gap-5">{examples.map(m=><Link key={m.id} to={`/memorial/${m.slug || m.id}`}><Card className="overflow-hidden"><img src={m.preview_image_url || portraitPlaceholder} alt={m.name} width={512} height={512} loading="lazy" decoding="async" className="aspect-square w-full object-cover"/><CardContent className="p-4"><h3 className="font-serif text-lg font-semibold">{m.name}</h3><p className="text-sm text-muted-foreground">{m.date_of_birth?.slice(0,4) || ""}{m.date_of_death ? ` — ${m.date_of_death.slice(0,4)}` : ""}</p></CardContent></Card></Link>)}</div></div></section>}
    <section className="py-16 bg-muted/40"><div className="container mx-auto px-4 max-w-3xl text-center"><Flame className="h-9 w-9 mx-auto text-primary mb-4"/><h2 className="font-serif text-3xl font-bold">Відстань не розділяє пам'ять</h2><p className="mt-4 text-lg text-muted-foreground">Поділіться сторінкою з рідними в Україні, Польщі, Німеччині, Канаді чи будь-де у світі. Кожен зможе згадати, запалити свічку й залишити тепле слово у зручний час.</p></div></section>
  </main>;
}
