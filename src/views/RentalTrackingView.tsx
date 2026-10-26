import React from 'react';
import { AppLanguage, RentalInquiry, RentalProperty } from '../types';
import { getLocalized } from '../utils/i18n';
import { UI_TRANSLATIONS } from '../i18n/translations';
import { Home, CheckCircle2, Clock, Phone, MapPin, ArrowRight, ArrowLeft } from 'lucide-react';

interface Props {
  currentLang: AppLanguage;
  inquiry: RentalInquiry;
  property?: RentalProperty;
  onNavigate: (view: string, params?: any) => void;
}

const RENTAL_TRACKING_TEXTS = {
  fa: {
    trackingCodeLabel: 'کد پیگیری درخواست ملک:',
    applicantLabel: 'متقاضی:',
    adminNotesTitle: 'یادداشت هماهنگی مدیریت YEREVANHUB:',
    depositLabel: 'ودیعه:',
    requestTypeLabel: 'نوع درخواست:',
    typeVisit: 'هماهنگی بازدید حضوری',
    typeRent: 'درخواست اجاره مستقیم',
    proposedVisitDateLabel: 'زمان پیشنهادی بازدید:',
    desiredStartDateLabel: 'تاریخ شروع مدنظر:',
    durationLabel: 'مدت اقامت:',
    residentsLabel: 'تعداد ساکنین:',
    residentsUnit: 'نفر',
    notesLabel: 'توضیحات:',
    viewOtherProperties: 'مشاهده سایر املاک',
    supportHotline: 'پشتیبانی:',
    statusPending: 'در انتظار بررسی توسط مدیریت YEREVANHUB',
    statusCoordinating: 'در حال هماهنگی با مالک جهت بازدید',
    statusProposed: 'شرایط و قرارداد پیشنهاد شد',
    statusAgreed: 'توافق نهایی انجام شد',
    statusRejected: 'ملک در دسترس نیست یا شرایط توافق نشد',
  },
  en: {
    trackingCodeLabel: 'Inquiry Tracking Code:',
    applicantLabel: 'Applicant:',
    adminNotesTitle: 'YEREVANHUB Coordinator Note:',
    depositLabel: 'Deposit:',
    requestTypeLabel: 'Request Type:',
    typeVisit: 'Schedule In-person Viewing',
    typeRent: 'Direct Rental Application',
    proposedVisitDateLabel: 'Proposed Visit Date:',
    desiredStartDateLabel: 'Desired Move-in Date:',
    durationLabel: 'Lease Duration:',
    residentsLabel: 'Number of Residents:',
    residentsUnit: 'resident(s)',
    notesLabel: 'Notes & Preferences:',
    viewOtherProperties: 'Browse Other Properties',
    supportHotline: 'Support:',
    statusPending: 'Pending Review by YEREVANHUB Team',
    statusCoordinating: 'Coordinating visit with property owner',
    statusProposed: 'Terms & lease agreement proposed',
    statusAgreed: 'Agreement finalized & confirmed',
    statusRejected: 'Property unavailable or terms declined',
  },
  ru: {
    trackingCodeLabel: 'Код отслеживания заявки:',
    applicantLabel: 'Заявитель:',
    adminNotesTitle: 'Примечание координатора YEREVANHUB:',
    depositLabel: 'Залог:',
    requestTypeLabel: 'Тип запроса:',
    typeVisit: 'Организация личного просмотра',
    typeRent: 'Прямая заявка на аренду',
    proposedVisitDateLabel: 'Предложенная дата просмотра:',
    desiredStartDateLabel: 'Желаемая дата заселения:',
    durationLabel: 'Срок аренды:',
    residentsLabel: 'Количество проживающих:',
    residentsUnit: 'чел.',
    notesLabel: 'Пожелания и комментарии:',
    viewOtherProperties: 'Смотреть другие квартиры',
    supportHotline: 'Поддержка:',
    statusPending: 'На рассмотрении администрации YEREVANHUB',
    statusCoordinating: 'Согласование времени просмотра с владельцем',
    statusProposed: 'Предложены условия и проект договора',
    statusAgreed: 'Сделка успешно согласована',
    statusRejected: 'Объект недоступен или условия отклонены',
  },
  hy: {
    trackingCodeLabel: 'Հայտի հետևման կոդ՝',
    applicantLabel: 'Դիմող՝',
    adminNotesTitle: 'YEREVANHUB համակարգողի նշում՝',
    depositLabel: 'Կանխավճար (դեպոզիտ)՝',
    requestTypeLabel: 'Հարցման տեսակ՝',
    typeVisit: 'Տեղում դիտման կազմակերպում',
    typeRent: 'Ուղիղ վարձակալության հայտ',
    proposedVisitDateLabel: 'Դիտման առաջարկվող օր՝',
    desiredStartDateLabel: 'Մուտքի ցանկալի ամսաթիվ՝',
    durationLabel: 'Վարձակալության ժամկետ՝',
    residentsLabel: 'Բնակիչների քանակ՝',
    residentsUnit: 'անձ',
    notesLabel: 'Նշումներ և ցանկություններ՝',
    viewOtherProperties: 'Դիտել այլ բնակարաններ',
    supportHotline: 'Աջակցություն՝',
    statusPending: 'Քննարկման փուլում է YEREVANHUB-ի կողմից',
    statusCoordinating: 'Այցելության համաձայնեցում սեփականատիրոջ հետ',
    statusProposed: 'Առաջարկվել են պայմանները և պայմանագիրը',
    statusAgreed: 'Վերջնական համաձայնությունը կայացել է',
    statusRejected: 'Գույքն անհասանելի է կամ պայմանները չեն ընդունվել',
  },
};

