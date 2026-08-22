const CurrencySwitcher = (() => {
    let currencies = [];
    const INR_CODE = 'INR';

    async function init() {
        try {
            currencies = await loadCurrencies();
        } catch (e) {
            console.error('Currency load failed', e);
            return;
        }

        const select = document.getElementById('currencySelect');
        if (!select) return;

        const saved = localStorage.getItem('selected_currency') || INR_CODE;
        if ([...select.options].some(o => o.value === saved)) {
            select.value = saved;
        }

        applyConversion(select.value);

        select.addEventListener('change', e => {
            savePreference(e.target.value).then(() => {
                window.location.reload();
            });
        });
    }

    async function fetchJson(url) {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('Request failed: ' + res.status);
        return res.json();
    }

    /**
     * The calculator dataset, from the database.
     *
     * The admin panel owns cities, hotels, prices and currencies now, so this
     * asks the API rather than the exported JSON. One request covers all four,
     * and it is kept for the life of the page -- the calculator asks for the
     * same data several times as the visitor changes city, hotel or month.
     *
     * The old static files remain as a fallback: if the API cannot be reached
     * the calculator still prices, using whatever shipped with the build.
     */
    let calculatorDataPromise = null;

    function loadCalculatorData() {
        if (calculatorDataPromise) return calculatorDataPromise;

        calculatorDataPromise = fetchJson('/api/calculator/data')
            .then(function (data) {
                if (!data || !data.prices) throw new Error('Malformed calculator data');
                return data;
            })
            .catch(function () {
                calculatorDataPromise = null;
                return Promise.all([
                    fetchJson('/data/calculator/cities.json').catch(function () { return []; }),
                    fetchJson('/data/calculator/hotels-by-city.json').catch(function () { return {}; }),
                    fetchJson('/data/calculator/prices.json').catch(function () { return {}; }),
                    fetchJson('/data/calculator/currencies.json').catch(function () { return []; }),
                ]).then(function (parts) {
                    return { cities: parts[0], hotelsByCity: parts[1], prices: parts[2], currencies: parts[3], hotels: [] };
                });
            });

        return calculatorDataPromise;
    }

    async function loadCurrencies() {
        return (await loadCalculatorData()).currencies || [];
    }

    function getCurrency(code) {
    return currencies.find(c => c.code?.toUpperCase() === code?.toUpperCase());
}

    function applyConversion(toCode) {
        const toCurrency = getCurrency(toCode);
        if (!toCurrency) return;

        document.querySelectorAll('[data-price-inr]').forEach(el => {
            const inrValue = parseFloat(el.getAttribute('data-price-inr'));
            if (isNaN(inrValue)) return;
            const usd       = inrValue / (currencies.find(c => c.code === INR_CODE)?.rate_to_usd || 83.50);
            const converted = usd * toCurrency.rate_to_usd;
            el.textContent  = formatPrice(converted, toCurrency);
        });

        document.dispatchEvent(new CustomEvent('currencyChanged', {
            detail: { currency: toCurrency }
        }));
    }

    function formatPrice(amount, currency) {
    if (currency.code === 'INR') {
        return formatIndianPrice(amount, currency.symbol);
    }
    return currency.symbol + ' ' + new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

function formatIndianPrice(amount, symbol) {
    if (amount >= 1e7) {
        return symbol + ' ' + (amount / 1e7).toFixed(2) + ' Cr';
    }
    if (amount >= 1e5) {
        return symbol + ' ' + (amount / 1e5).toFixed(2) + ' L';
    }
    return symbol + ' ' + new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

    async function savePreference(code) {
        localStorage.setItem('selected_currency', code);
        try {
            await fetch('/api/currencies/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ currency: code }),
            });
        } catch (error) {
            console.warn('Currency preference saved locally only', error);
        }
    }

    return { init, formatPrice };
})();

const ViraayaCalculatorData = (() => {
    const cache = {};
    const originalFetch = window.fetch.bind(window);

    function fetchJson(path) {
        if (!cache[path]) {
            cache[path] = originalFetch(path, { headers: { 'Accept': 'application/json' } })
                .then(response => {
                    if (!response.ok) throw new Error('Local calculator data unavailable: ' + path);
                    return response.json();
                });
        }
        return cache[path];
    }

    /**
     * The calculator dataset, from the database.
     *
     * This block has its own fetchJson and its own cache, so it needs its own
     * loader -- the one in the block above is not in scope here.
     *
     * The exported JSON files remain a fallback: if the API cannot be reached
     * the calculator still prices, from whatever shipped with the build.
     */
    let datasetPromise = null;

    function loadCalculatorData() {
        if (datasetPromise) return datasetPromise;

        datasetPromise = fetchJson('/api/calculator/data')
            .then(function (data) {
                if (!data || !data.prices) throw new Error('Malformed calculator data');
                return data;
            })
            .catch(function () {
                datasetPromise = null;
                return Promise.all([
                    fetchJson('/data/calculator/cities.json').catch(function () { return []; }),
                    fetchJson('/data/calculator/hotels-by-city.json').catch(function () { return {}; }),
                    fetchJson('/data/calculator/prices.json').catch(function () { return {}; }),
                    fetchJson('/data/calculator/currencies.json').catch(function () { return []; }),
                ]).then(function (parts) {
                    return { cities: parts[0], hotelsByCity: parts[1], prices: parts[2], currencies: parts[3], hotels: [] };
                });
            });

        return datasetPromise;
    }

    function normalizePrice(price) {
        price = price || {};
        return {
            room_price: parseFloat(price.room_price) || 0,
            lunch_price: parseFloat(price.lunch_price) || 0,
            hitea_price: parseFloat(price.hitea_price ?? price.hi_tea_price) || 0,
            hi_tea_price: parseFloat(price.hitea_price ?? price.hi_tea_price) || 0,
            dinner_price: parseFloat(price.dinner_price) || 0,
        };
    }

    /**
     * True when a hotel has a room rate in at least one month.
     *
     * A venue can be listed with all twelve months at 0.00 -- the dataset
     * carries the hotel but no rate card. Every calculator on the site reads a
     * missing price as zero, so without this test such a hotel is quoted at
     * zero rather than declared unpriced.
     *
     * The room rate is what decides it, not any of the four. Nine hotels carry
     * meal prices with no room rate, and those quote a wedding with real money
     * for the catering and nothing for the rooms -- a wrong total rather than
     * an obviously empty one, which is the worse of the two to show.
     */
    function hasRates(prices, hotelId) {
        const byMonth = (prices || {})[String(hotelId)];
        if (!byMonth) return false;
        return Object.keys(byMonth).some(function (month) {
            return normalizePrice(byMonth[month]).room_price > 0;
        });
    }

    async function hotelHasRates(hotelId) {
        return hasRates((await loadCalculatorData()).prices, hotelId);
    }

    async function getHotelName(hotelId) {
        const hotelsByCity = (await loadCalculatorData()).hotelsByCity || {};
        const id = String(hotelId);
        for (const hotels of Object.values(hotelsByCity)) {
            const match = hotels.find(hotel => String(hotel.id) === id);
            if (match) return match.hotel_name || match.name || '';
        }
        return '';
    }

    function monthFromDateString(value) {
        if (!value) return 'January';
        const parts = String(value).split('-');
        if (parts.length === 3) {
            const date = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            if (!Number.isNaN(date.getTime())) return date.toLocaleString('default', { month: 'long' });
        }
        return 'January';
    }

    function jsonResponse(data) {
        return new Response(JSON.stringify(data), {
            headers: { 'content-type': 'application/json; charset=utf-8' },
        });
    }

    async function getCurrencies() {
        return (await loadCalculatorData()).currencies || [];
    }

    async function getCities(search) {
        const query = String(search || '').trim().toLowerCase();
        const cities = (await loadCalculatorData()).cities || [];
        return query
            ? cities.filter(city => String(city.name || '').toLowerCase().includes(query))
            : cities;
    }

    async function getHotelsByCity(cityId) {
        const hotelsByCity = (await loadCalculatorData()).hotelsByCity || {};
        return hotelsByCity[String(cityId)] || [];
    }

    async function getHotelPrice(hotelId, month) {
        const prices = (await loadCalculatorData()).prices || {};
        return normalizePrice((prices[String(hotelId)] || {})[month]);
    }

    async function getHotelPrices(hotelIds, checkin) {
        const ids = (Array.isArray(hotelIds) ? hotelIds : [hotelIds]).filter(Boolean).map(String);
        const dataset = await loadCalculatorData();
        const cities = dataset.cities || [];
        const hotelsByCity = dataset.hotelsByCity || {};
        const prices = dataset.prices || {};
        const cityById = Object.fromEntries(cities.map(city => [String(city.id), city]));
        const hotelRecords = {};

        Object.entries(hotelsByCity).forEach(([cityId, hotels]) => {
            hotels.forEach(hotel => {
                hotelRecords[String(hotel.id)] = {
                    ...hotel,
                    hotel_name: hotel.hotel_name || hotel.name,
                    city: cityById[String(cityId)] || { id: cityId, name: '' },
                };
            });
        });

        const month = monthFromDateString(checkin);
        return ids
            // An unpriced hotel would compare at zero against real rates.
            .filter(id => hotelRecords[id] && hasRates(prices, id))
            .map(id => ({
                id,
                hotel_name: hotelRecords[id].hotel_name || hotelRecords[id].name,
                total_rooms: hotelRecords[id].total_rooms,
                prices: [{
                    ...normalizePrice((prices[id] || {})[month]),
                    hotel: {
                        city: hotelRecords[id].city,
                    },
                }],
            }));
    }

    function parseRequestUrl(input) {
        const rawUrl = typeof input === 'string' ? input : input?.url;
        try {
            return new URL(rawUrl, window.location.origin);
        } catch (e) {
            return null;
        }
    }

    function installFetchInterceptor() {
        window.fetch = function (input, init) {
            const url = parseRequestUrl(input);
            if (url && url.origin === window.location.origin) {
            if (url.pathname === '/api/currencies') {
                return getCurrencies()
                    .then(jsonResponse)
                    .catch(() => originalFetch(input, init));
            }
                if (url.pathname === '/get-cities') {
                    return getCities(url.searchParams.get('search')).then(jsonResponse);
                }
                if (url.pathname === '/get-hotels-by-city') {
                    return getHotelsByCity(url.searchParams.get('city')).then(jsonResponse);
                }
                if (url.pathname.startsWith('/get-hotels-by-city/')) {
                    const cityId = decodeURIComponent(url.pathname.split('/').filter(Boolean)[1] || '');
                    return getHotelsByCity(cityId).then(jsonResponse);
                }
                if (url.pathname.startsWith('/get-hotel-price/')) {
                    const [, hotelId = '', month = ''] = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
                    return getHotelPrice(hotelId, month).then(jsonResponse);
                }
            }
            return originalFetch(input, init);
        };
    }

    function getAjaxUrl(options) {
        return typeof options === 'string' ? options : options?.url;
    }

    function completeAjax($, deferred, options, ok, data) {
        const jqXHR = deferred.promise();
        const context = options.context || options;
        if (ok) {
            if (typeof options.success === 'function') options.success.call(context, data, 'success', jqXHR);
            deferred.resolveWith(context, [data, 'success', jqXHR]);
            if (typeof options.complete === 'function') options.complete.call(context, jqXHR, 'success');
        } else {
            if (typeof options.error === 'function') options.error.call(context, jqXHR, 'error', data);
            deferred.rejectWith(context, [jqXHR, 'error', data]);
            if (typeof options.complete === 'function') options.complete.call(context, jqXHR, 'error');
        }
    }

    function installJQueryAjaxInterceptor() {
        if (!window.jQuery || window.jQuery.__viraayaCalculatorAjaxInstalled) return;
        const $ = window.jQuery;
        const originalAjax = $.ajax.bind($);

        $.ajax = function (optionsOrUrl, maybeOptions) {
            const options = typeof optionsOrUrl === 'string'
                ? { ...(maybeOptions || {}), url: optionsOrUrl }
                : { ...(optionsOrUrl || {}) };
            const url = parseRequestUrl(getAjaxUrl(options));

            if (!url || url.origin !== window.location.origin) {
                return originalAjax(optionsOrUrl, maybeOptions);
            }

            let localPromise = null;

            if (url.pathname === '/api/currencies') {
                localPromise = getCurrencies();
            } else if (url.pathname === '/get-cities') {
                localPromise = getCities(options.data?.search || url.searchParams.get('search'));
            } else if (url.pathname === '/get-hotels-by-city') {
                localPromise = getHotelsByCity(options.data?.city || url.searchParams.get('city'));
            } else if (url.pathname.startsWith('/get-hotels-by-city/')) {
                const cityId = decodeURIComponent(url.pathname.split('/').filter(Boolean)[1] || '');
                localPromise = getHotelsByCity(cityId);
            } else if (url.pathname.startsWith('/get-hotel-price/')) {
                const [, hotelId = '', month = ''] = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
                localPromise = getHotelPrice(hotelId, month);
            } else if (url.pathname === '/get-hotel-prices') {
                const data = options.data || {};
                localPromise = getHotelPrices(data.hotel_ids || data.hotelIds || data['hotel_ids[]'] || [], data.checkin);
            }

            if (!localPromise) return originalAjax(optionsOrUrl, maybeOptions);

            const deferred = $.Deferred();
            const jqXHR = deferred.promise();
            jqXHR.abort = function () {
                deferred.rejectWith(options.context || options, [jqXHR, 'abort', 'abort']);
                return jqXHR;
            };
            localPromise
                .then(data => completeAjax($, deferred, options, true, data))
                .catch(error => completeAjax($, deferred, options, false, error));
            return jqXHR;
        };

        $.ajax.__viraayaCalculatorAjaxInstalled = true;
        window.jQuery.__viraayaCalculatorAjaxInstalled = true;
    }

    installFetchInterceptor();
    installJQueryAjaxInterceptor();

    return {
        getCurrencies,
        getCities,
        getHotelsByCity,
        getHotelPrice,
        getHotelPrices,
        normalizePrice,
        hotelHasRates,
        getHotelName,
    };
})();

window.ViraayaCalculatorData = ViraayaCalculatorData;

document.addEventListener('DOMContentLoaded', () => CurrencySwitcher.init());

/* ---------------------------------------------------------------------------
 * Price on request.
 *
 * Every calculator on the site -- the venue pages, the homepage, the dedicated
 * page, the city landing pages and the comparison tool -- reads a rate with
 * `parseFloat(price.room_price) || 0` and renders whatever comes out. A hotel
 * listed without a rate card therefore quotes a wedding at zero.
 *
 * This runs ahead of each page's own click handler, in the capture phase, and
 * asks for an enquiry instead. The check needs the dataset, which is a promise,
 * so the first click is swallowed and replayed once the answer is known.
 * ------------------------------------------------------------------------ */
(function () {
    'use strict';

    const OVERLAY_ID = 'viraaya-price-on-request';
    const GOLD = '#B98230';
    const INK = '#4A3C33';

    function api() {
        const data = window.ViraayaCalculatorData;
        return data && typeof data.hotelHasRates === 'function' ? data : null;
    }

    /** The hotels the visitor is asking about, whichever picker the page uses. */
    function selectedHotelIds() {
        const compare = Array.prototype.slice.call(document.querySelectorAll('.hotel-select'));
        if (compare.length) {
            return compare.map(el => String(el.value || '').trim()).filter(Boolean);
        }
        const picker = document.getElementById('hotelSelect');
        if (picker) {
            const value = String(picker.value || '').trim();
            return value ? [value] : [];
        }
        // Venue pages carry the hotel in a hidden input; there is no picker.
        const fixed = document.getElementById('hotelId');
        if (fixed) {
            const value = String(fixed.value || '').trim();
            return value ? [value] : [];
        }
        return [];
    }

    function unpricedAmong(ids) {
        const data = api();
        if (!data) return Promise.resolve([]);
        return Promise.all(ids.map(id => data.hotelHasRates(id).then(has => (has ? null : id))))
            .then(rows => rows.filter(Boolean))
            .catch(() => []);
    }

    function namesFor(ids) {
        const data = api();
        if (!data) return Promise.resolve([]);
        return Promise.all(ids.map(id => data.getHotelName(id).catch(() => '')))
            .then(names => names.filter(Boolean))
            .catch(() => []);
    }

    function sentence(names) {
        if (names.length === 0) return 'This hotel does not have published rates yet.';
        if (names.length === 1) return names[0] + ' does not have published rates yet.';
        const last = names[names.length - 1];
        return names.slice(0, -1).join(', ') + ' and ' + last + ' do not have published rates yet.';
    }

    function close() {
        const existing = document.getElementById(OVERLAY_ID);
        if (existing) existing.remove();
        document.removeEventListener('keydown', onKeydown, true);
    }

    function onKeydown(event) {
        if (event.key === 'Escape') close();
    }

    function enquire() {
        close();
        const modal = document.getElementById('BookConsultation');
        if (modal && window.bootstrap && window.bootstrap.Modal) {
            new window.bootstrap.Modal(modal).show();
            return;
        }
        window.location.href = '/contact';
    }

    function show(names) {
        close();

        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Price on request');
        overlay.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:20000',
            'background:rgba(30,22,18,0.55)',
            'display:flex', 'align-items:center', 'justify-content:center',
            'padding:24px'
        ].join(';');

        const card = document.createElement('div');
        card.style.cssText = [
            'background:#ffffff', 'border-radius:16px', 'max-width:420px', 'width:100%',
            'padding:32px 28px', 'text-align:center', 'box-shadow:0 24px 60px rgba(0,0,0,0.25)',
            'color:' + INK, 'font-family:inherit'
        ].join(';');

        const heading = document.createElement('h3');
        heading.textContent = 'Price on request';
        heading.style.cssText = 'margin:0 0 12px;font-size:22px;font-weight:700;color:' + INK;

        const body = document.createElement('p');
        body.textContent = sentence(names) + ' Tell us your dates and we will send a quote.';
        body.style.cssText = 'margin:0 0 24px;font-size:15px;line-height:1.6;color:' + INK;

        const cta = document.createElement('button');
        cta.type = 'button';
        cta.textContent = 'REQUEST A QUOTE';
        cta.style.cssText = [
            'display:block', 'width:100%', 'border:none', 'cursor:pointer',
            'background:' + GOLD, 'color:#ffffff', 'border-radius:40px',
            'padding:16px 24px', 'font-size:12px', 'font-weight:700', 'letter-spacing:0.04em'
        ].join(';');
        cta.addEventListener('click', enquire);

        const dismiss = document.createElement('button');
        dismiss.type = 'button';
        dismiss.textContent = 'Close';
        dismiss.style.cssText = [
            'display:block', 'width:100%', 'margin-top:12px', 'border:none', 'cursor:pointer',
            'background:transparent', 'color:' + INK, 'font-size:13px', 'padding:8px',
            'text-decoration:underline'
        ].join(';');
        dismiss.addEventListener('click', close);

        card.appendChild(heading);
        card.appendChild(body);
        card.appendChild(cta);
        card.appendChild(dismiss);
        overlay.appendChild(card);
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) close();
        });

        document.body.appendChild(overlay);
        document.addEventListener('keydown', onKeydown, true);
        cta.focus();
    }

    document.addEventListener('click', function (event) {
        const target = event.target;
        const button = target && target.closest ? target.closest('#calculateCost') : null;
        if (!button) return;

        // The replayed click, once the rates are known.
        if (button.dataset.viraayaRatesChecked === '1') {
            delete button.dataset.viraayaRatesChecked;
            return;
        }

        const ids = selectedHotelIds();
        // Nothing chosen yet: leave the page's own validation to say so.
        if (!ids.length || !api()) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        unpricedAmong(ids).then(function (unpriced) {
            // On the comparison page a mixed selection still compares the
            // priced hotels; getHotelPrices drops the rest.
            if (unpriced.length && unpriced.length === ids.length) {
                namesFor(unpriced).then(show);
                return;
            }
            button.dataset.viraayaRatesChecked = '1';
            button.click();
        });
    }, true);
})();
