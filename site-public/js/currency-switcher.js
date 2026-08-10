const CurrencySwitcher = (() => {
    let currencies = [];
    const INR_CODE = 'INR';

    async function init() {
        try {
            const res  = await fetch('/api/currencies');
            currencies = await res.json();
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
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code }),
            });
        } catch (e) { /* silent */ }
    }

    return { init, formatPrice };
})();

document.addEventListener('DOMContentLoaded', () => CurrencySwitcher.init());