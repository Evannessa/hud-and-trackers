"use strict";
import { setInvisibleHeader, handleDrag, addDragHandle } from "../helper-functions.js";
const MODULE_ID = "hud-and-trackers";
import { InSceneCharacterManager as CharacterManager } from "../classes/InSceneCharacterManager.js";
let characterDatabaseURL = "https://classy-bavarois-433634.netlify.app/";
let clanTags;
let locationTags;
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
                isFetched: false,
                callback: async (event, html) => await fetchCharacterData(html),
            },
            "all-characters": {
                id: "all-characters",
                label: "All",
                isFetched: false,
                callback: async (event, html) => await fetchAllCharacters(html),
            },
            "characters-in-scene": {
                id: "characters-in-scene",
                label: "Characters In Scene",
                isFetched: false,
                callback: async (event, html) => {
                    let characters = await CharacterManager.getCharactersInScene();
                    await populateSelectedCharacters(characters, html);
                },
            },
            // innerScenes: {},
            // locations: { id: "locations", label: "All Locations" },
        },
    },
    item: {
        selectedTab: "traits",
        tabs: {},
    },
    clans: {},
};

let actions = {
    global: {},
    "tab-specific": {},
};
async function populateSelectedCharacters(charactersInScene, $html) {
    let characterContainer = $html[0].querySelector("#characters-in-scene");
    let main = characterContainer.querySelector(".main");
    charactersInScene.forEach((charData) => {
        let { cardHTML, url } = charData;
        main.insertAdjacentHTML("beforeend", cardHTML);
    });
}

