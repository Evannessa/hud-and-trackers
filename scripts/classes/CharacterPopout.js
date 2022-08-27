"use strict";
const MODULE_ID = "hud-and-trackers";

/**
 * Description
 */
async function fetchCharacterData($html) {
    let html = $html[0];
    fetch("https://classy-bavarois-433634.netlify.app/anj%C3%A8l-alimoux")
        .then((response) => response.text())
        .then(async (data) => await getFirstParagraph(data, html));
}

async function getFirstParagraph(data, html) {
    let headingLevel = 2;

    let dummyElement = document.createElement("div");
    dummyElement.insertAdjacentHTML("beforeend", data);
    let content = dummyElement.querySelector("content article content");

    let anchorTags = dummyElement.querySelectorAll("a");

    anchorTags = Array.from(anchorTags);
    anchorTags.forEach((a) => {
        if (a.classList.contains("internal-link")) {
            let oldHref = a.getAttribute("href");
            let newHref = `https://classy-bavarois-433634.netlify.app${oldHref}`;
            a.setAttribute("href", newHref);
        }
    });

    let imgTags = dummyElement.querySelectorAll("img");
    imgTags = Array.from(imgTags);
    imgTags.forEach((img) => {
        let oldSrc = img.getAttribute("src").trim();
        let newSrc = `https://classy-bavarois-433634.netlify.app${oldSrc}`;
        img.setAttribute("src", newSrc);
    });
    let mainImage = imgTags.find((img) => img.parentNode.classList.contains("featured-image"));

    let otherImages = imgTags.filter((img) => img.classList.contains("card-img"));

    let allChildren = Array.from(content.children);
    let headings = dummyElement.querySelectorAll(`content h${headingLevel}`);
    headings = Array.from(headings);

    let indexes = headings.map((heading) => {
        return allChildren.indexOf(heading);
    });
    let sections = [];
    let sectionHeaders = [];
    indexes.forEach((headingIndex, index) => {
        let start = headingIndex;
        let end = indexes[index + 1];
        if (end > allChildren.length) {
            end = allChildren.length - 1;
        }
        sections.push([
            allChildren[start]?.getAttribute("id"),
            allChildren.slice(start, end).map((obj) => obj?.outerHTML),
        ]);
    });
    let sectionsObject = Object.fromEntries(sections);

    let card = html.querySelector(".card");
    card.prepend(mainImage);

    for (let sectionKey in sectionsObject) {
        console.log(card.querySelector(`#${sectionKey}`));
        sectionsObject[sectionKey].forEach((el) =>
            card.querySelector(`#${sectionKey}`)?.insertAdjacentHTML("beforeend", el)
        );
    }

    otherImages.forEach((img) => {
        card.append(img);
    });
}
Hooks.on("ready", () => {
    if (!game.characterPopout) {
        game.characterPopout = new CharacterPopout().render(true);
    }
});
export class CharacterPopout extends Application {
    constructor(data) {
        super();
        this.data = data;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form"],
            popOut: true,
            resizable: true,
            minimizeable: true,
            template: `modules/${MODULE_ID}/templates/CharacterPopout.hbs`,
            id: "CharacterPopout",
            title: " Character Popout",
        });
    }

    async getData() {
        let ourData = {
            selectedTab: "traits",
            tabs: [
                { id: "traits", label: "Traits" },
                { id: "story", label: "Story" },
                { id: "personal-life", label: "Personal Life" },
            ],
        };
        return ourData;
    }

    async activateListeners(html) {
        // super.activateListeners(html);
        html = $(html[0].closest(".window-content"));
        await fetchCharacterData(html);
        html.off("click").on("click", "[data-tab]", this._handleButtonClick.bind(this));
    }

    async _handleChange() {}

    async _handleButtonClick(event) {
        let tab = event.currentTarget.dataset.tab;
        console.log(tab);
    }
}

window.CharacterPopout = CharacterPopout;
