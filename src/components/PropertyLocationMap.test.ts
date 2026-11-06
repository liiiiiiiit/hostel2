import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HostelLocationMap, RentalLocationMap } from './HostelLocationMap';
import { getProviderLinks } from '../utils/maps';
import { newRental } from '../utils/properties';
import { rentalSchema } from '../../server/property-schemas';
import { INITIAL_HOSTELS } from '../../server/seed';

test('map providers use their respective coordinate order and safely encode multilingual addresses', () => {
  const links = getProviderLinks({lat:40.1785,lng:44.5152},'ignored')!;
  assert.equal(new URL(links.yandex).searchParams.get('pt'),'44.5152,40.1785,pm2rdm');
  assert.equal(new URL(links.google).searchParams.get('query'),'40.1785,44.5152');
  const address = 'خیابان & #1 / Երևան';
  const search = getProviderLinks({lat:NaN,lng:44},address)!;
  assert.equal(new URL(search.yandex).searchParams.get('text'),address);
  assert.equal(new URL(search.yandex).searchParams.has('pt'),false);
  assert.equal(new URL(search.google).searchParams.get('query'),address);
  assert.equal(getProviderLinks(undefined,'  '),null);
});

test('rental maps in all languages use only public information, with address fallback and optional real pin', () => {
  const rental = {...newRental(),city:'Yerevan',addressPublic:'Public street',addressExactInternal:'SECRET-DOOR-123',landlordInternalNotes:'SECRET-NOTE'};
  for (const currentLang of ['fa','en','ru','hy'] as const) {
    const fallback = renderToStaticMarkup(createElement(RentalLocationMap,{rental,currentLang}));
    assert.ok(fallback.includes('yandex.com/maps/') && fallback.includes('google.com/maps/search/'));
    assert.ok(!fallback.includes('<iframe') && !fallback.includes('SECRET'));
    const pinned = renderToStaticMarkup(createElement(RentalLocationMap,{rental:{...rental,publicCoordinates:{lat:40.1,lng:44.2}},currentLang}));
    assert.ok(pinned.includes('marker=40.1%2C44.2') && pinned.includes('pt=44.2%2C40.1%2Cpm2rdm'));
    assert.ok(!pinned.includes('SECRET'));
  }
});

test('hostels explicitly missing coordinates offer address search without an arbitrary pin', () => {
  const markup = renderToStaticMarkup(createElement(HostelLocationMap,{hostel:{...INITIAL_HOSTELS[0],coordinatesProvided:false},currentLang:'en'}));
  assert.ok(!markup.includes('<iframe') && !markup.includes('maps/dir/'));
  assert.ok(markup.includes('google.com/maps/search/'));
});

test('rental schema preserves optional public point and rejects incomplete or invalid coordinates', () => {
  const rental = newRental();
  assert.equal(rentalSchema.parse(rental).publicCoordinates,undefined);
  assert.deepEqual(rentalSchema.parse({...rental,publicCoordinates:{lat:0,lng:0}}).publicCoordinates,{lat:0,lng:0});
  for (const point of [{lat:91,lng:44},{lat:40,lng:181},{lat:NaN,lng:44},{lat:40},{lat:'40',lng:44}]) assert.equal(rentalSchema.safeParse({...rental,publicCoordinates:point}).success,false);
});
