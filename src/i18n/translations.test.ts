import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_TRANSLATIONS, MANAGER_TRANSLATIONS } from './panelTranslations';
import { getLocalized, getCityName, getAmenityLabel } from '../utils/i18n';
import { AppLanguage } from '../types';

const LANGUAGES: AppLanguage[] = ['fa', 'en', 'ru', 'hy'];

test('ADMIN_TRANSLATIONS has all required keys in all 4 languages', () => {
  const adminKeys = Object.keys(ADMIN_TRANSLATIONS.fa) as (keyof typeof ADMIN_TRANSLATIONS.fa)[];
  
  for (const lang of LANGUAGES) {
    const dict = ADMIN_TRANSLATIONS[lang];
    assert.ok(dict, `Missing ADMIN_TRANSLATIONS dictionary for ${lang}`);
    
    for (const key of adminKeys) {
      assert.ok(
        typeof dict[key] === 'string' && dict[key].length > 0,
        `ADMIN_TRANSLATIONS[${lang}].${key} must be a non-empty string`
      );
    }
  }
});

test('MANAGER_TRANSLATIONS has all required keys in all 4 languages', () => {
  const managerKeys = Object.keys(MANAGER_TRANSLATIONS.fa) as (keyof typeof MANAGER_TRANSLATIONS.fa)[];
  
  for (const lang of LANGUAGES) {
    const dict = MANAGER_TRANSLATIONS[lang];
    assert.ok(dict, `Missing MANAGER_TRANSLATIONS dictionary for ${lang}`);
    
    for (const key of managerKeys) {
      assert.ok(
        typeof dict[key] === 'string' && dict[key].length > 0,
        `MANAGER_TRANSLATIONS[${lang}].${key} must be a non-empty string`
      );
    }
  }
});

test('getLocalized correctly picks active language or fallback', () => {
  const dict = {
    fa: 'هاستل نمونه',
    en: 'Sample Hostel',
    ru: 'Пример хостела',
    hy: 'Օրինակելի հոսթել',
  };

  assert.equal(getLocalized(dict, 'fa'), 'هاستل نمونه');
  assert.equal(getLocalized(dict, 'en'), 'Sample Hostel');
  assert.equal(getLocalized(dict, 'ru'), 'Пример хостела');
  assert.equal(getLocalized(dict, 'hy'), 'Օրինակելի հոսթել');

  // Fallback when current lang is missing in dict
  const partialDict = { en: 'English Only' };
  assert.equal(getLocalized(partialDict, 'fa'), 'English Only');
});

test('getCityName and getAmenityLabel correctly resolve for all languages', () => {
  for (const lang of LANGUAGES) {
    const cityName = getCityName('Yerevan', lang);
    assert.ok(cityName && cityName.length > 0, `City name for Yerevan in ${lang} should not be empty`);

    const wifiLabel = getAmenityLabel('wifi', lang);
    assert.ok(wifiLabel && wifiLabel.length > 0, `Amenity label for wifi in ${lang} should not be empty`);
  }
});
