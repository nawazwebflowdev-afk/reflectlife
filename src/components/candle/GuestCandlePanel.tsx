import { useCallback, useEffect, useMemo, useState } from "react";
import { Flame, EyeOff, Share2, Plus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

import { tr } from "@/i18n/tr";
interface GuestCandle { id:string; contributor_name:string|null; lit_at:string; burns_until:string; hidden_by_owner:boolean }
interface Props { memorialId:string; memorialName:string; isOwner:boolean; enabled:boolean }
const deviceId=()=>{let id=localStorage.getItem("reflectlife_candle_device");if(!id){id=crypto.randomUUID();localStorage.setItem("reflectlife_candle_device",id)}return id};

export function GuestCandlePanel({memorialId,memorialName,isOwner,enabled}:Props){
  const {i18n}=useTranslation(); const uk=i18n.language==="uk"; const {toast}=useToast();
  const [candles,setCandles]=useState<GuestCandle[]>([]); const [name,setName]=useState(""); const [busy,setBusy]=useState(false); const [success,setSuccess]=useState(false);
  const load=useCallback(async()=>{const {data}=await supabase.from("memorial_guest_candles").select("id,contributor_name,lit_at,burns_until,hidden_by_owner").eq("memorial_id",memorialId).order("lit_at",{ascending:false}).limit(200);setCandles((data as GuestCandle[])??[])},[memorialId]);
  useEffect(()=>{load()},[load]);
  const active=useMemo(()=>candles.filter(c=>new Date(c.burns_until)>new Date()&&!c.hidden_by_owner),[candles]);
  const earlier=useMemo(()=>candles.filter(c=>new Date(c.burns_until)<=new Date()&&!c.hidden_by_owner),[candles]);
  const captcha=async()=>{const key=(import.meta.env.VITE_RECAPTCHA_SITE_KEY as string|undefined)||"6Lc_t9ktAAAAAFqRrUCkGkn2sTQZqzLSsXAgVd9b";if(!key)throw new Error(uk?"Захист від спаму ще налаштовується.":tr("a.6d433fc056"));if(!(window as any).grecaptcha){await new Promise<void>((resolve,reject)=>{const s=document.createElement("script");s.src=`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`;s.async=true;s.onload=()=>resolve();s.onerror=()=>reject(new Error(tr("a.698390048e")));document.head.appendChild(s)})}const g=(window as any).grecaptcha;await new Promise<void>(resolve=>g.ready(resolve));return await g.execute(key,{action:"guest_candle"})};
  const light=async()=>{if(name.length>40)return;setBusy(true);try{const token=await captcha();const {data,error}=await supabase.functions.invoke("light-guest-candle",{body:{memorial_id:memorialId,contributor_name:name.trim()||null,device_id:deviceId(),captcha_token:token}});if(error||(data as any)?.error)throw new Error((data as any)?.error||error?.message);setSuccess(true);setName("");await load()}catch(e:any){toast({title:uk?"Не вдалося запалити свічку":tr("a.05290f1302"),description:e.message,variant:"destructive"})}finally{setBusy(false)}};
  const hide=async(id:string)=>{const {error}=await supabase.from("memorial_guest_candles").update({hidden_by_owner:true}).eq("id",id);if(error)toast({title:tr("a.7f2f6a15cf"),description:error.message,variant:"destructive"});else load()};
  if(!enabled&&!isOwner)return null;
  return <div className="w-full space-y-5 border-t border-border pt-7">
    <div className="text-center"><h3 className="font-serif text-xl font-semibold">{uk?"Запалити свічку":tr("a.f629a77052")}</h3><p className="mt-1 text-sm text-muted-foreground">{uk?"Свічка горітиме сім днів. Ім'я можна не вказувати.":tr("a.a3c4cf5141")}</p></div>
    {enabled&&<div className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"><Input aria-label={uk?"Ваше ім'я":tr("a.ab42293e29")} placeholder={uk?"Ваше ім'я (необов'язково)":tr("a.32861acdae")} maxLength={40} value={name} onChange={e=>setName(e.target.value)}/><Button onClick={light} disabled={busy}>{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Flame className="mr-2 h-4 w-4"/>}{uk?"Запалити свічку":tr("a.3a138fef9b")}</Button></div>}
    {success&&<div className="mx-auto max-w-xl rounded-md border border-primary/30 bg-primary/5 p-4 text-center"><p className="font-medium">{uk?`Ваша свічка запалена для ${memorialName}.`:`Your candle is lit for ${memorialName}.`}</p><div className="mt-3 flex flex-wrap justify-center gap-2"><Button variant="outline" onClick={()=>navigator.share?.({title:memorialName,url:window.location.href})}><Share2 className="mr-2 h-4 w-4"/>{uk?"Поділитися меморіалом":tr("a.ceda3eaa61")}</Button><Button asChild onClick={()=>sessionStorage.setItem("reflectlife_guest_candle_memorial",memorialId)}><Link to={`/login?redirect=${encodeURIComponent(`/memorial/${memorialId}#memories`)}`}><Plus className="mr-2 h-4 w-4"/>{uk?"Додати спогад":tr("a.0a5add0372")}</Link></Button></div></div>}
    {active.length>0&&<ul className="flex flex-wrap justify-center gap-3">{active.map(c=><li key={c.id} className="relative w-28 rounded-md border bg-card px-2 py-3 text-center"><Flame className="mx-auto h-8 w-8 text-primary"/><p className="mt-1 truncate text-xs font-medium">{c.contributor_name|| (uk?"Анонімно":tr("a.9bed510400"))}</p><p className="text-xs text-muted-foreground">{new Date(c.lit_at).toLocaleDateString(uk?"uk-UA":undefined)}</p>{isOwner&&<Button title={uk?"Приховати":tr("a.34d8b60fe2")} variant="ghost" size="icon" className="absolute right-0 top-0 h-7 w-7" onClick={()=>hide(c.id)}><EyeOff className="h-3.5 w-3.5"/></Button>}</li>)}</ul>}
    {earlier.length>0&&<details className="mx-auto max-w-2xl"><summary className="cursor-pointer text-center text-sm font-medium">{uk?"Запалювали раніше":tr("a.db5856768a")} ({earlier.length})</summary><ul className="mt-3 divide-y rounded-md border">{earlier.map(c=><li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm"><span>{c.contributor_name||(uk?"Анонімно":tr("a.9bed510400"))}</span><span className="text-muted-foreground">{new Date(c.lit_at).toLocaleDateString(uk?"uk-UA":undefined)}</span></li>)}</ul></details>}
  </div>
}
