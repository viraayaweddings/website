/**
 * The budget flow on the hotel cost calculators.
 *
 * The calculator used to ask a visitor to name a hotel and then quote that one
 * hotel. It now asks for a place, the dates, the rooms and meals per day, and a
 * whole-stay budget band -- and answers with the hotels in that place which
 * come in under the number, plus an enquiry that reaches the team with all of
 * it attached.
 *
 * Why this is one shared file rather than an edit to each page
 * -----------------------------------------------------------
 * The calculator's JavaScript is inlined per page in five separately drifted
 * copies (see docs/AUDIT-CALCULATORS.md). Writing the budget flow into them
 * would have made it six things to keep in step, on 272 pages rebuilt from
 * shells and stored rows that a deploy does not touch. So the page markup
 * changes -- the hotel picker becomes a budget picker -- and everything the new
 * field does happens here, on top of the script the page already has.
 *
 * How it takes over without rewriting the page's own script
 * ---------------------------------------------------------
 * Two hooks, and nothing else:
 *
 *  1. `#citySelect` change. The page's script enabled the check-in date only
 *     once a hotel had been picked, and there is no hotel to pick any more, so
 *     the pickers would stay greyed out forever. The disabled state is a class
 *     and two inline styles on flatpickr's own input, identical in all three
 *     copies, so it is undone from the outside without reaching for the page's
 *     picker objects.
 *
 *  2. `#calculateCost` click, in the CAPTURE phase, with
 *     `stopImmediatePropagation()`. The page's own handler would otherwise ask
 *     for a hotel and alert that none was chosen. Capture is the same mechanism
 *     currency-switcher.js's "Price on request" guard already uses on this
 *     button; that guard reads the hotel from `#hotelSelect`, finds no such
 *     element here, and returns without interfering.
 *
 * Everything else on the page -- the date pickers, the three-night limit, the
 * per-day grid, select2, the offcanvas -- is the page's own code, untouched.
 *
 * The arithmetic is deliberately NOT here. `/api/calculator/budget-match`
 * prices every hotel in the city against the grid and says which fit, so the
 * cost formula stays in one place on the server rather than becoming a sixth
 * copy in the browser.
 */