export const RentalTrackingView: React.FC<Props> = ({
  currentLang,
  inquiry,
  property,
  onNavigate,
}) => {
  const isRtl = currentLang === 'fa';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;
  const tr = RENTAL_TRACKING_TEXTS[currentLang] || RENTAL_TRACKING_TEXTS.fa;

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_review':
        return { text: tr.statusPending, color: 'bg-warning-surface text-accent border-warning-edge' };
      case 'coordinating':
        return { text: tr.statusCoordinating, color: 'bg-info-surface text-info border-info-edge' };
      case 'proposed_terms':
        return { text: tr.statusProposed, color: 'bg-notice-surface text-notice border-notice-edge' };
      case 'agreed':
        return { text: tr.statusAgreed, color: 'bg-success-surface text-success border-success-edge' };
      case 'rejected':
        return { text: tr.statusRejected, color: 'bg-danger-surface text-danger border-danger-edge' };
      default:
        return { text: status, color: 'bg-surface-inset text-content' };
    }
  };

  const statusInfo = getStatusText(inquiry.status);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-edge/90 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-edge">
          <div>
            <span className="text-xs text-muted font-semibold">{tr.trackingCodeLabel}</span>
            <div className="text-2xl sm:text-3xl font-black text-content">
              {inquiry.trackingCode}
            </div>
            <div className="text-xs text-muted mt-1">
              {tr.applicantLabel} <strong className="text-content">{inquiry.guestName}</strong>
            </div>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold ${statusInfo.color}`}>
            {statusInfo.text}
          </div>
        </div>

        {inquiry.adminNotes && (
          <div className="p-4 rounded-2xl bg-info-surface border border-info-edge text-xs sm:text-sm text-info space-y-1">
            <span className="font-bold block">{tr.adminNotesTitle}</span>
            <p>{inquiry.adminNotes}</p>
          </div>
        )}

        {/* Property Brief */}
        {property && (
          <div className="p-4 rounded-2xl bg-canvas border border-edge flex gap-4 items-center">
            <img
              src={property.photos[0]}
              alt={getLocalized(property.title, currentLang)}
              className="w-20 h-20 rounded-xl object-cover shrink-0"
            />
            <div className="space-y-1">
              <span className="text-xs font-bold text-info">{property.neighborhood}</span>
              <h3 className="font-bold text-content text-sm">{getLocalized(property.title, currentLang)}</h3>
              <p className="text-xs text-muted">
                {tr.depositLabel} {property.refundableDepositAMD.toLocaleString()} AMD
              </p>
            </div>
          </div>
        )}

        {/* Inquiry Summary */}
        <div className="space-y-2 text-xs sm:text-sm text-secondary">
          <div>{tr.requestTypeLabel} <strong className="text-content">{inquiry.requestType === 'visit' ? tr.typeVisit : tr.typeRent}</strong></div>
          {inquiry.proposedVisitDate && (
            <div>{tr.proposedVisitDateLabel} <strong className="text-content">{inquiry.proposedVisitDate}</strong></div>
          )}
          {inquiry.desiredStartDate && (
            <div>{tr.desiredStartDateLabel} <strong className="text-content">{inquiry.desiredStartDate}</strong></div>
          )}
          {inquiry.desiredDurationText && (
            <div>{tr.durationLabel} <strong className="text-content">{inquiry.desiredDurationText}</strong></div>
          )}
          <div>{tr.residentsLabel} <strong className="text-content">{inquiry.residentsCount} {tr.residentsUnit}</strong></div>
          {inquiry.notes && <div>{tr.notesLabel} <span className="text-content">{inquiry.notes}</span></div>}
        </div>

        <div className="pt-4 border-t border-edge flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('rentals')}
            className="text-xs font-bold text-info hover:text-info cursor-pointer flex items-center gap-1"
          >
            <span>{tr.viewOtherProperties}</span>
            <ArrowIcon className="w-4 h-4" />
          </button>

          <span className="text-xs text-muted">
            {tr.supportHotline} <span className="ltr-isolate text-secondary font-semibold">+374 91 999 000</span>
          </span>
        </div>
      </div>
    </div>
  );
};
