(function () {
    const PAGE_SIZE = 9;
    const DATA_URL = '/data/hotel-listing-data.json';

    const qs = (selector, root = document) => root.querySelector(selector);
    const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const norm = (value) => String(value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
    const slug = (value) => norm(value).replace(/\s+/g, '-');
    const esc = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

    const roomRanges = {
        '1': (rooms) => rooms < 50,
        '2': (rooms) => rooms >= 100,
        '3': (rooms) => rooms >= 150,
        '4': (rooms) => rooms >= 200,
        '5': (rooms) => rooms >= 250
    };

    const guestRanges = {
        '2': (pax) => pax >= 50 && pax <= 100,
        '3': (pax) => pax >= 100 && pax <= 150,
        '4': (pax) => pax >= 150 && pax <= 200,
        '5': (pax) => pax >= 200 && pax <= 250,
        '6': (pax) => pax >= 250 && pax <= 300,
        '7': (pax) => pax >= 300 && pax <= 350,
        '8': (pax) => pax >= 350 && pax <= 400
    };

    const weddingTypes = {
        '2': 'destination',
        '3': 'city',
        '4': 'resort',
        '5': 'palace',
        '6': 'luxury',
        '7': 'intimate'
    };

    function selectedValues(name) {
        return qsa(`input[name="${name}"]:checked`).map((input) => input.value);
    }

    function setCheckedFromUrl(name, params) {
        const values = new Set(params.getAll(name));
        if (!values.size) return;
        qsa(`input[name="${name}"]`).forEach((input) => {
            input.checked = values.has(input.value);
        });
    }

    function currentCitySlug() {
        const parts = window.location.pathname.replace(/^\/|\/$/g, '').split('/');
        if (parts.length === 2 && parts[0] === 'destination-wedding') return parts[1];
        return '';
    }

    function readState(data) {
        const params = new URLSearchParams(window.location.search);
        const cityIds = new Set(params.getAll('city_ids[]').concat(params.getAll('city_ids')));
        const citySearch = params.get('city_search');
        const pathCity = currentCitySlug();

        if (citySearch) {
            const city = data.cities.find((item) => norm(item.name) === norm(citySearch));
            if (city) cityIds.add(String(city.id));
        }

        if (pathCity && !cityIds.size) {
            const city = data.cities.find((item) => slug(item.name) === pathCity);
            if (city) cityIds.add(String(city.id));
        }

        setCheckedFromUrl('room_ranges[]', params);
        setCheckedFromUrl('guest_capacities[]', params);
        setCheckedFromUrl('wedding_types[]', params);

        return {
            cityIds: Array.from(cityIds),
            query: params.get('hotel_search') || '',
            page: Math.max(parseInt(params.get('page') || '1', 10) || 1, 1)
        };
    }

    function syncControls(state) {
        const citySelect = qs('#cityMultiSelect');
        const hotelSearch = qs('#hotelSearch');

        if (hotelSearch) hotelSearch.value = state.query;
        if (citySelect) {
            Array.from(citySelect.options).forEach((option) => {
                option.selected = state.cityIds.includes(option.value);
            });
            if (window.jQuery && window.jQuery.fn && window.jQuery.fn.select2) {
                window.jQuery(citySelect).select2({
                    placeholder: 'Search By City',
                    allowClear: true,
                    width: '100%',
                    dropdownParent: window.jQuery('body'),
                    language: { noResults: () => 'No cities found' }
                }).trigger('change.select2');
            }
        }
    }

    function stateFromControls() {
        const citySelect = qs('#cityMultiSelect');
        return {
            cityIds: citySelect ? Array.from(citySelect.selectedOptions).map((option) => option.value) : [],
            query: (qs('#hotelSearch') && qs('#hotelSearch').value.trim()) || '',
            page: 1
        };
    }

    function matchesAny(value, rules, selected) {
        return !selected.length || selected.some((key) => rules[key] && rules[key](value));
    }

    function filterHotels(hotels, state) {
        const roomSelected = selectedValues('room_ranges[]');
        const guestSelected = selectedValues('guest_capacities[]');
        const weddingSelected = selectedValues('wedding_types[]').map((value) => weddingTypes[value]).filter(Boolean);
        const citySet = new Set(state.cityIds.map(String));
        const query = norm(state.query);

        return hotels.filter((hotel) => {
            if (citySet.size && !citySet.has(String(hotel.city_id))) return false;
            if (query && !hotel.search.includes(query)) return false;
            if (!matchesAny(Number(hotel.rooms) || 0, roomRanges, roomSelected)) return false;
            if (!matchesAny(Number(hotel.capacity) || 0, guestRanges, guestSelected)) return false;
            if (weddingSelected.length && !weddingSelected.some((type) => hotel.types.includes(type))) return false;
            return true;
        });
    }

    function cardHtml(hotel) {
        const availabilityUrl = `/check-hotel-availability?hotel_search=${encodeURIComponent(hotel.name)}`;
        return `
            <div class="col-xxl-4 col-xl-6 col-lg-6 col-md-6">
                <div class="hotel-card">
                    <a href="${esc(hotel.url)}">
                        <img src="${esc(hotel.image)}" class="img-fluid hotel-img" alt="${esc(hotel.name)}" decoding="async" loading="lazy">
                    </a>
                    <div class="content">
                        <a href="${esc(hotel.url)}">
                            <h4 class="font-family01 fs-16 fw-500 mb-0 text-maroon-900" title="${esc(hotel.name)}">${esc(hotel.name)}</h4>
                        </a>
                        <p class="text-muted mb-2">
                            <img src="/user/assets/images/map-icon.svg" width="14" alt="" decoding="async" loading="lazy">
                            ${esc(hotel.city)}
                        </p>
                        <div class="d-flex flex-wrap align-items-center gap-3 mb-4">
                            <span class="text-warning fw-semibold"><i class="fa fa-solid fa-bed"></i> ${Number(hotel.rooms) || 0} Rooms</span>
                            <span class="text-warning fw-semibold"><i class="fa-solid fa-users" aria-hidden="true"></i> ${Number(hotel.capacity) || 0} Pax</span>
                        </div>
                        <div class="d-flex gap-2">
                            <a href="${esc(hotel.url)}" class="btn sm-btn font-family02 fw-600 fs-10 btn-details">DETAILS</a>
                            <a href="${availabilityUrl}" class="btn sm-btn font-family02 fw-600 fs-10 btn-availability">CHECK AVAILABILITY</a>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function paginationHtml(page, totalPages) {
        if (totalPages <= 1) return '';
        const items = [];
        const add = (p, label = p, disabled = false, active = false) => {
            if (disabled) items.push(`<span class="page-btn disabled">${label}</span>`);
            else if (active) items.push(`<span class="page-btn active">${label}</span>`);
            else items.push(`<a href="#" class="page-btn" data-page="${p}">${label}</a>`);
        };

        add(page - 1, '<i class="fa-light fa-angle-left"></i>', page <= 1);
        const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
        let last = 0;
        Array.from(pages).sort((a, b) => a - b).forEach((p) => {
            if (p - last > 1) add(0, '...', true);
            add(p, String(p), false, p === page);
            last = p;
        });
        add(page + 1, '<i class="fa-light fa-angle-right"></i>', page >= totalPages);
        return items.join('');
    }

    function updateUrl(state) {
        const params = new URLSearchParams();
        state.cityIds.forEach((id) => params.append('city_ids[]', id));
        selectedValues('room_ranges[]').forEach((value) => params.append('room_ranges[]', value));
        selectedValues('guest_capacities[]').forEach((value) => params.append('guest_capacities[]', value));
        selectedValues('wedding_types[]').forEach((value) => params.append('wedding_types[]', value));
        if (state.query) params.set('hotel_search', state.query);
        if (state.page > 1) params.set('page', String(state.page));
        const query = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
    }

    function init(data) {
        const form = qs('#filterForm');
        const grid = qs('.change-colm');
        const pagination = qs('.custom-pagination');
        const summary = qs('#cityHiddenInputs')?.nextElementSibling?.querySelector('.text-muted') || qs('.filter-widget + #cityHiddenInputs + .row .text-muted');
        if (!form || !grid) return;

        let state = readState(data);
        syncControls(state);

        function render(nextState) {
            state = Object.assign({}, state, nextState || {});
            const filtered = filterHotels(data.hotels, state);
            const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
            state.page = Math.min(Math.max(state.page, 1), totalPages);
            const start = filtered.length ? (state.page - 1) * PAGE_SIZE : 0;
            const visible = filtered.slice(start, start + PAGE_SIZE);

            grid.innerHTML = visible.length
                ? visible.map(cardHtml).join('')
                : '<div class="col-12"><p class="text-muted">No hotels match the selected filters.</p></div>';

            if (summary) {
                const first = filtered.length ? start + 1 : 0;
                const last = Math.min(start + PAGE_SIZE, filtered.length);
                summary.textContent = `Showing ${first} - ${last} of ${filtered.length} hotels`;
            }

            if (pagination) {
                pagination.innerHTML = paginationHtml(state.page, totalPages);
                qsa('[data-page]', pagination).forEach((link) => {
                    link.addEventListener('click', (event) => {
                        event.preventDefault();
                        render({ page: Number(link.dataset.page) || 1 });
                    });
                });
            }

            updateUrl(state);
        }

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            render(stateFromControls());
        });

        qsa('.filter-checkbox', form).forEach((input) => input.addEventListener('change', () => render(stateFromControls())));
        qs('#hotelSearch')?.addEventListener('input', (() => {
            let timer;
            return () => {
                clearTimeout(timer);
                timer = setTimeout(() => render(stateFromControls()), 250);
            };
        })());
        qs('#cityMultiSelect')?.addEventListener('change', () => render(stateFromControls()));
        qs('.btn-outline-secondary', form)?.addEventListener('click', (event) => {
            event.preventDefault();
            qsa('input[type="checkbox"]', form).forEach((input) => { input.checked = false; });
            const citySelect = qs('#cityMultiSelect');
            if (citySelect) {
                Array.from(citySelect.options).forEach((option) => { option.selected = false; });
                if (window.jQuery && window.jQuery.fn && window.jQuery.fn.select2) window.jQuery(citySelect).val(null).trigger('change.select2');
            }
            if (qs('#hotelSearch')) qs('#hotelSearch').value = '';
            render({ cityIds: [], query: '', page: 1 });
        });

        render(state);
    }

    if (!qs('#filterForm') || !qs('.change-colm')) return;
    fetch(DATA_URL)
        .then((response) => response.json())
        .then(init)
        .catch((error) => console.error('Hotel listing data failed to load:', error));
})();
