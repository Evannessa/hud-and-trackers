"use strict";
import { setInvisibleHeader, handleDrag, addDragHandle } from "../helper-functions.js";
const MODULE_ID = "hud-and-trackers";
let characterDatabaseURL = "https://classy-bavarois-433634.netlify.app/";
let clanTags;
fetch("/Idyllwild/Test JSON Data/tags.json")
    .then((response) => {
        return response.json();
    })
    .then((data) => {
        clanTags = data.filter((tags) => {
            return tags.tag.includes("clans/");
        });
    });
const tabsData = {
    global: {
        tabs: {
            "selected-character": {
                id: "selected-character",
                label: "Current",
                callback: async (event, html) => await fetchCharacterData(html),
            },
            "all-characters": {
                id: "all-characters",
                label: "All",
                callback: async (event, html) => await fetchAllCharacters(html),
            },
            // locations: { id: "locations", label: "All Locations" },
        },
    },
    item: {
        selectedTab: "traits",
        tabs: {
            traits: { id: "traits", label: "Traits" },
            story: { id: "story", label: "Story" },
            "personal-life": { id: "personal-life", label: "Relations" },
        },
    },
    clans: {},
};

async function processClanNames() {
    let clanNames = clanTags.map((clan) => clan.tag).filter((clan) => clan !== "clans/");
    clanNames = clanNames.map((clan) => clan.split("/").pop());
    clanTags = clanNames;
}

/**
 * Description
 */
async function fetchAllCharacters($html) {
    const html = $html[0];
    fetch(characterDatabaseURL)
        .then((response) => response.text())
        .then(async (data) => await getAllCharacters(data, html));
}

async function fetchCharacterData($html) {
    const html = $html[0];
    fetch("https://classy-bavarois-433634.netlify.app/anj%C3%A8l-alimoux")
        .then((response) => response.text())
        .then(async (data) => await getFirstParagraph(data, html));
}

function convertAnchorsAndImages(dummyElement, selector = "") {
    if (selector) dummyElement = dummyElement.querySelector(selector);
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

    let cards = Array.from(dummyElement.querySelectorAll(".card"));
    return {
        anchorTags,
        imgTags,
        cards,
    };
}
function sortCharacters(characterDataArray) {
    // let clanNames = clanTags.map((clan) => clan.tag).filter((clan) => clan !== "clans/");
    // clanNames = clanNames.map((clan) => clan.split("/").pop());
    let clanNames = clanTags;
    let characterItems = {};

    // characterDataArray = characterDataArray.map((cd) => cd.replace(/\s+/g, " ").trim());
    // characterDataArray.forEach((cd) => console.log(cd));
    clanNames.forEach((clanName) => {
        characterDataArray.forEach((element) => {
            let dataClan = element.dataset.clan;
            if (clanName.toLowerCase() === dataClan.toLowerCase()) {
                if (!characterItems[clanName]) characterItems[clanName] = [];
                characterItems[clanName].push(element);
            }
        });
    });
    return characterItems;
}

async function getAllCharacters(data, html) {
    const dummyElement = document.createElement("div");
    dummyElement.insertAdjacentHTML("beforeend", data);
    let { anchorTags, cards } = convertAnchorsAndImages(dummyElement, ".card-container");
    // let characterNames = anchorTags.map((tag) => tag.textContent);

    let characterData = cards.map((data) => data);

    let items = sortCharacters(characterData);

    let urls = {};
    for (let clanKey in items) {
        let updatedData = items[clanKey].map((card) => card.querySelector("a").textContent);
        urls[clanKey] = updatedData;
    }
    console.log(urls);
    for (let clanKey in items) {
        let clanSection = document.createElement("section");
        clanSection.setAttribute("id", clanKey);
        clanSection.classList.add("content");
        html.querySelector(".tab-section#all-characters").append(clanSection);
        items[clanKey].forEach((charDataItem) => {
            clanSection.append(charDataItem);
        });
    }

    // items["clans/alimoux"].forEach((tag) => {
    //     html.querySelector(".tab-section#all-characters").append(tag);
    // });
}

