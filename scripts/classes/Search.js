export default function Search() {
    const SearchData = {
        searchboxElement: "",
        filterChipElements: "",
        searchableElements: "",
        activeFilterList: "",
    };

    SearchData.currentQueries = [];
    SearchData.checkedFilters = [];
    function initializeSearchElements(searchElements) {
        const { searchBox, filterSpans, activeFilterList, searchableElements } = searchElements;
        SearchData.searchboxElement = searchBox;
        SearchData.filterChipElements = filterSpans;
        SearchData.activeFilterList = activeFilterList;
        SearchData.searchableElements = searchableElements;
        console.log(SearchData);
    }

    function removeAllFilterSpans(parent) {
        Array.from(parent.querySelectorAll(".filter-span")).forEach((el) => {
            el.remove();
        });
    }
    function updateActiveFilterList() {
        const { activeFilterList } = SearchData;
        removeAllFilterSpans(activeFilterList);
        SearchData.checkedFilters.forEach((id) => {
            let filterChip = document.querySelector(`#${id}`);
            let query = getCheckboxLabel(filterChip);
            let newFilterSpan = createFilterSpanFromString(query);
            activeFilterList.append(newFilterSpan);
            newFilterSpan.querySelector("input").addEventListener("change", () => {
                filterChip.click();
            });
        });
        if (SearchData.checkedFilters.length === 0) {
            activeFilterList.classList.add("hidden");
        } else {
            activeFilterList.classList.remove("hidden");
        }
    }

    // https : //
    // stackoverflow.com/questions/19434241/how-i-can-get-the-text-of-a-checkbox
    function getCheckboxLabel(checkbox) {
        if (checkbox.parentNode.tagName === "LABEL") {
            return checkbox.parentNode;
        }
        if (checkbox.id) {
            return document.querySelector('label[for="' + checkbox.id + '"]').dataset.name;
        }
    }

    function convert(text) {
        return text.toLowerCase().replace(/-/, " ");
    }
    function trim(text) {
        return text.replace(/[\n\r]+|[\s]{2,}/g, " ").trim();
    }

    function htmlToElement(html) {
        var template = document.createElement("template");
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }

    function createFilterSpanFromString(text) {
        let string = `
  <span class="filter-span">
<input
                    class="active-filter"
                    id="${text}-active"
                    name="${text}"
                    checked
                    type="checkbox" />
                <label for="${text}-active">${text}</label>
                </span>
    `;
        return htmlToElement(string);
    }
    function filterSearch() {
        const { searchboxElement, searchableElements } = SearchData;
        let query = searchboxElement.value.toLowerCase(); // get the search box's value
        let filterText = [...SearchData.currentQueries];
        searchableElements.forEach((card) => {
            let match = true;

            if (filterText.length > 0) {
                match = filterText.some((text) => convert(card.innerText).includes(text));
            }
            let meetsQuery = convert(card.innerText).includes(query);
            if (match && meetsQuery) {
                card.classList.remove("is-hidden");
            } else {
                card.classList.add("is-hidden");
            }
        });
    }

    function filterAll() {
        let noFilters = false;
        let searchBoxQuery = document.querySelector("#search-box").value.toLowerCase();

        let checkboxes = Array.from(
            document.querySelectorAll("input[type='checkbox']:checked:not(#show-deceased):not(.active-filter)")
        );

        let filterChipIDs = checkboxes.map((box) => box.getAttribute("id"));

        let filterText = checkboxes.map((box) => {
            return trim(box.parentNode.querySelector("label").textContent.toLowerCase());
        });

        SearchData.currentQueries = [...filterText];
        SearchData.checkedFilters = [...filterChipIDs];

        if (SearchData.currentQueries.length === 0) {
            noFilters = true;
        }

        // go through the cards and filter the ones that match the current queries

        updateActiveFilterList();
        // if there are no filters
        if (noFilters) {
            let meetsQuery = true;

            // toggle all of our cards to be visible, if they meet the search query too, if
            // there is one
            galleryCards.forEach((card) => {
                if (searchBoxQuery) {
                    meetsQuery = convert(card.innerText).includes(searchBoxQuery);
                }
                if (meetsQuery) {
                    card.classList.remove("is-hidden");
                }
            });
        } else {
            galleryCards.forEach((card) => {
                let meetsQuery = true; // default value in case there isn't a query
                let match = filterText.some((text) => convert(card.innerText).includes(text));
                if (searchBoxQuery) {
                    meetsQuery = convert(card.innerText).includes(searchBoxQuery);
                }
                if (match && meetsQuery) {
                    // if the filter is mattched
                    card.classList.remove("is-hidden");
                } else {
                    card.classList.add("is-hidden");
                }
            });
        }
    }

    const searchActions = {
        change: {
            filterAll: {
                handler: () => {
                    filterAll();
                },
            },
        },
        input: {
            filterSearch: {
                handler: (event) => {
                    filterSearch(event);
                },
            },
        },
    };
    function addListeners() {}
    return {
        filterAll,
        filterSearch,
        initializeSearchElements,
    };
}
