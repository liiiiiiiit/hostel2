// Non-production content used only by automated tests. URLs are intentionally mocked.
import { newHostel, newRental } from '../src/utils/properties.js';
export const translatedFixture = (name = 'اقامتگاه آزمایشی') => ({fa:name,en:'Test property',ru:'Тестовый объект',hy:'Փորձնական օբյեկտ'});
export function completeHostel() {
  const hostel = newHostel();
  Object.assign(hostel,{slug:`test-${hostel.id}`,name:translatedFixture(),description:translatedFixture('توضیح آزمایشی'),city:'Yerevan',district:'Kentron',address:translatedFixture('نشانی آزمایشی'),addressArmenianForTaxi:'Փորձնական հասցե',coordinates:{lat:40.18,lng:44.51},coordinatesProvided:true,phone:'+37491123456',reception24h:true,checkInStandardTime:'14:00',checkOutStandardTime:'11:00',languagesSpoken:['hy'],factsConfirmed:true});
  hostel.rules={...hostel.rules,cancellationPolicy:'لغو پیش از ورود رایگان است.',cancellationPolicyLocalized:translatedFixture('شرایط لغو'),acceptedPaymentMethodsOnArrival:['AMD cash']};
  hostel.roomTypes=[{id:crypto.randomUUID(),name:translatedFixture('تخت بانوان'),description:translatedFixture('توضیح اتاق'),type:'dorm_female',bookingUnit:'bed',maxGuestsPerUnit:1,totalBedsOrRooms:2,pricePerNightAMD:5000,physicalUnits:[{id:crypto.randomUUID(),label:'F1'},{id:crypto.randomUUID(),label:'F2'}]},{id:crypto.randomUUID(),name:translatedFixture('اتاق دو نفره'),description:translatedFixture('اتاق خصوصی'),type:'private',bookingUnit:'room',maxGuestsPerUnit:2,totalBedsOrRooms:1,pricePerNightAMD:18000,physicalUnits:[{id:crypto.randomUUID(),label:'P1'}]}];
  hostel.media=[{id:crypto.randomUUID(),url:'https://example.test/property.webp',alt:translatedFixture('تصویر آزمایشی')}];hostel.photos=hostel.media.map(image=>image.url);
  return hostel;
}
export function completeRental(){
  const rental=newRental();
  Object.assign(rental,{slug:`test-${rental.id}`,title:translatedFixture('آپارتمان آزمایشی'),description:translatedFixture(),city:'Yerevan',neighborhood:'Kentron',approximateLocationLabel:'Kentron',addressPublic:'Kentron area',addressExactInternal:'PRIVATE-EXACT-ADDRESS',landlordInternalNotes:'PRIVATE-LANDLORD-NOTE',areaSqm:50,totalFloors:4,floor:2,bedsCount:2,bedroomsCount:1,bathroomsCount:1,maxResidents:2,pricePerNightAMD:22000,minStayNights:2,depositTerms:'Refundable following inspection',factsConfirmed:true});
  rental.media=[{id:crypto.randomUUID(),url:'https://example.test/apartment.webp',alt:translatedFixture()}];rental.photos=rental.media.map(image=>image.url);return rental;
}