async function getFirstParagraph(data, html) {
    const headingLevel = 2;

    const dummyElement = document.createElement("div");
    dummyElement.insertAdjacentHTML("beforeend", data);
    const content = dummyElement.querySelector("content article content");
    const title = dummyElement.querySelector(".featured-image");
    // let anchorTags = dummyElement.querySelectorAll("a");

    let { anchorTags, imgTags } = convertAnchorsAndImages(dummyElement);
    let relationships = anchorTags.filter((element) => element.closest(".card"));
    let relationshipCards = relationships.map((a) => a.closest(".card"));

    let allChildren = Array.from(content.children);
    let headings = dummyElement.querySelectorAll(`content h${headingLevel}`);
    headings = Array.from(headings);

    let indexes = headings.map((heading) => {
        return allChildren.indexOf(heading);
    });
    let sections = [];
    indexes.forEach((headingIndex, index) => {
        let start = headingIndex;
        let end = indexes[index + 1];
        if (end > allChildren.length) {
            end = allChildren.length - 1;
        }
        sections.push([
            allChildren[start]?.getAttribute("id"),
            allChildren.slice(start + 1, end).map((obj) => obj?.outerHTML),
        ]);
    });
    let sectionsObject = Object.fromEntries(sections);

    let contentSection = html.querySelector(".tab-section#selected-character");
    // contentSection.querySelector(".header").prepend(mainImage);
    contentSection.querySelector(".header").prepend(title);

    for (let sectionKey in sectionsObject) {
        sectionsObject[sectionKey].forEach((el) =>
            contentSection.querySelector(`#${sectionKey}`)?.insertAdjacentHTML("beforeend", el)
        );
    }

    //#TODO: put this back in later
    // relationshipCards.forEach((card) => {
    //     contentSection.querySelector("footer").append(card);
    // });
}
Hooks.on("ready", async () => {
    await processClanNames();
    if (!game.characterPopout) {
        game.characterPopout = new CharacterPopout().render(true);
    }
});
Hooks.on("renderCharacterPopout", (app, html) => {
    setInvisibleHeader(html, true);
});

function openTabs(event) {}
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
        let ourData = { ...tabsData, clans: { tabs: clanTags } };
        return ourData;
    }
    toggleStyles(activeID, activeType, html) {
        const appElement = html;

        //for dash to camelCase and vise versa
        let sectionSelector = ".content";
        if (activeType === "global") sectionSelector = ".tab-section";

        // console.log(sectionSelector, tabType, tabId);

        //hide other sections of this type, and remove active styles on button
        const hideSections = appElement.find(sectionSelector);
        const deactivateTabs = appElement.find(`[data-tab-type=${activeType}]`);

        // console.log("Hiding these", hideSections);
        // console.log("Deactivating these", deactivateTabs);

        hideSections.removeClass("visible");
        deactivateTabs.removeClass("active");

        //make the section w/ the id visible and add active to the button
        const activeSection = appElement.find(`#${activeID}`);
        const activeButton = appElement.find(`[data-tab="${activeID}"]`);
        activeSection.addClass("visible");
        activeButton.addClass("active");
        console.log(activeButton, activeSection);
    }

    async activateListeners(html) {
        this.dragHandler(html);
        // super.activateListeners(html);
        html = $(html[0].closest(".window-content"));
        // await fetchCharacterData(html);
        await this.toggleStyles("all-characters", "global", html);
        await this.toggleStyles("alimoux", "clans", html);
        // await this.toggleStyles("traits", "item", html);
        await fetchCharacterData(html);
        // console.log(html.find(".content#traits, .tab-section#selected-character"));
        // html.find(".content#traits, .tab-section#selected-character").addClass("visible");
        html.off("click").on("click", "[data-tab]", this._handleButtonClick.bind(this));
    }
    dragHandler(html) {
        let ancestorElement = html[0].closest(".window-app");

        addDragHandle(html, ancestorElement, ".window-content");
        const dragHandle = $(ancestorElement).find("#drag-handle")[0];
        const drag = new Draggable(this, html, dragHandle, false);

        handleDrag(drag);
    }

    async _handleButtonClick(event) {
        event.preventDefault();
        const appElement = this.element;
        const currentTarget = $(event.currentTarget);
        let tabType = currentTarget.data().tabType;
        let tabId = event.currentTarget.dataset.tab;
        console.log(tabType, tabId);

        await this.toggleStyles(tabId, tabType, appElement);
        // //for dash to camelCase and vise versa
        const sectionData = tabsData[tabType].tabs[tabId];
        if (sectionData.hasOwnProperty("callback")) {
            sectionData.callback(event, appElement);
        }
    }
}

window.CharacterPopout = CharacterPopout;
