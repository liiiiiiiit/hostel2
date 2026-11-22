import React,{useState} from 'react';
import {useLanguage} from '../context/LanguageContext';
import {appStore} from '../services/store';
export const providerWords={
  fa:{menuLogin:'برای ورود به پنل، از گزینهٔ ورود در منوی سایت استفاده کنید.',title:'حساب‌های ارائه‌دهندگان',add:'ساخت حساب',name:'نام کامل',email:'ایمیل ورود',phone:'تلفن',organization:'نام مجموعه',password:'رمز جدید (حداقل ۱۲ نویسه؛ برای حفظ رمز خالی بگذارید)',role:'نوع حساب',job:'کارفرما',tour:'برگزارکننده تور',active:'فعال',save:'ذخیره',edit:'ویرایش',cancel:'انصراف',approved:'تأیید انتشار مدیر',remove:'حذف',capacity:'ظرفیت در هر تاریخ',waiting:'در انتظار تأیید مدیر'},
  en:{menuLogin:'Use Sign In in the site menu to access your panel.',title:'Provider accounts',add:'Create account',name:'Full name',email:'Login email',phone:'Phone',organization:'Organization',password:'New password (12+ characters; leave blank to keep)',role:'Account type',job:'Employer',tour:'Tour organizer',active:'Active',save:'Save',edit:'Edit',cancel:'Cancel',approved:'Admin publication approval',remove:'Delete',capacity:'Spots per date',waiting:'Awaiting admin approval'},
  ru:{menuLogin:'Для входа в кабинет используйте вход в меню сайта.',title:'Аккаунты поставщиков',add:'Создать аккаунт',name:'Полное имя',email:'Email для входа',phone:'Телефон',organization:'Организация',password:'Новый пароль (от 12 знаков; пусто — сохранить)',role:'Тип аккаунта',job:'Работодатель',tour:'Организатор тура',active:'Активен',save:'Сохранить',edit:'Изменить',cancel:'Отмена',approved:'Одобрение публикации',remove:'Удалить',capacity:'Мест на дату',waiting:'Ожидает одобрения'},
  hy:{menuLogin:'Ձեր վահանակ մուտք գործելու համար օգտվեք կայքի մենյուի մուտքից։',title:'Մատակարարների հաշիվներ',add:'Ստեղծել հաշիվ',name:'Անուն ազգանուն',email:'Մուտքի էլ․ փոստ',phone:'Հեռախոս',organization:'Կազմակերպություն',password:'Նոր գաղտնաբառ (12+ նիշ․ դատարկ՝ պահպանելու համար)',role:'Հաշվի տեսակ',job:'Գործատու',tour:'Տուրի կազմակերպիչ',active:'Ակտիվ',save:'Պահպանել',edit:'Խմբագրել',cancel:'Չեղարկել',approved:'Հրապարակման հաստատում',remove:'Ջնջել',capacity:'Տեղեր յուրաքանչյուր օրվա համար',waiting:'Սպասում է հաստատմանը'}
};
export function ProviderAccounts(){
  const {currentLang}=useLanguage(),t=providerWords[currentLang];
  const [draft,setDraft]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  if(appStore.getCurrentUser()?.role!=='admin')return null;
  async function save(e:React.FormEvent){
    e.preventDefault();if(busy)return;setBusy(true);setError('');
    try{const result=await appStore.action('saveProvider',[draft]);if(result.success)setDraft(null);else setError(result.error??'');}
    finally{setBusy(false);}
  }
  return <section className="space-y-4"><h2 className="text-xl font-bold">{t.title}</h2>
    {error&&<p role="alert">{error}</p>}
    {!draft&&<button className="button-primary" onClick={()=>setDraft({name:'',email:'',phone:'',organization:'',password:'',role:'job_provider',isActive:true})}>{t.add}</button>}
    {draft&&<form onSubmit={save} className="surface p-4 space-y-4"><fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
      {(['name','email','phone','organization','password'] as const).map(key=><label key={key}>{t[key]}<input className="field w-full" required={key==='name'||key==='email'||(key==='password'&&!draft.id)} type={key==='email'?'email':key==='password'?'password':'text'} minLength={key==='password'?12:undefined} maxLength={key==='email'?254:key==='organization'?160:key==='phone'?50:key==='name'?120:128} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}
      <label>{t.role}<select aria-label={t.role} disabled={!!draft.id} className="field w-full" value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})}><option value="job_provider">{t.job}</option><option value="tour_provider">{t.tour}</option></select></label>
      <label><input type="checkbox" checked={draft.isActive} onChange={e=>setDraft({...draft,isActive:e.target.checked})}/> {t.active}</label>
    </fieldset><div className="flex gap-3"><button disabled={busy} className="button-primary">{t.save}</button><button type="button" disabled={busy} onClick={()=>setDraft(null)}>{t.cancel}</button></div></form>}
    <div className="grid md:grid-cols-2 gap-4">{(appStore.getState().providerAccounts??[]).map(user=><article key={user.id} className="surface p-4 min-w-0 break-words"><h3>{user.name}</h3><p>{user.email} · {user.role==='job_provider'?t.job:t.tour} · {user.isActive?'✓':'—'}</p><p>{user.organization} · {user.phone}</p><button className="button-secondary mt-2" onClick={()=>setDraft({...user,password:''})}>{t.edit}</button></article>)}</div>
  </section>;
}
