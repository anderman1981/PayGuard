import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, money, date, resolveLang, normalizeLang, isLang } from '../src/i18n/index.js';
import { MESSAGES, LANGS, FALLBACK_LANG } from '../src/i18n/messages.js';
import { detectLang, scoreLanguages } from '../src/i18n/detect.js';
import {
  isValidIban, isValidBic, isValidAbaRouting, isIsoDate, checkTotals,
  currencyDecimals, isCurrencyCode, isCountryCode,
} from '../src/validators/international.js';

test('catálogo: toda clave tiene todos los idiomas', () => {
  for (const [key, entry] of Object.entries(MESSAGES)) {
    for (const lang of LANGS) assert.equal(typeof entry[lang], 'string', `${key}/${lang}`);
  }
});

test('traducción e interpolación', () => {
  assert.equal(t('outcome.PAY', 'es'), 'Pagada');
  assert.equal(t('outcome.PAY', 'de'), 'Bezahlt');
  assert.equal(t('r04.notAllowed', 'en', { name: 'Acme' }), '“Acme” is not on the allowed beneficiary list');
  assert.equal(t('clave.inexistente', 'es'), 'clave.inexistente');
  assert.equal(t('r04.notAllowed', 'es', {}), '«{name}» no está en la lista de beneficiarios permitidos');
});

test('normalización de etiquetas de idioma', () => {
  assert.equal(normalizeLang('es-CO'), 'es');
  assert.equal(normalizeLang('PT_br'), 'pt');
  assert.equal(normalizeLang('ja'), null);
  assert.equal(normalizeLang(null), null);
  assert.ok(isLang('fr') && !isLang('xx'));
});

test('cadena de preferencia de idioma', () => {
  assert.equal(resolveLang({ requested: 'de', acceptLanguage: 'es', document: 'pt' }), 'de');
  assert.equal(resolveLang({ acceptLanguage: 'ja,fr;q=0.9', document: 'pt' }), 'fr');
  assert.equal(resolveLang({ document: 'pt' }), 'pt');
  assert.equal(resolveLang({ company: 'es-ES' }), 'es');
  assert.equal(resolveLang({}), FALLBACK_LANG);
});

test('formato de dinero y fecha por idioma', () => {
  assert.match(money(1234.5, 'USD', 'en'), /1,234\.50/);
  assert.match(money(1234.5, 'EUR', 'de'), /1\.234,50/);
  assert.equal(date('2026-10-16', 'en').includes('2026'), true);
  assert.equal(date('2026-01-01', 'es').includes('2026'), true);
});

test('detección de idioma de la factura', () => {
  assert.equal(detectLang('FACTURA N° 123\nSubtotal: 100\nTotal a pagar: 119\nVencimiento: 30 días'), 'es');
  assert.equal(detectLang('INVOICE 123\nBill to: Acme\nAmount due: 500\nDue date: Nov 1'), 'en');
  assert.equal(detectLang('RECHNUNG 9\nZwischensumme 100\nMehrwertsteuer 19\nGesamtbetrag 119'), 'de');
  assert.equal(detectLang('FATURA 7\nVencimento 10/11\nValor total 300\nFornecedor X'), 'pt');
  assert.equal(detectLang('FACTURE 12\nSous-total 100\nTVA 20\nNet à payer 120'), 'fr');
  assert.equal(detectLang('FATTURA 3\nImponibile 100\nScadenza 30/11\nPartita IVA 123'), 'it');
});

test('detección devuelve null sin evidencia suficiente', () => {
  assert.equal(detectLang(''), null);
  assert.equal(detectLang('123456'), null);
  assert.equal(detectLang('hola mundo esto no es una factura'), null);
  assert.ok(scoreLanguages('invoice amount due').length === LANGS.length);
});

test('IBAN: válidos e inválidos', () => {
  assert.ok(isValidIban('DE89 3704 0044 0532 0130 00'));
  assert.ok(isValidIban('GB82WEST12345698765432'));
  assert.ok(!isValidIban('DE89370400440532013001'));
  assert.ok(!isValidIban('XX00'));
  assert.ok(!isValidIban(''));
});

test('BIC y ABA routing', () => {
  assert.ok(isValidBic('DEUTDEFF'));
  assert.ok(isValidBic('DEUTDEFF500'));
  assert.ok(!isValidBic('DEUT1EFF'));
  assert.ok(isValidAbaRouting('111000025'));
  assert.ok(!isValidAbaRouting('111000026'));
  assert.ok(!isValidAbaRouting('1234'));
});

test('fechas ISO reales', () => {
  assert.ok(isIsoDate('2026-10-16'));
  assert.ok(!isIsoDate('2026-02-31'));
  assert.ok(!isIsoDate('16/10/2026'));
  assert.ok(!isIsoDate(null));
});

test('decimales por divisa y códigos', () => {
  assert.equal(currencyDecimals('JPY'), 0);
  assert.equal(currencyDecimals('KWD'), 3);
  assert.equal(currencyDecimals('usd'), 2);
  assert.ok(isCurrencyCode('COP') && !isCurrencyCode('cop'));
  assert.ok(isCountryCode('CO') && !isCountryCode('COL'));
});

test('cuadre de totales respeta la escala de la divisa', () => {
  assert.ok(checkTotals({ subtotal: 100, tax: 19, total: 119, currency: 'USD' }).ok);
  assert.ok(checkTotals({ subtotal: 100, tax: 19, withholdings: 2.5, total: 116.5, currency: 'USD' }).ok);
  assert.ok(!checkTotals({ subtotal: 100, tax: 19, total: 130, currency: 'USD' }).ok);
  assert.ok(checkTotals({ subtotal: 10000, tax: 1000, total: 11001, currency: 'JPY' }).ok);
  assert.equal(checkTotals({ subtotal: 100, tax: 0, total: 150, currency: 'USD' }).expected, 100);
});
