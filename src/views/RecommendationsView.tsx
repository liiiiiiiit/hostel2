import React, { useState } from "react";
import { appStore } from "../services/store";
import { useLanguage } from "../context/LanguageContext";
import { workflowText, type WorkflowKey } from "../i18n/workflows";
import { recommendStays } from "../utils/recommendations";
import { addCalendarDays, yerevanToday } from "../utils/dates";
import { getRoomTypeFilterName } from "../utils/i18n";
export function RecommendationsView({
  onNavigate,
  initial,
}: {
  onNavigate: (view: string, params?: any) => void;
  initial?: {
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    type?: string;city?:string;district?:string;budget?:number;amenities?:string[];arrivalTime?:string;actualArrivalDate?:string;arrivalMode?:'standard'|'previous_night'|'early_check_in';
  };
}) {
  const { currentLang, getLocalized } = useLanguage(),
    w = workflowText(currentLang);
  const [from,setFrom]=useState(initial?.checkIn||yerevanToday()),[to,setTo]=useState(initial?.checkOut||addCalendarDays(from,1)),
    [guests, setGuests] = useState(initial?.guests ?? 1),
    [type, setType] = useState(initial?.type ?? "all"),
    [budget, setBudget] = useState<number|"">(initial?.budget??""),
    [time, setTime] = useState(initial?.arrivalTime??""),
    [require24h, set24h] = useState(initial?.amenities?.includes('24h')??false),
    [metro, setMetro] = useState(initial?.amenities?.includes('metro')??false),
    [longStay, setLongStay] = useState(initial?.amenities?.includes('monthly')??false);
  const [city,setCity]=useState(initial?.city==='all'?'':initial?.city??''),[district,setDistrict]=useState(initial?.district==='all'?'':initial?.district??''),[extras,setExtras]=useState(initial?.amenities?.filter(key=>['kitchen','elevator','coworking','tonight'].includes(key))??[]);
  const offers = recommendStays(
    appStore.getHostels(),
    {
      checkIn: from,
      checkOut: to,
      guests,
      type,
      budget:budget===''?Infinity:budget,city,district,amenities:extras,
      arrivalTime: time || undefined,
      require24h,
      metro,
      longStay,
    },
    (h, r) => appStore.remainingCapacity(h, r.id, from, to),
    (h,r)=>appStore.remainingCapacity(h,r.id,yerevanToday(),addCalendarDays(yerevanToday(),1)),
  );
  return (
    <section className="page-shell py-8 space-y-5">
      <h1 className="text-2xl font-semibold">{w("recommend")}</h1>
      <div className="surface p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(
          [
            [w("checkIn"), from, setFrom, "date"],
            [w("checkOut"), to, setTo, "date"],
            [w("arrivalTime"), time, setTime, "time"],
          ] as const
        ).map(([label, value, setter, inputType]) => (
          <label key={label} className="text-sm">
            {label}
            <input
              className="field w-full mt-2"
              type={inputType}
              value={value}
              onChange={(e) => setter(e.target.value)}
            />
          </label>
        ))}
        <label className="text-sm">
          {w("guests")}
          <input
            className="field w-full mt-2"
            type="number"
            min={1}
            max={100}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          {w("budget")}
          <input
            className="field w-full mt-2"
            type="number"
            min={0}
            value={budget}
            placeholder={w("all")} onChange={(e) => setBudget(e.target.value===''?'':Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          {w("roomType")}
          <select
            className="field w-full mt-2"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {["all", "dorm_mixed", "dorm_female", "dorm_male", "private"].map(
              (key) => (
                <option value={key} key={key}>
                  {getRoomTypeFilterName(key, currentLang)}
                </option>
              ),
            )}
          </select>
        </label>
        {(
          [
            [w("reception"), require24h, set24h],
            [w("metro"), metro, setMetro],
            [w("longStay"), longStay, setLongStay],
          ] as const
        ).map(([label, value, setter]) => (
          <label className="text-sm flex gap-2" key={label}>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => setter(e.target.checked)}
            />
            {label}
          </label>
        ))}
        <label className="text-sm">{w('city')}<input className="field w-full mt-2" aria-label={w('city')} placeholder={w('all')} value={city} onChange={e=>setCity(e.target.value)}/></label><label className="text-sm">{w('district')}<input className="field w-full mt-2" aria-label={w('district')} placeholder={w('all')} value={district} onChange={e=>setDistrict(e.target.value)}/></label>
        {extras.map(key=><button key={key} className="button-secondary" onClick={()=>setExtras(extras.filter(item=>item!==key))}>{w(key as WorkflowKey)} ×</button>)}
      </div>
      {!offers.length && <p className="surface p-5">{w("unavailable")}</p>}
      {offers.map(({ hostel, offer, reasons }) => (
        <article className="surface p-5 space-y-4" key={hostel.id}>
          <h2 className="text-xl font-semibold">{getLocalized(hostel.name)}</h2>
          <p>
            {getLocalized(offer.room.name)} · {offer.units} ·{" "}
            {offer.total.toLocaleString(currentLang)} AMD
          </p>
          <ul className="flex flex-wrap gap-2">
            {reasons.map((reason) => (
              <li key={reason} className="status-pill">
                {w(reason as WorkflowKey)}
              </li>
            ))}
          </ul>
          <button
            className="button-primary"
            onClick={() =>
              onNavigate("hostel-detail", {
                id: hostel.id,
                checkIn: from,
                checkOut: to,
                guests,
                city,district,type,budget:budget===''?undefined:budget,amenities:[...extras,...(metro?['metro']:[]),...(require24h?['24h']:[]),...(longStay?['monthly']:[])].join(','),arrivalTime:time||undefined,arrivalMode:from===initial?.checkIn&&time===initial?.arrivalTime?initial.arrivalMode:undefined,actualArrivalDate:from===initial?.checkIn&&time===initial?.arrivalTime?initial.actualArrivalDate:undefined,
                roomTypeId: offer.room.id,
              })
            }
          >
            {w("open")}
          </button>
        </article>
      ))}
    </section>
  );
}
