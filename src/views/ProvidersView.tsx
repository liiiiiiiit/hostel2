import React, {useEffect,useState} from 'react';
import {useLanguage} from '../context/LanguageContext';
import {providerCall} from '../services/providers';
import type {Listing,ProviderRequest,ProviderRole} from '../types/providers';

const words = {
  jobs:['کاریابی','Jobs','Работа','Աշխատանք'],tours:['تورها','Tours','Туры','Տուրեր'],providers:['حساب‌های ارائه‌دهندگان','Provider accounts','Аккаунты поставщиков','Մատակարարների հաշիվներ'],
  title:['عنوان','Title','Название','Անվանում'],description:['شرح','Description','Описание','Նկարագրություն'],location:['محل / مقصد','Location / destination','Место / направление','Վայր / ուղղություն'],
  schedule:['ساعت یا مدت و تاریخ','Hours or dates and duration','График или даты и длительность','Գրաֆիկ կամ ամսաթվեր և տևողություն'],contact:['تلفن یا ایمیل','Phone or email','Телефон или email','Հեռախոս կամ էլ․ փոստ'],
  name:['نام کامل','Full name','Полное имя','Անուն ազգանուն'],email:['ایمیل ورود','Login email','Email для входа','Մուտքի էլ․ փոստ'],password:['رمز عبور (حداقل ۱۲ نویسه)','Password (12+ characters)','Пароль (от 12 знаков)','Գաղտնաբառ (12+ նիշ)'],
  organization:['نام مجموعه','Organization','Организация','Կազմակերպություն'],role:['نوع حساب','Account type','Тип аккаунта','Հաշվի տեսակ'],
  category:['نوع کار','Job type','Тип работы','Աշխատանքի տեսակ'],requirements:['شرایط و مهارت‌ها','Requirements','Требования','Պահանջներ'],inclusions:['خدمات تور','Included services','Услуги тура','Ներառված ծառայություններ'],
  image:['لینک تصویر HTTPS','HTTPS image URL','HTTPS ссылка изображения','Պատկերի HTTPS հղում'],price:['حقوق / قیمت هر نفر (درام، اختیاری)','Salary / price per person (AMD, optional)','Зарплата / цена (AMD, необязательно)','Վարձատրություն / գին (դրամ, ըստ ցանկության)'],
  capacity:['ظرفیت هر تاریخ','Spots per date','Мест на дату','Տեղեր յուրաքանչյուր օրվա համար'],active:['فعال','Active','Активно','Ակտիվ'],approved:['تأیید انتشار مدیر','Admin publication approval','Одобрено администратором','Հաստատված է ադմինիստրատորի կողմից'],
  add:['افزودن','Add','Добавить','Ավելացնել'],save:['ذخیره','Save','Сохранить','Պահպանել'],cancel:['انصراف','Cancel','Отмена','Չեղարկել'],edit:['ویرایش','Edit','Изменить','Խմբագրել'],remove:['حذف','Delete','Удалить','Ջնջել'],
  apply:['درخواست','Apply / book','Подать заявку','Դիմել'],note:['معرفی یا توضیح کوتاه','Short note / experience','Комментарий / опыт','Նշում / փորձ'],date:['تاریخ تور','Tour date','Дата тура','Տուրի օր'],people:['تعداد نفرات','People','Участники','Մասնակիցներ'],
  requests:['درخواست‌ها','Requests','Заявки','Դիմումներ'],empty:['موردی ثبت نشده است','No records yet','Пока нет записей','Գրանցումներ չկան'],success:['ثبت شد','Saved','Сохранено','Պահպանված է'],
  new:['جدید','New','Новая','Նոր'],reviewed:['بررسی‌شده','Reviewed','Рассмотрена','Ուսումնասիրված'],contacted:['تماس گرفته شد','Contacted','Связались','Կապ հաստատված'],
  accepted:['پذیرفته','Accepted','Принята','Ընդունված'],rejected:['ردشده','Rejected','Отклонена','Մերժված'],pending:['در انتظار','Pending','Ожидание','Սպասում է'],confirmed:['تأییدشده','Confirmed','Подтверждена','Հաստատված'],cancelled:['لغوشده','Cancelled','Отменена','Չեղարկված'],
  login:['ورود','Sign in','Войти','Մուտք'],panel:['پنل من','My panel','Мой кабинет','Իմ վահանակ'],confirm:['حذف شود؟','Delete this record?','Удалить запись?','Ջնջե՞լ գրառումը։']
};
export function ProvidersView({kind,manage=false,accounts=false,onLogin}: {kind?:ProviderRole;manage?:boolean;accounts?:boolean;onLogin?:()=>void}) {
  const {currentLang}=useLanguage(),index=['fa','en','ru','hy'].indexOf(currentLang);
  const t=(key:string)=>words[key]?.[index]||({phone:words.contact,isActive:words.active}[key]?.[index])||key;
  const [data,setData]=useState<any>({listings:[],requests:[],users:[]}),[draft,setDraft]=useState<any>(null);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[application,setApplication]=useState<Listing|null>(null);
  async function load(){try{setData(await providerCall('providers'));}catch(e){setError(e.message);}}
  useEffect(()=>{void load();const id=setInterval(()=>void load(),15000);return()=>clearInterval(id);},[]);
  const admin=data.user?.role==='admin',authorized=admin||data.user?.role===kind;
  const listings=data.listings.filter((l:Listing)=>l.kind===kind&&(!manage?l.active&&l.approved:admin||l.ownerId===data.user?.id));
  async function action(action:string,input:any){
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try{const result=await providerCall('provider-action',{action,input});setNotice(t('success')+(result.reference?' · '+result.reference:''));setDraft(null);setApplication(null);await load();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  const field=(key:string,type='text')=><label key={key} className="block text-sm">{t(key)}
    {['description','requirements','inclusions','note'].includes(key)?<textarea required={key==='description'} className="w-full border rounded-xl p-3" value={draft[key]||''} onChange={e=>setDraft({...draft,[key]:e.target.value})} maxLength={4000}/>:
    <input className="w-full border rounded-xl p-3" type={type} required={['title','name','email','description','location','contact','schedule','date'].includes(key)} min={key==='capacity'||key==='people'?1:0} max={key==='people'?100:1000000000}
      value={draft[key]??''} onChange={e=>setDraft({...draft,[key]:type==='number'?(e.target.value===''?null:Number(e.target.value)):e.target.value})} maxLength={key==='password'?128:1000}/>}</label>;
  const checkbox=(key:string)=><label key={key} className="flex gap-2"><input type="checkbox" checked={!!draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.checked})}/>{t(key==='isActive'?'active':key)}</label>;
  function create(){setDraft(accounts?{name:'',email:'',phone:'',organization:'',password:'',role:'job_provider',isActive:true}:{kind,ownerId:data.user.id,title:'',description:'',location:'',schedule:'',contact:'',price:null,capacity:1,active:true,approved:admin});}
  if(manage&&!authorized)return <div className="p-6"><button onClick={onLogin}>{t('login')}</button></div>;
  if(accounts&&!admin)return null;
  return <section className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
    <h1 className="text-2xl font-bold">{accounts?t('providers'):t(kind==='job_provider'?'jobs':'tours')} {manage&&!accounts&&t('panel')}</h1>
    {error&&<p role="alert" className="bg-red-50 text-red-800 p-3 rounded-xl">{error}</p>}{notice&&<p role="status" className="bg-green-50 p-3 break-all">{notice}</p>}
    {manage&&!draft&&<button className="rounded-xl bg-amber-500 px-5 py-3" onClick={create}>{t('add')}</button>}
    {draft&&<form className="border rounded-2xl p-4 space-y-4" onSubmit={e=>{e.preventDefault();void action(application?'request':accounts?'provider':'listing',draft);}}>
      <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
        {application?<>{field('name')}{field('contact')}{field('note')}{kind==='tour_provider'&&<>{field('date','date')}{field('people','number')}</>}</>:
        accounts?<>{field('name')}{field('email','email')}{field('password','password')}{field('phone')}{field('organization')}
          <label>{t('role')}<select value={draft.role} className="w-full border p-3 rounded-xl" onChange={e=>setDraft({...draft,role:e.target.value})}><option value="job_provider">{t('jobs')}</option><option value="tour_provider">{t('tours')}</option></select></label>{checkbox('isActive')}</>:
        <>{['title','description','location','schedule','contact'].map(key=>field(key))}{field('price','number')}
          {kind==='job_provider'?<>{field('category')}{field('requirements')}</>:<>{field('capacity','number')}{field('inclusions')}{field('image','url')}</>}
          {checkbox('active')}{admin&&checkbox('approved')}</>}
      </fieldset>
      <div className="flex gap-3"><button disabled={busy} className="bg-amber-500 rounded-xl px-4 py-2">{t('save')}</button><button disabled={busy} type="button" onClick={()=>{setDraft(null);setApplication(null);}}>{t('cancel')}</button></div>
    </form>}
    {accounts?<div className="grid sm:grid-cols-2 gap-4">{data.users.map(user=><article key={user.id} className="p-4 border rounded-xl"><h2>{user.name}</h2><p>{user.email} · {t(user.role==='job_provider'?'jobs':'tours')} · {user.isActive?'✓':'—'}</p><button onClick={()=>setDraft({...user,password:''})}>{t('edit')}</button></article>)}</div>:
    <div className="grid md:grid-cols-2 gap-4">{!listings.length&&<p>{t('empty')}</p>}{listings.map((listing:Listing)=><article key={listing.id} className="border rounded-2xl p-4 space-y-3 min-w-0 break-words">
      {listing.image&&<img src={listing.image} alt="" className="w-full h-48 object-cover rounded-xl"/>}<h2 className="font-bold text-xl">{listing.title}</h2>
      <p>{listing.location} · {listing.schedule}</p><p className="whitespace-pre-wrap">{listing.description}</p><p>{listing.category} {listing.requirements} {listing.inclusions}</p>
      <p>{t('price')} · {listing.price??'—'}</p><p>{listing.contact}</p>
      {manage?<><p>{t('active')} {listing.active?'✓':'—'} · {t('approved')} {listing.approved?'✓':'—'}</p>
        <button className="me-4" onClick={()=>setDraft({...listing})}>{t('edit')}</button><button disabled={busy} onClick={()=>{if(window.confirm(t('confirm')))void action('delete',{id:listing.id});}}>{t('remove')}</button>
        <details><summary>{t('requests')}</summary>{data.requests.filter((r:ProviderRequest)=>r.listingId===listing.id).map((request:ProviderRequest)=><div key={request.id} className="border-t py-3 space-y-2"><b>{request.name}</b><p>{request.contact}</p><p>{request.note}</p>{request.date&&<p>{request.date} · {request.people}</p>}
          <select className="border rounded p-2 max-w-full" disabled={busy} value={request.status} onChange={e=>void action('status',{id:request.id,status:e.target.value})}>{(kind==='job_provider'?['new','reviewed','contacted','accepted','rejected']:['pending','confirmed','cancelled']).map(s=><option key={s} value={s}>{t(s)}</option>)}</select></div>)}</details></>:
        <button className="bg-amber-500 rounded-xl px-4 py-2" onClick={()=>{setApplication(listing);const bytes=crypto.getRandomValues(new Uint8Array(16));setDraft({listingId:listing.id,requestId:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),name:'',contact:'',note:'',date:'',people:1});setNotice('');}}>{t('apply')}</button>}
    </article>)}</div>}
  </section>;
}
