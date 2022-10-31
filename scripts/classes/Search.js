let galleryCards;
let activeFilterList;
let expandButton;
let filterSection;
let deceasedFilter;
let deceasedPeople;
var SearchData = {};

SearchData.currentQueries = [];
SearchData.checkedFilters = [];
export class Search {
    static onSearchPageLoad(app) {
        console.log("Search has been loaded");
        expandButton = app.querySelector(".expand-button");
        filterSection = app.querySelector(".filter-section");
        galleryCards = app.querySelectorAll(".card");
        deceasedFilter = app.querySelector("#Deceased");
        activeFilterList = app.querySelector(".active-filters");
        expandButton.addEventListener("click", (event) => {
            filterSection.classList.toggle("expanded");
        });
        deceasedPeople = Array.from(galleryCards).filter((card) =>
            card.innerText.toLowerCase().includes("condition/deceased")
        );

        // hide all of the "deceased" people by default
        deceasedPeople.forEach((card) => {
            card.classList.add("is-hidden-deceased");
        });

        deceasedFilter.disabled = true;
        // disable the status filter
        game.characterPopout.characterSearch = app;
    }

    static doesMatchFilter(filter, className) {
        galleryCards.forEach((card) => {
            if (card.innerText.toLowerCase().includes(filter)) {
                card.classList.remove(className);
            }
        });
    }

    static toggleAll(event) {
        let toggle = event.currentTarget;
        // let deceasedFilter = game.characterPopout.characterSearch.querySelector("#Condition/Deceased");
        deceasedPeople.forEach((card) => {
            if (toggle.checked) {
                card.classList.remove("is-hidden-deceased");
                deceasedFilter.disabled = false;
            } else {
                card.classList.add("is-hidden-deceased");
                if (deceasedFilter.checked) {
                    deceasedFilter.click();
                }
                // deceasedFilter.checked = false;
                deceasedFilter.disabled = true;
            }
        });
    }

    static filterSearch(event) {
        let searchBox = event.currentTarget;
        let query = searchBox.value.toLowerCase(); // get the search box's value
        let filterText = [...SearchData.currentQueries];
        galleryCards.forEach((card) => {
            let match = true;
            if (filterText.length > 0) {
                match = filterText.some((text) => card.innerText.toLowerCase().includes(text));
            }
            let meetsQuery = card.innerText.toLowerCase().includes(query);
            if (match && meetsQuery) {
                card.classList.remove("is-hidden");
            } else {
                card.classList.add("is-hidden");
            }
        });
    }

    static filterAll() {
        let noFilters = false;
        // let filterChip = event.currentTarget;
        let searchBoxQuery = game.characterPopout.characterSearch.querySelector("#search-box").value.toLowerCase();
        function getCheckboxLabel(checkbox) {
            if (checkbox.parentNode.tagName === "LABEL") {
                return checkbox.parentNode;
            }
            if (checkbox.id) {
                return game.characterPopout.characterSearch.querySelector('label[for="' + checkbox.id + '"]').dataset
                    .name;
            }
        }
        let checkboxes = Array.from(
            game.characterPopout.characterSearch.querySelectorAll(
                "input[type='checkbox']:checked:not(#show-deceased):not(.active-filter)"
            )
        );

        let filterChipIDs = checkboxes.map((box) => box.getAttribute("id"));

        let filterText = checkboxes.map((box) => {
            return box.parentNode.querySelector("label").textContent.toLowerCase();
            // if (getCheckboxLabel !== undefined) {
            //     console.log("Checkbox label", getCheckboxLabel)
            //     return getCheckboxLabel(box).toLowerCase()
            // } else {

            //     return " ";
            // }
        });
        // let filterText = Array.from(game.characterPopout.characterSearch.querySelectorAll("input[type='checkbox']:checked:not(#show-deceased)")).map(
        //     (box) => getCheckboxLabel(box).toLowerCase()
        // );
        //.textContent.toLowerCase());

        SearchData.currentQueries = [...filterText];
        SearchData.checkedFilters = [...filterChipIDs];

        if (SearchData.currentQueries.length === 0) {
            noFilters = true;
        }

        console.log("After filter chip change", filterText);
        // go through the cards and filter the ones that match the current queries

        updateActiveFilterList();
        // if there are no filters
        if (noFilters) {
            let meetsQuery = true;

            // toggle all of our cards to be visible, if they meet the search query too, if
            // there is one
            galleryCards.forEach((card) => {
                if (searchBoxQuery) {
                    meetsQuery = card.innerText.toLowerCase().includes(searchBoxQuery);
                }
                if (meetsQuery) {
                    card.classList.remove("is-hidden");
                }
            });
        } else {
            galleryCards.forEach((card) => {
                let meetsQuery = true; // default value in case there isn't a query
                let match = filterText.some((text) => card.innerText.toLowerCase().includes(text));
                if (searchBoxQuery) {
                    meetsQuery = card.innerText.toLowerCase().includes(searchBoxQuery);
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

    static htmlToElement(html) {
        var template = game.characterPopout.characterSearch.createElement("template");
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }

    static createFilterSpanFromString(text) {
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
    static removeAllChildNodes(parent) {
        while (parent.firstChild && parent.firstChild.classList.has("filter-span")) {
            parent.removeChild(parent.firstChild);
        }
    }
    static removeAllFilterSpans(parent) {
        Array.from(parent.querySelectorAll(".filter-span")).forEach((el) => {
            el.remove();
        });
    }
    static updateActiveFilterList() {
        removeAllFilterSpans(activeFilterList);
        SearchData.checkedFilters.forEach((id) => {
            let filterChip = game.characterPopout.characterSearch.querySelector(`#${id}`);
            console.log(filterChip, id);
            let query = getCheckboxLabel(filterChip);
            let newFilterSpan = createFilterSpanFromString(query);
            activeFilterList.append(newFilterSpan);
            newFilterSpan.querySelector("input").addEventListener("change", () => {
                filterChip.click();
                // let event = new Event('change', { bubbles: true });
                // filterChip.dispatchEvent(event);
                // filterChip.checked = false //setAttribute("checked", true)
            });
        });
    }

    // https : //
    // stackoverflow.com/questions/19434241/how-i-can-get-the-text-of-a-checkbox
    static getCheckboxLabel(checkbox) {
        if (checkbox.parentNode.tagName === "LABEL") {
            return checkbox.parentNode;
        }
        if (checkbox.id) {
            return game.characterPopout.characterSearch.querySelector('label[for="' + checkbox.id + '"]').dataset.name;
        }
    }
}
