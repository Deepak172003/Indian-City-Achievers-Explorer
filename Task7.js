document.addEventListener('DOMContentLoaded', () => {
    const els = {
        form: document.querySelector('#searchForm'),
        input: document.querySelector('#searchInput'),
        results: document.querySelector('#results'),
        status: document.querySelector('#status'),
        sortBox: document.querySelector('#sortOptions'),
        sort: document.querySelector('#sortSelect'),
        professionFilter: document.querySelector('#professionFilter'),
        page: document.querySelector('#pagination'),
        more: document.querySelector('#loadMore'),
        share: document.querySelector('#shareBtn'),
        suggest: document.querySelector('#suggestions')
    };

    let searchTerm = '';
    let people = [];
    let pageNum = 1;
    let loading = false;
    const limit = 12;
    let timer;
    const delay = 500;
    let activeSuggestionIndex = -1; // for keyboard navigation

    // --- Caches ---
    const qidCache = new Map();
    const peopleCache = new Map();

    els.form.addEventListener('submit', async e => {
        e.preventDefault();
        if (loading) return;

        searchTerm = els.input.value.trim();
        if (!searchTerm) return;

        resetUI();
        setLoad(true, `Searching for "${searchTerm}"...`);

        let qid;
        if (qidCache.has(searchTerm.toLowerCase())) {
            qid = qidCache.get(searchTerm.toLowerCase());
        } else {
            qid = await getCityQID(searchTerm);
            qidCache.set(searchTerm.toLowerCase(), qid);
        }

        if (!qid) return done(`No data found for "${searchTerm}" in India.`, 'error');

        if (peopleCache.has(qid)) {
            people = peopleCache.get(qid);
        } else {
            people = await fetchAllPeople(qid);
            peopleCache.set(qid, people);
        }

        if (!people.length) return done(`No notable people found for "${searchTerm}".`, 'warning');

        populateProfessionFilter(people);
        render(people, 1);
        setMsg(`Found ${people.length} notable people from ${searchTerm}`, 'success');

        els.sortBox.style.display = '';
        els.share.style.display = '';
        setLoad(false);
    });

    els.sort.addEventListener('change', () => render(people, 1));
    els.professionFilter.addEventListener('change', () => render(people, 1));
    els.more.addEventListener('click', () => { pageNum++; render(people, pageNum); });

    els.input.addEventListener('input', () => {
        clearTimeout(timer);
        if (els.input.value.length > 2) {
            timer = setTimeout(() => suggestCities(els.input.value), delay);
        } else {
            els.suggest.style.display = 'none';
        }
    });

    // Keyboard navigation for suggestions
    els.input.addEventListener('keydown', (e) => {
        const items = els.suggest.querySelectorAll('.suggestion-item');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
            highlightSuggestion(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
            highlightSuggestion(items);
        } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
            e.preventDefault();
            items[activeSuggestionIndex].click();
        }
    });

    function highlightSuggestion(items) {
        items.forEach((item, idx) => {
            item.style.background = idx === activeSuggestionIndex ? '#f0f0f0' : '';
        });
    }

    document.addEventListener('click', e => {
        if (!els.suggest.contains(e.target) && e.target !== els.input) {
            els.suggest.style.display = 'none';
        }
    });

    els.share.addEventListener('click', () => {
        const link = `${location.origin}${location.pathname}?search=${encodeURIComponent(searchTerm)}`;
        navigator.clipboard.writeText(link).then(() => {
            els.share.textContent = 'Link copied!';
            setTimeout(() => els.share.textContent = 'Share Results', 2000);
        }).catch(() => {
            els.share.textContent = 'Copy failed!';
            setTimeout(() => els.share.textContent = 'Share Results', 2000);
        });
    });

    function render(list, page = 1) {
        const profession = els.professionFilter.value.toLowerCase();
        let filtered = [...list];

        if (profession) {
            filtered = filtered.filter(p => p.occupation.toLowerCase() === profession);
        }

        if (els.sort.value === 'name') {
            filtered.sort((a, b) => a.label.localeCompare(b.label));
        } else if (els.sort.value === 'birth') {
            filtered.sort((a, b) => (parseInt(a.birthYear) || 0) - (parseInt(b.birthYear) || 0));
        } else if (els.sort.value === 'death') {
            filtered.sort((a, b) => (parseInt(a.deathYear) || 0) - (parseInt(b.deathYear) || 0));
        }

        const start = (page - 1) * limit;
        const end = page * limit;
        const paginated = filtered.slice(start, end);

        if (page === 1) els.results.innerHTML = '';

        if (!paginated.length && page === 1) {
            els.results.innerHTML = `<p style="text-align:center;margin-top:20px;color:#777;">
                ${profession ? 'No people found for the selected profession.' : 'No results to display.'}
            </p>`;
            els.page.style.display = 'none';
            return;
        }

        els.results.innerHTML += paginated.map(p => `
            <div class="person-card" style="cursor:pointer;" onclick="window.open('https://www.wikidata.org/wiki/${p.id}', '_blank')">
                <div class="person-info">
                    <h3>${p.label}</h3>
                    ${p.occupation ? `<p>Profession: ${p.occupation}</p>` : ''}
                    ${p.birthYear ? `<p>Born: ${p.birthYear}</p>` : ''}
                    ${p.deathYear ? `<p>Died: ${p.deathYear}</p>` : ''}
                    <p style="color:#007bff;">View Details →</p>
                </div>
            </div>
        `).join('');

        els.page.style.display = filtered.length > end ? '' : 'none';
    }

    function setLoad(flag, messageText) {
        loading = flag;
        els.form.setAttribute('aria-busy', flag);
        els.input.disabled = flag;
        if (messageText) setMsg(messageText, 'info');
    }

    function setMsg(message, type) {
        els.status.textContent = message;
        els.status.className = `status ${type}`;
        els.status.style.display = '';
    }

    function done(message, type) {
        setMsg(message, type);
        setLoad(false);
        return false;
    }

    function resetUI() {
        els.results.innerHTML = '';
        els.page.style.display = 'none';
        els.sortBox.style.display = 'none';
        els.share.style.display = 'none';
        els.professionFilter.innerHTML = '<option value="">All</option>';
        pageNum = 1;
        people = [];
    }

    function populateProfessionFilter(list) {
        const professions = [...new Set(list.map(p => p.occupation).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b));
        els.professionFilter.innerHTML = '<option value="">All</option>' +
            professions.map(prof => `<option value="${prof}">${prof}</option>`).join('');
    }

    async function fetchAllPeople(qid) {
        let allPeople = [];
        let qidsToSearch = [qid];

        const subCities = await getSubCityQIDs(qid);
        if (subCities.length) qidsToSearch.push(...subCities);

        for (const id of qidsToSearch) {
            if (peopleCache.has(id)) {
                allPeople.push(...peopleCache.get(id));
                continue;
            }
            let off = 0;
            let batch;
            let peopleList = [];
            do {
                batch = await fetchPeople(id, off);
                peopleList.push(...batch);
                off += limit;
            } while (batch.length === limit);
            peopleCache.set(id, peopleList);
            allPeople.push(...peopleList);
        }
        return filterDuplicates(allPeople);
    }

    async function getCityQID(name) {
        const keywords = [
            "city", "town", "capital", "municipality", "metropolitan",
            "metropolitan area", "urban agglomeration", "region",
            "territory", "union territory", "national capital"
        ];

        const results = await wdSearch(name);

        const match = results.find(i => {
            const desc = (i.description || '').toLowerCase();
            return keywords.some(k => desc.includes(k));
        });

        let qid = match ? match.id : (results.length ? results[0].id : '');
        if (!qid) return '';

        const inIndia = await isCityInIndia(qid);
        return inIndia ? qid : '';
    }

    async function isCityInIndia(qid) {
        const query = `
          ASK {
            wd:${qid} (wdt:P17|wdt:P131*|^wdt:P131*|wdt:P31/wdt:P279*) wd:Q668.
          }
        `;
        try {
            const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            return data.boolean;
        } catch {
            return false;
        }
    }

    async function getSubCityQIDs(qid) {
        const query = `SELECT ?city WHERE { wd:${qid} wdt:P131 ?city. }`;
        try {
            const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error();
            const data = (await res.json()).results.bindings;
            return data.map(d => d.city.value.split('/').pop());
        } catch {
            return [];
        }
    }

    async function fetchPeople(qid, off = 0) {
        const query = `
          SELECT DISTINCT ?person ?personLabel ?birthYear ?deathYear ?occupationLabel WHERE {
            { ?person wdt:P19 ?place. ?place wdt:P131* wd:${qid}. }
            UNION { ?person wdt:P20 ?place. ?place wdt:P131* wd:${qid}. }
            UNION { ?person wdt:P551 ?place. ?place wdt:P131* wd:${qid}. }
            OPTIONAL { ?person wdt:P569 ?birthDate. }
            OPTIONAL { ?person wdt:P570 ?deathDate. }
            OPTIONAL { ?person wdt:P106 ?occupation.
              ?occupation rdfs:label ?occupationLabel. FILTER(LANG(?occupationLabel)="en")
            }
            SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
            BIND(IF(BOUND(?birthDate), YEAR(?birthDate), "") AS ?birthYear)
            BIND(IF(BOUND(?deathDate), YEAR(?deathDate), "") AS ?deathYear)
          }
          LIMIT ${limit} OFFSET ${off}
        `;

        try {
            const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error();
            let data = (await res.json()).results.bindings;
            return data.map(i => ({
                id: i.person.value.split('/').pop(),
                label: i.personLabel.value,
                birthYear: i.birthYear?.value || '',
                deathYear: i.deathYear?.value || '',
                occupation: i.occupationLabel?.value || ''
            }));
        } catch {
            setMsg("Failed to fetch data. Please try again later.", "error");
            setLoad(false);
            return [];
        }
    }

    async function wdSearch(name) {
        try {
            const res = await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&format=json&origin=*`);
            if (!res.ok) throw new Error();
            return (await res.json()).search;
        } catch {
            return [];
        }
    }

    function filterDuplicates(list) {
        const seen = new Set();
        return list.filter(p => !seen.has(p.id) && seen.add(p.id));
    }

    // ---------- NEW FAST AUTO-SUGGEST ----------
    async function suggestCities(text) {
        const query = `
            SELECT ?city ?cityLabel WHERE {
              ?city wdt:P31/wdt:P279* wd:Q515;
                    wdt:P17 wd:Q668;
                    rdfs:label ?cityLabel.
              FILTER(LANG(?cityLabel) = "en")
              FILTER(CONTAINS(LCASE(?cityLabel), "${text.toLowerCase()}"))
            }
            LIMIT 10
        `;
        try {
            const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error();
            const data = (await res.json()).results.bindings;
            const suggestions = data.map(d => ({
                label: d.cityLabel.value,
                id: d.city.value.split('/').pop()
            }));
            showSuggestions(suggestions);
        } catch {
            els.suggest.style.display = 'none';
        }
    }

    function showSuggestions(list) {
        if (!list.length) {
            els.suggest.style.display = 'none';
            return;
        }

        activeSuggestionIndex = -1;
        els.suggest.innerHTML = list.map(i =>
            `<div class="suggestion-item" data-city="${i.label}">${i.label}</div>`
        ).join('');

        els.suggest.querySelectorAll('.suggestion-item').forEach(div => {
            div.addEventListener('click', () => {
                els.input.value = div.dataset.city;
                els.suggest.style.display = 'none';
                els.form.dispatchEvent(new Event('submit'));
            });
        });

        els.suggest.style.display = '';
    }
    // -------------------------------------------

    const initialSearch = new URLSearchParams(window.location.search).get('search');
    if (initialSearch) {
        els.input.value = initialSearch;
        els.form.dispatchEvent(new Event('submit'));
    }
});
