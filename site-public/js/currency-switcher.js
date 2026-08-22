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
            .filter(id => hotelRecords[id])
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
    };
})();

window.ViraayaCalculatorData = ViraayaCalculatorData;

document.addEventListener('DOMContentLoaded', () => CurrencySwitcher.init());