(function () {
    'use strict';

    var ENDPOINT = '/api/calculator/budget-match';
    var GOLD = '#B98230';
    var INK = '#4A3C33';

    /**
     * True on the pages carrying the full picker.
     *
     * Both fields, not either: `#citySelect` alone is also on /compare-hotel,
     * which keeps its own multi-hotel comparison and only gains the budget as
     * something recorded on the enquiry.
     */
    function isBudgetPicker() {
        return !!(document.getElementById('citySelect') && document.getElementById('budgetSelect')
            && document.getElementById('calculateCost'));
    }

    function el(id) {
        return document.getElementById(id);
    }

    function value(id) {
        var node = el(id);
        return node ? String(node.value || '').trim() : '';
    }

    function selectedLabel(id) {
        var node = el(id);
        if (!node || node.selectedIndex < 0) return '';
        var option = node.options[node.selectedIndex];
        return option ? String(option.text || '').trim() : '';
    }

    function escapeHtml(text) {
        return String(text == null ? '' : text).replace(/[&<>"']/g, function (character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    /* ---------------------------------------------------------------------
     * Money
     *
     * The same conversion the page's own summary does: amounts are held in
     * rupees and rendered through whichever currency the visitor picked, with
     * Indian digit grouping for INR. Falls back to plain rupees when the
     * currency list has not loaded, which is what every inline copy does too.
     * ------------------------------------------------------------------ */
    function currencyList() {
        if (Array.isArray(window.__currencies) && window.__currencies.length) {
            return Promise.resolve(window.__currencies);
        }
        var data = window.ViraayaCalculatorData;
        if (data && typeof data.getCurrencies === 'function') {
            return data.getCurrencies().catch(function () { return []; });
        }
        return Promise.resolve([]);
    }

    function makeFormatter() {
        return currencyList().then(function (all) {
            var selectedCode = 'INR';
            try {
                selectedCode = localStorage.getItem('selected_currency') || 'INR';
            } catch (error) {
                selectedCode = 'INR';
            }

            var inr = all.find(function (row) { return row.code === 'INR'; });
            var rate = parseFloat(inr && inr.rate_to_usd) || 0;
            var target = all.find(function (row) { return row.code === selectedCode; }) || inr || null;

            return function (amount) {
                var rupees = Number(amount) || 0;
                if (!rate || !target || target.code === 'INR') {
                    return '₹' + Math.round(rupees).toLocaleString('en-IN');
                }
                var converted = (rupees / rate) * target.rate_to_usd;
                return target.symbol + ' ' + new Intl.NumberFormat('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }).format(converted);
            };
        });
    }

    /* ---------------------------------------------------------------------
     * Reading the widget
     * ------------------------------------------------------------------ */
    function number(node) {
        var parsed = parseInt(node && node.value, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }

    /**
     * The per-day grid, in whichever markup the page uses.
     *
     * The full picker and the venue pages render `.day-section` rows with
     * `.rooms-input` and friends; /compare-hotel renders `.day-block` rows with
     * `days[1][rooms]`-style names and no classes at all. Reading only the
     * first shape is why the comparison enquiry went out with an empty
     * rooms-and-meals line -- it found no days and reported none.
     */
    function collectDays() {
        var sections = document.querySelectorAll('.day-section');
        if (sections.length) {
            return Array.prototype.map.call(sections, function (section) {
                return {
                    rooms: number(section.querySelector('.rooms-input')),
                    lunch: number(section.querySelector('.lunch-input')),
                    hitea: number(section.querySelector('.hitea-input')),
                    dinner: number(section.querySelector('.dinner-input')),
                };
            });
        }

        return Array.prototype.map.call(document.querySelectorAll('.day-block'), function (block, index) {
            var named = function (field) {
                return block.querySelector('[name="days[' + (index + 1) + '][' + field + ']"]')
                    || block.querySelector('[name$="[' + field + ']"]');
            };
            return {
                rooms: number(named('rooms')),
                lunch: number(named('lunch')),
                hitea: number(named('hitea')),
                dinner: number(named('dinner')),
            };
        });
    }

    function hasAnyInput(days) {
        return days.some(function (day) {
            return day.rooms > 0 || day.lunch > 0 || day.hitea > 0 || day.dinner > 0;
        });
    }

    /** A one-line description of the grid, for the enquiry. */
    function daysSummary(days) {
        return days
            .map(function (day, index) {
                return 'Day ' + (index + 1) + ': ' + day.rooms + ' rooms, '
                    + day.lunch + ' lunch, ' + day.hitea + ' hi-tea, ' + day.dinner + ' dinner';
            })
            .join(' | ');
    }

    /* ---------------------------------------------------------------------
     * The date pickers
     *
     * flatpickr's disabled state on these pages is `fp-disabled` plus two
     * inline styles on its own input, set by a `setPickerDisabled` helper that
     * is identical in all three copies of the script. Undoing it here needs no
     * access to the picker object, which is a closure variable the page never
     * exposes.
     * ------------------------------------------------------------------ */
    function setDateEnabled(id, enabled) {
        var input = el(id);
        if (!input) return;
        if (enabled) {
            input.classList.remove('fp-disabled');
            input.style.opacity = '1';
            input.style.cursor = 'pointer';
        } else {
            input.classList.add('fp-disabled');
            input.style.opacity = '0.5';
            input.style.cursor = 'not-allowed';
        }
    }

    /* ---------------------------------------------------------------------
     * The results panel
     * ------------------------------------------------------------------ */
    function hotelRow(hotel, format, highlight) {
        var capacity = hotel.total_rooms > 0
            ? '<span style="font-size:11px;color:#999;"> &middot; ' + hotel.total_rooms + ' rooms</span>'
            : '';
        var note = hotel.over_capacity
            ? '<div style="font-size:11px;color:#b3261e;margin-top:2px;">Fewer rooms than your busiest day needs</div>'
            : '';

        return ''
            + '<li style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;'
            + 'padding:10px 12px;border-radius:8px;margin-bottom:6px;'
            + 'background:' + (highlight ? '#FFF8F0' : '#fafafa') + ';'
            + 'border:1px solid ' + (highlight ? '#f0e0cc' : '#eee') + ';">'
            + '<div><span style="font-size:13px;color:' + INK + ';font-weight:600;">'
            + escapeHtml(hotel.name) + '</span>' + capacity + note + '</div>'
            + '<span style="font-size:13px;font-weight:600;color:' + GOLD + ';white-space:nowrap;">'
            + format(hotel.total) + '</span>'
            + '</li>';
    }

    function listBlock(title, hotels, format, highlight) {
        if (!hotels.length) return '';
        return ''
            + '<div class="mb-3">'
            + '<div style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#999;margin-bottom:8px;">'
            + escapeHtml(title) + '</div>'
            + '<ul style="list-style:none;padding:0;margin:0;">'
            + hotels.map(function (hotel) { return hotelRow(hotel, format, highlight); }).join('')
            + '</ul></div>';
    }

    /**
     * The enquiry.
     *
     * A real `<form method="post" action="/api/lead">`, so lead-forms.js picks
     * it up through its delegated submit listener and it gets the same
     * validation, the same CSRF handling and the same success panel as every
     * other form on the site -- none of which is reimplemented here.
     */
    function enquiryFormHtml(context) {
        var hidden = Object.keys(context).map(function (key) {
            return '<input type="hidden" name="' + escapeHtml(key) + '" value="' + escapeHtml(context[key]) + '">';
        }).join('');

        return ''
            + '<form method="post" action="/api/lead" data-form-name="Cost Calculator Budget Enquiry"'
            + ' class="viraaya-budget-enquiry mt-4 p-3" style="background:#fdf6f0;border:1px solid #f0e0cc;border-radius:10px;">'
            + hidden
            + '<div style="font-size:13px;font-weight:600;color:' + INK + ';margin-bottom:10px;">'
            + 'Send this to our team</div>'
            + '<div class="form-group mb-2"><input type="text" class="form-control" name="name"'
            + ' placeholder="Your name" required></div>'
            + '<div class="form-group mb-2"><input type="tel" class="form-control" name="phone"'
            + ' placeholder="Phone number" required></div>'
            + '<div class="form-group mb-3"><input type="email" class="form-control" name="email"'
            + ' placeholder="Email address" required></div>'
            + '<button type="submit" class="btn font-family03 fw-700 fs-13 text-uppercase w-100">Send Enquiry</button>'
            + '</form>';
    }

    function summaryHead(result, format) {
        var place = result.city ? result.city.name : '';
        var band = result.budget ? result.budget.label : 'Any budget';
        var fitting = result.hotels.filter(function (hotel) { return hotel.fits; });

        var headline = fitting.length
            ? fitting.length + ' ' + (fitting.length === 1 ? 'hotel' : 'hotels') + ' in ' + escapeHtml(place)
              + ' fit ' + escapeHtml(band)
            : 'No hotel in ' + escapeHtml(place) + ' lands inside ' + escapeHtml(band) + ' for these dates';

        // What tax was actually applied, from the answer -- not a phrase that
        // assumes it. An admin who unpublishes every line gets totals that are
        // subtotals, and this says so.
        var taxes = Array.isArray(result.taxes) ? result.taxes : [];
        var taxNote = taxes.length
            ? taxes.map(function (tax) { return escapeHtml(tax.label); }).join(' + ') + ' included'
            : 'before taxes';

        var subline = fitting.length
            ? 'Estimated for ' + result.nights + ' ' + (result.nights === 1 ? 'day' : 'days')
              + ', at ' + escapeHtml(result.month) + ' rates, ' + taxNote + '.'
            : 'The nearest options are below, cheapest first. Send us the enquiry and we will work the'
              + ' number with you.';

        return ''
            + '<h5 class="text-prime-dark fw600 mb-1">' + headline + '</h5>'
            + '<p class="font-family03" style="font-size:12px;color:#888;">' + subline + '</p>';
    }

    function renderResults(result, format) {
        var fitting = result.hotels.filter(function (hotel) { return hotel.fits; });
        var others = result.hotels.filter(function (hotel) { return !hotel.fits; });

        var body = summaryHead(result, format);

        body += listBlock('Within your budget', fitting, format, true);
        // Capped rather than dropped silently: a city with 30 priced hotels
        // would otherwise bury the enquiry form under a wall of rows.
        body += listBlock(
            fitting.length ? 'Outside your budget' : 'Closest to your budget',
            others.slice(0, 12),
            format,
            false,
        );
        if (others.length > 12) {
            body += '<p class="font-family03" style="font-size:11px;color:#999;">'
                + 'Showing the 12 closest of ' + others.length + ' other hotels here.</p>';
        }

        if (result.unpriced.length) {
            body += '<p class="font-family03" style="font-size:11px;color:#999;">'
                + result.unpriced.length + ' more '
                + (result.unpriced.length === 1 ? 'hotel is' : 'hotels are')
                + ' priced on request and are not costed above: '
                + escapeHtml(result.unpriced.map(function (row) { return row.name; }).join(', '))
                + '.</p>';
        }

        body += enquiryFormHtml({
            wedding_place: result.city ? result.city.name : '',
            budget: result.budget ? result.budget.label : '',
            check_in: value('checkIn'),
            check_out: value('checkOut'),
            nights: String(result.nights),
            rate_month: result.month,
            rooms_and_meals: daysSummary(collectDays()),
            shortlisted_hotels: (fitting.length ? fitting : result.hotels.slice(0, 5))
                .map(function (hotel) { return hotel.name; })
                .join(', '),
            source_page: document.title,
        });

        body += '<small class="d-block text-end font-family03 mt-3">'
            + 'No obligations. This is a preliminary estimate for planning clarity.</small>';

        return body;
    }

    function showPanel(html) {
        var offcanvas = el('offcanvasRight');
        if (!offcanvas) {
            window.alert('Could not show the results on this page.');
            return;
        }

        var target = offcanvas.querySelector('.offcanvas-body');
        if (!target) return;

        // The page keeps its disclaimer as a sibling of the body and moves it
        // in on each render; the inline scripts do the same dance.
        var disclaimer = document.getElementById('cost-summary-disclaimer');
        var disclaimerHtml = disclaimer ? disclaimer.outerHTML : '';
        var stray = offcanvas.querySelector(':scope > .disclaimer');
        if (stray) stray.remove();

        target.innerHTML = html + disclaimerHtml;
        target.scrollTop = 0;
        offcanvas.scrollTop = 0;

        if (window.bootstrap && window.bootstrap.Offcanvas) {
            window.bootstrap.Offcanvas.getOrCreateInstance(offcanvas).show();
        }
    }

    /* ---------------------------------------------------------------------
     * Wiring
     *
     * Hearing a <select> change, whichever kind of change it is
     * -------------------------------------------------------
     * `#citySelect` is a select2 widget on all twelve pages carrying the full
     * picker, and select2 announces a change with jQuery's `.trigger('change')`.
     * That is not a DOM event. jQuery walks its own handler registry from the
     * element up to the document and calls what it finds there; a listener
     * added with `addEventListener` is not in that registry and never runs. So
     * the city change that is supposed to ungrey the date pickers was heard by
     * nobody, the pickers stayed disabled, and with no dates there was no day
     * grid and no way to reach a result. That was the whole of the breakage.
     *
     * Both registries, then, and the same handler in each: jQuery's when jQuery
     * is on the page, and the DOM's for `#budgetSelect` -- a plain <select>
     * whose change is a real event -- and for any page that does not load
     * jQuery at all.
     *
     * A real change on a plain <select> reaches both, and jQuery hands the
     * native event over as `originalEvent` when it does, so ignoring a repeat
     * of the event just seen keeps the handler running once either way. A
     * jQuery-triggered change carries no `originalEvent`, so it is never
     * mistaken for one already handled.
     * ------------------------------------------------------------------ */

    /**
     * jQuery, whenever it turns up.
     *
     * Every page under site-public/ loads jQuery above this script, but these
     * pages are also served from stored rows an admin can edit, so this file
     * cannot insist on the order. Retrying at DOMContentLoaded and at load
     * means a page that moved the tag loses nothing.
     */
    function withJQuery(bind) {
        var bound = false;

        function attempt() {
            if (bound || !window.jQuery) return;
            bound = true;
            bind(window.jQuery);
        }

        attempt();
        if (bound) return;
        document.addEventListener('DOMContentLoaded', attempt);
        window.addEventListener('load', attempt);
    }

    function onSelectChange(id, handler) {
        var lastSeen = null;

        function once(event) {
            var source = (event && event.originalEvent) || event;
            if (source && source === lastSeen) return;
            lastSeen = source;
            handler();
        }

        document.addEventListener('change', function (event) {
            if (event.target && event.target.id === id) once(event);
        });

        withJQuery(function (jq) {
            jq(document).on('change', '#' + id, once);
        });
    }

    function onCityChange() {
        if (!isBudgetPicker()) return;
        var hasCity = !!value('citySelect');
        setDateEnabled('checkIn', hasCity);
        if (!hasCity) {
            setDateEnabled('checkOut', false);
        }
    }

    // Delegated, so it runs after the page's own handler -- which is what
    // clears the day grid -- rather than racing it.
    onSelectChange('citySelect', onCityChange);

    function run(button) {
        var days = collectDays();

        if (!value('citySelect')) {
            window.alert('Please select a place.');
            return;
        }
        if (!value('budgetSelect')) {
            window.alert('Please select a budget.');
            return;
        }
        if (!value('checkIn')) {
            window.alert('Please select a Check-In date.');
            return;
        }
        if (!hasAnyInput(days)) {
            window.alert('Please enter at least one value greater than 0 to see hotels in your budget.');
            return;
        }

        var label = button.textContent;
        button.textContent = 'Finding hotels...';
        button.disabled = true;

        var payload = {
            cityId: value('citySelect'),
            checkIn: value('checkIn'),
            checkOut: value('checkOut'),
            budget: value('budgetSelect'),
            days: days,
        };

        Promise.all([
            fetch(ENDPOINT, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload),
            }).then(function (response) {
                return response.json().then(function (data) { return { ok: response.ok, data: data }; });
            }),
            makeFormatter(),
        ])
            .then(function (parts) {
                var result = parts[0];
                var format = parts[1];
                if (!result.ok || !result.data || result.data.ok === false) {
                    window.alert((result.data && result.data.message) || 'Could not work out costs right now.');
                    return;
                }
                showPanel(renderResults(result.data, format));
            })
            .catch(function () {
                window.alert('Could not work out costs right now. Please try again.');
            })
            .finally(function () {
                button.textContent = label;
                button.disabled = false;
            });
    }

    // Capture phase: the page's own click handler asks for a hotel that no
    // longer exists on these pages, so it must not run at all.
    document.addEventListener('click', function (event) {
        if (!isBudgetPicker()) return;
        var button = event.target && event.target.closest ? event.target.closest('#calculateCost') : null;
        if (!button) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        run(button);
    }, true);

    // The place may already be chosen when the script loads -- a bfcache
    // restore, or a browser repopulating the select on reload.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onCityChange);
    } else {
        onCityChange();
    }

    /* ---------------------------------------------------------------------
     * The budget on every other enquiry
     *
     * The venue pages and /compare-hotel keep their own calculators: on a venue
     * page the hotel IS the page, and on the comparison page choosing hotels is
     * the entire tool, so neither is turned into a budget search. Both still
     * carry the band, and it still has to reach the team -- "see the list of
     * hotels and send us the enquiry also" was one request, not two.
     *
     * A hidden input kept in sync, rather than a field added at submit time.
     * lead-forms.js reads the form in its own delegated submit listener, and
     * which of two capture-phase listeners runs first depends on script order;
     * a field that is simply always there does not care.
     * ------------------------------------------------------------------ */
    var LEAD_ACTIONS = ['/api/lead', '/contact/save', '/blog-form-submit', '/get_in_touch/store'];

    function leadForms() {
        return Array.prototype.filter.call(document.querySelectorAll('form'), function (form) {
            if ((form.getAttribute('method') || 'GET').toUpperCase() !== 'POST') return false;
            // The panel's own form already carries the budget as a hidden field.
            if (form.classList.contains('viraaya-budget-enquiry')) return false;
            var action = form.getAttribute('action') || '';
            try {
                action = new URL(action, window.location.href).pathname;
            } catch (error) {
                return false;
            }
            return LEAD_ACTIONS.indexOf(action) !== -1;
        });
    }

    function syncBudgetToLeadForms() {
        var picker = el('budgetSelect');
        if (!picker) return;
        var label = selectedLabel('budgetSelect');
        // The placeholder row is not a budget; lead-forms.js drops empty values.
        var chosen = picker.value ? label : '';

        leadForms().forEach(function (form) {
            var field = form.querySelector('input[name="budget"][data-viraaya-budget="1"]');
            if (!field) {
                field = document.createElement('input');
                field.type = 'hidden';
                field.name = 'budget';
                field.setAttribute('data-viraaya-budget', '1');
                form.appendChild(field);
            }
            field.value = chosen;
        });
    }

    onSelectChange('budgetSelect', function () {
        syncBudgetToLeadForms();
        syncCompareEnquiry();
    });

    /* ---------------------------------------------------------------------
     * The enquiry on /compare-hotel
     *
     * That page carries no form at all -- it compares hotels and stops there --
     * so a budget picked on it would have had nowhere to go. The comparison
     * itself is untouched; once its result table renders, the same enquiry form
     * the budget panel uses is appended beneath it, carrying the band, the
     * dates, the grid and the hotels compared.
     *
     * Driven by an observer rather than by the button, because the page renders
     * the table from its own fetch and there is no callback to hang this on.
     * ------------------------------------------------------------------ */
    var COMPARE_FORM_ID = 'viraaya-compare-enquiry';

    /**
     * What the form last said, so appending it does not restart the observer.
     *
     * Adding the form is itself a mutation of the node being watched, so the
     * observer fires again on our own write. A flag would not help: observer
     * callbacks are microtasks and any synchronous flag is already back down by
     * the time one runs. Comparing what we are about to render against what is
     * already there ends the cycle on the second pass instead, and it is also
     * what keeps the form current when the visitor changes hotels or dates.
     */
    var compareSignature = null;

    function comparedHotelNames() {
        return Array.prototype.map.call(document.querySelectorAll('.hotel-select'), function (select) {
            return select.value && select.selectedIndex >= 0
                ? String(select.options[select.selectedIndex].text || '').trim()
                : '';
        }).filter(Boolean).join(', ');
    }

    function syncCompareEnquiry() {
        var section = el('resultSection');
        var host = section && section.querySelector('.comparison-card');
        if (!host || !el('budgetSelect')) return;
        // Nothing compared yet: the page keeps the section hidden until it has
        // a table, and an enquiry about no hotels is not worth sending.
        if (section.offsetParent === null) return;

        var html = enquiryFormHtml({
            budget: value('budgetSelect') ? selectedLabel('budgetSelect') : '',
            check_in: value('checkin'),
            check_out: value('checkout'),
            rooms_and_meals: daysSummary(collectDays()),
            shortlisted_hotels: comparedHotelNames(),
            source_page: document.title,
        });

        if (html === compareSignature && el(COMPARE_FORM_ID)) return;
        compareSignature = html;

        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        var form = wrapper.firstElementChild;
        form.id = COMPARE_FORM_ID;

        // Rebuilt rather than patched: the visitor may have changed the
        // hotels, the dates or the band since the last comparison.
        var existing = el(COMPARE_FORM_ID);
        if (existing) existing.replaceWith(form);
        else host.appendChild(form);
    }

    function watchCompareResults() {
        var section = el('resultSection');
        if (!section || !document.querySelector('.hotel-select') || !el('budgetSelect')) return;

        new MutationObserver(function () {
            syncCompareEnquiry();
        }).observe(section, { attributes: true, attributeFilter: ['style', 'class'], childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            syncBudgetToLeadForms();
            watchCompareResults();
        });
    } else {
        syncBudgetToLeadForms();
        watchCompareResults();
    }
})();