async function processClanNames() {
    let clanNames = clanTags.map((clan) => clan.tag).filter((clan) => clan !== "clans/");
    clanNames = clanNames.map((clan) => clan.split("/").pop());
    clanNames = clanNames.sort();
    let clanTabObjects = {};
    clanNames.forEach((clanName) => {
        clanTabObjects[clanName] = {
            id: clanName,
            label: clanName,
            // callback: async (event, appElement) => {
            //     html.querySelector(".tab-section#all-characters").append(tag);
            // },
        };
    });
    clanTags = clanTabObjects;
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
    await clearCurrentCharacterData(html);
    let url = characterDatabaseURL + game.characterPopout.currentCharacterUrl;
    fetch(url)
        .then((response) => response.text())
        .then(async (data) => await getSelectedCharacterData(data, html));
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
    Object.keys(clanNames).forEach((clanName) => {
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

    let characterData = cards.map((data) => data);

    let items = sortCharacters(characterData);

    let urls = {};
    for (let clanKey in items) {
        let updatedData = items[clanKey].map((card) => card.querySelector("a").textContent);
        urls[clanKey] = updatedData;
    }
    let clanContainer = html.querySelector(".tab-section#all-characters .main");
    //add the cards to the all-characters tab section
    for (let clanKey in items) {
        let clanSection = document.createElement("section");
        clanSection.setAttribute("id", clanKey);
        clanSection.classList.add("content");
        clanContainer.append(clanSection);
        items[clanKey].forEach((charDataItem) => {
            clanSection.append(charDataItem);
        });
        //activate the default tab
        let defaultKey = "alimoux";
        console.log("Clan key vs default", clanKey, defaultKey);
        if (clanKey === defaultKey) {
            clanSection.classList.add("visible");
            html.querySelector(`[data-tab='${clanKey}']`).classList.add("active");
        }
    }
}
async function clearCurrentCharacterData(html) {
    let contentSection = html.querySelector(".tab-section#selected-character");
    let featuredImage = contentSection.querySelector(".featured-image");
    //remove featured image
    if (featuredImage) {
        $(featuredImage).remove();
    }
    //remove content
    $("#selected-character section.content").empty();
}

async function getSelectedCharacterData(data, html) {
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

    //get the index of the heading
    let indexes = headings.map((heading) => {
        return allChildren.indexOf(heading);
    });
    let sections = [];

    // get all the sections (each element between a header of the level we designated (2))
    indexes.forEach((headingIndex, index) => {
        let start = headingIndex;
        let end = indexes[index + 1];
        if (end > allChildren.length) {
            end = allChildren.length - 1;
        }

        //filter out any that include "Placeholder" for now
        let content = allChildren.slice(start + 1, end).map((obj) => obj?.outerHTML); //an array of elements
        content = content.filter((elHTML) => !elHTML.toLowerCase().includes("placeholder"));

        //get the id of the heading-2 to act as the key
        let sectionKey = allChildren[start]?.getAttribute("id");

        if (content.length > 0 && sectionKey !== undefined) {
            sections.push([sectionKey, content]);
        }
    });
    // This should be an object with the key being the "id" of the heading, and the value being an array of each element between it and the next header
    let sectionsObject = Object.fromEntries(sections);

    let contentSection = html.querySelector(".tab-section#selected-character");
    contentSection.querySelector(".header").prepend(title);

    // let combinedContent = sectionsObject[sectionKey].map((el) => el).join();
    for (let sectionKey in sectionsObject) {
        //sectionsObject[sectionKey] is an array of html elements
        sectionsObject[sectionKey].forEach((el) => {
            if (sectionKey && sectionKey !== "undefined") {
                tabsData.item.tabs[sectionKey] = {
                    id: sectionKey,
                    label: sectionKey,
                };
            }
            let charPropertySection = contentSection.querySelector(`#${sectionKey}`);
            if (charPropertySection) charPropertySection.insertAdjacentHTML("beforeend", el);
            else {
                if (sectionKey) {
                    let newTab = document.createElement("button");
                    charPropertySection = document.createElement("section");
                    newTab.dataset.tab = sectionKey;
                    newTab.dataset.tabType = "item";
                    newTab.textContent = sectionKey;
                    charPropertySection.setAttribute("id", sectionKey);
                    $(charPropertySection).addClass("content flex-col flex-wrap");
                    charPropertySection.insertAdjacentHTML("beforeend", el);
                    contentSection.querySelector(".tabs-container").append(newTab);
                    contentSection.querySelector(".content-wrapper").append(charPropertySection);
                }
            }
        });
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

export class CharacterPopout extends Application {
    constructor(data = {}) {
        super();
        this.tabsData = data;
    }

    async addCharacterToScene(event, app) {
        let clickedCard = event.currentTarget;
        let url = clickedCard.querySelector(".internal-link").getAttribute("href");
        url = url.split("/").pop();
        // app.currentCharacterUrl = url;
        await CharacterManager.addCharacterToScene({ cardHTML: clickedCard.outerHTML, url });
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
        console.log("Our clan tabs are", ourData.clans.tabs);
        this.tabsData = ourData;
        return ourData;
    }
    async setTab(tabId, tabType, event, appElement) {
        // //for dash to camelCase and vise versa
        const sectionData = this.tabsData[tabType].tabs[tabId];
        if (sectionData.hasOwnProperty("callback")) {
            let isFetched = sectionData.hasOwnProperty("isFetched") && sectionData.isFetched === true;
            //if it doesn't have an isFetched property, or it's set to false
            console.log("Is fetched?" + tabId + tabType, isFetched);
            if (!isFetched) {
                await sectionData.callback(event, appElement);
                if (isFetched === false) {
                    //if it's false (triple === will make sure it's false, not just undefined)
                    //set it to true
                    sectionData.isFetched = true;
                }
            }
        }
        await this.toggleStyles(tabId, tabType, appElement);
    }
    async syntheticClick(tabElement) {
        tabElement.click();
    }
    async toggleStyles(activeID, activeType, html) {
        const appElement = html;
        //for dash to camelCase and vise versa
        let sectionSelector = ".content";
        if (activeType === "global") sectionSelector = ".tab-section";

        // console.log(sectionSelector, tabType, tabId);

        //hide other sections of this type, and remove active styles on button
        const hideSections = appElement.find(sectionSelector);
        const deactivateTabs = appElement.find(`[data-tab-type=${activeType}]`);

        hideSections.removeClass("visible");
        deactivateTabs.removeClass("active");

        //make the section w/ the id visible and add active to the button
        const activeSection = appElement.find(`#${activeID}`);
        const activeButton = appElement.find(`[data-tab="${activeID}"]`);

        activeSection.addClass("visible");
        activeButton.addClass("active");
    }

    async activateChildTab($html, localTabID) {
        const defaultTabLocal = $html.find(`[data-tab='${localTabID}']`)[0];
        await this.syntheticClick(defaultTabLocal);
    }

    async activateDefaultTab($html, globalTabID) {
        const defaultTabGlobal = $html.find(`[data-tab='${globalTabID}']`)[0];
        await this.syntheticClick(defaultTabGlobal);
    }

    async activateListeners(html) {
        this.dragHandler(html);
        // super.activateListeners(html);
        html = $(html[0].closest(".window-content"));

        html.off("click", "[data-tab]").on(
            "click",
            "[data-tab]",
            async (event) => await this._handleAction(event, "tabClick", this)
        );
        html.off("click", ".card").on("click", ".card", async (event) => {
            if (event.currentTarget.closest("#all-characters")) {
                await this._handleAction(event, "addToScene", this);
            } else if (event.currentTarget.closest("#characters-in-scene")) {
                await this._handleAction(event, "selectCharacter", this);
            }
        });

        await this.activateDefaultTab(html, "all-characters");
    }
    dragHandler(html) {
        let ancestorElement = html[0].closest(".window-app");

        addDragHandle(html, ancestorElement, ".window-content");
        const dragHandle = $(ancestorElement).find("#drag-handle")[0];
        const drag = new Draggable(this, html, dragHandle, false);

        handleDrag(drag);
    }

    async _handleAction(event, actionType, app) {
        event.preventDefault();
        const currentTarget = $(event.currentTarget);
        if (!actionType || !app) {
            return;
        }
        if (actionType === "addToScene") {
            //if the card is an "all characters" card, add it to the "charactersInScene"
            await this.addCharacterToScene(event, app.element);
        } else if (actionType === "selectCharacter") {
            //if the card is an "add to scene" card, choose it as the selected character
            //we'll want to get the url of the selected character
            let link = currentTarget[0].querySelector(".internal-link");
            let url = link.getAttribute("href").split("/").pop();
            let characterName = link.innerText;
            app.currentCharacterUrl = url;
            //change the tab to reflect the name of the selected character
            app.element[0].querySelector("[data-tab='selected-character']").textContent = characterName;
        } else if (actionType === "tabClick") {
            let tabType = currentTarget.data().tabType;
            let tabId = event.currentTarget.dataset.tab;
            await this.setTab(tabId, tabType, event, app.element);
        }
    }
}

window.CharacterPopout = CharacterPopout;
