import { InSceneEntityManager as CharacterManager } from "../classes/InSceneCharacterManager.js";
import { LocationsManager } from "../classes/LocationsManager.js";
let baseURL = "https://classy-bavarois-433634.netlify.app/";
let locationsDatabaseURL = "https://classy-bavarois-433634.netlify.app/search-locations";
let characterDatabaseURL = "https://classy-bavarois-433634.netlify.app/search-characters";
export let clanTags;
export let locationTags;
fetch("/Idyllwild/Test JSON Data/tags.json")
    .then((response) => {
        return response.json();
    })
    .then((data) => {
        clanTags = data.filter((tags) => {
            return tags.tag.includes("clans/");
        });
        locationTags = data.filter((tags) => {
            return tags.tag.includes("category/location");
        });
    });
export const tabsData = {
    global: {
        tabs: {
            "selected-character": {
                id: "selected-character",
                label: "Current Character",
                isFetched: false,
                callback: async (event, html) => await fetchCharacterData(html),
            },
            "characters-in-scene": {
                id: "characters-in-scene",
                label: "Scene NPCs",
                // isFetched: false,
                callback: async (event, html) => {
                    let characters = await CharacterManager.getEntitiesInScene();
                    populateSelectedCharacters(characters, html);
                },
            },
            "all-characters": {
                id: "all-characters",
                label: "All Characters",
                isFetched: false,
                callback: async (event, html) => await fetchAllCharacters(html),
            },
            "current-location": {
                id: "current-location",
                label: "Current Location",
                isFetched: false,
                callback: async (event, html) => {
                    await fetchLocationData(html);
                },
            },
            "linked-locations": {
                id: "linked-locations",
                label: "Inner Locations",
                callback: async (event, html) => {
                    let locations = await LocationsManager.getLinkedLocations();
                    populateLinkedLocations(locations, html);
                },
            },
            "all-locations": {
                id: "all-locations",
                label: "All Locations",
                isFetched: false,
                callback: async (event, html) => {
                    await fetchAllLocations(html);
                },
            },
        },
    },
    character: {
        selectedTab: "traits",
        tabs: {},
    },
    location: {
        selectedTab: "",
        tabs: {},
    },
    clans: {},
    locations: {},
};
/**
 * For the selected "charactersInScene, and linkedLocations", for this scene, add our cards
 * @param {Array} cardCollection - an array of "card" objects holding locations or characters
 * @param {JQuery} $html - an object refering to the jquery element of our app
 * @param {String} containerSelector - the selector for the section we want to add the cards to
 */
async function addCardsToSection(cardCollection, $html, containerSelector) {
    let containerElement = $html[0].querySelector(`${containerSelector} .main`);
    $(containerElement).empty();
    cardCollection.forEach((data) => {
        let { cardHTML, url } = data;
        containerElement.insertAdjacentHTML("beforeend", cardHTML);
    });
}
function populateLinkedLocations(linkedLocations, $html) {
    addCardsToSection(linkedLocations, $html, "#linked-locations");
}

function populateSelectedCharacters(charactersInScene, $html) {
    addCardsToSection(charactersInScene, $html, "#characters-in-scene");
}
function processTags(tagArray) {
    let names = tagArray.map((tag) => tag.tag).filter((tag) => tag !== "clans/");
    names = names.map((tag) => tag.split("/").pop());
    names = names.sort();
    let tagObjects = {};
    names.forEach((tagName) => {
        tagObjects[tagName] = {
            id: tagName,
            label: tagName,
        };
    });
    tagArray = tagObjects;
    return tagArray;
}
export async function processClanNames() {
    clanTags = processTags(clanTags);
}
export async function processLocations() {
    locationTags = processTags(locationTags);
}

export async function fetchAllLocations($html) {
    const html = $html[0];
    fetch(locationsDatabaseURL)
        .then((response) => response.text())
        .then(async (data) => await getAllLocations(data, html));
}

export async function getAllLocations(data, html) {
    const dummyElement = document.createElement("div");
    dummyElement.insertAdjacentHTML("beforeend", data);
    console.log("Location dummy is", dummyElement);
    let anchorTags = Array.from(dummyElement.querySelector("main").querySelectorAll("a"));
    // let anchorTags = locationsAnchors.map((a) => a.textContent);

    // let { anchorTags } = convertAnchorsAndImages(dummyElement, "content");
    let locationsContainer = html.querySelector(".tab-section#all-locations .main");
    anchorTags.forEach((data) => {
        let card = document.createElement("div");
        card.classList.add("card");
        let imgWrapper = document.createElement("div");
        imgWrapper.classList.add("card-img__wrapper");
        let content = document.createElement("div");
        content.classList.add("card__content");
        card.append(imgWrapper);
        card.append(content);
        content.insertAdjacentElement("afterbegin", data);
        locationsContainer.append(card);
    });
}

/**
 * Description
 */
export async function fetchAllCharacters($html) {
    const html = $html[0];
    fetch(characterDatabaseURL)
        .then((response) => response.text())
        .then(async (data) => await getAllCharacters(data, html));
}

export async function fetchLocationData($html) {
    const html = $html[0];
    await clearCurrentEntityData(html, "#current-location");
    // let url = baseURL + "the-martyred-moon-café-and-divination-shop";
    let url = baseURL + game.characterPopout.currentLocationUrl;
    if (!url) {
        console.error("No url stored");
        return;
    }
    fetch(url)
        .then((response) => response.text())
        .then(
            async (data) =>
                await getSelectedEntityData(
                    data,
                    html,
                    "#current-location",
                    ".wrapper main article content",
                    2,
                    "h1",
                    "location"
                )
        );
}

/**
 * This wll be for getting metadata for the Clocks, roll-tables, etc.
 * Levels and token creation as well?
 */
export async function getEntityMetadata() {
    //metadata attributes
    // Table name and ID ("Store table name/id")
    // clocks -- maximum and current amount for each ability (yaml object?)
    // mire clock -
    // level -- the character level = to their clock
    //create token from character image
}
export async function fetchCharacterData($html) {
    const html = $html[0];
    await clearCurrentEntityData(html, "#selected-character");
    let url = baseURL + game.characterPopout.currentCharacterUrl;
    if (!url) {
        console.error("No url stored");
        return;
    }
    fetch(url)
        .then((response) => response.text())
        .then(
            async (data) => await getSelectedEntityData(data, html, "#selected-character", "content article content")
        );
}

export function convertAnchorsAndImages(convertedElement, selector = "") {
    if (selector) convertedElement = convertedElement.querySelector(selector);

    let anchorTags = convertedElement.querySelectorAll("a");
    anchorTags = Array.from(anchorTags);
    anchorTags.forEach((a) => {
        let oldHref = a.getAttribute("href");
        if (oldHref.includes("https")) {
            // console.log("Internal link?", a);
            let newHref = `https://classy-bavarois-433634.netlify.app${oldHref}`;
            a.setAttribute("href", newHref);
        }
    });

    let imgTags = convertedElement.querySelectorAll("img");
    imgTags = Array.from(imgTags);
    imgTags.forEach((img) => {
        let src = img.getAttribute("src").trim();
        if (!src.includes("https")) {
            //only re-append internal images -- external ones should have https
            let oldSrc = img.getAttribute("src").trim();
            let newSrc = `https://classy-bavarois-433634.netlify.app${oldSrc}`;
            img.setAttribute("src", newSrc);
        }
    });

    let cards = Array.from(convertedElement.querySelectorAll(".card"));
    return {
        anchorTags,
        imgTags,
        cards,
        convertedElement,
    };
}
export function sortCharacters(characterDataArray) {
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

export async function getAllCharacters(data, html) {
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
        if (clanKey === defaultKey) {
            clanSection.classList.add("visible");
            html.querySelector(`[data-tab='${clanKey}']`).classList.add("active");
        }
    }
}

export async function clearCurrentEntityData(html, selector = "") {
    $(`${selector} .tabs-container .wrapper`).empty();
    $(`${selector} header`).empty();
    $(`${selector} section.content`).empty();
}
export async function getSelectedEntityData(
    data,
    html,
    appSelector,
    wikiSiteSelector,
    headingLevel = 2,
    titleSelector = ".featured-image",
    tabDataKey = "character"
) {
    let dummyElement = document.createElement("div");
    dummyElement.insertAdjacentHTML("beforeend", data);
    const title = convertAnchorsAndImages(dummyElement, titleSelector).convertedElement;
    // let anchorTags = dummyElement.querySelectorAll("a");

    const content = convertAnchorsAndImages(dummyElement, wikiSiteSelector).convertedElement;
    // dummyElement = convertedDummyData.element;

    // let relationships = anchorTags.filter((element) => element.closest(".card"));
    // let relationshipCards = relationships.map((a) => a.closest(".card"));

    let allChildren = Array.from(content.children);
    let headings = dummyElement.querySelectorAll(`content h${headingLevel}`);
    headings = Array.from(headings);
    // console.log("Page content is", content.children, "headings are", headings);

    //get the index of the heading in the list of all children (this way we can get what's between each of them)
    let headingIndices = headings
        .map((heading) => {
            return allChildren.indexOf(heading);
        })
        .filter((index) => index !== -1);
    console.log("headingIndices", headingIndices);
    let sections = [];

    function sliceContent(start, end) {
        //an array of elements
        let content = allChildren.slice(start + 1, end).map((obj) => obj?.outerHTML);

        //filter out any that include "Placeholder" for now
        content = content.filter((elHTML) => !elHTML.toLowerCase().includes("placeholder"));

        //get the id of the heading-2 to act as the key
        let sectionKey = allChildren[start]?.getAttribute("id");
        if (start === 0) {
            sectionKey = "overview";
        }

        if (content.length > 0 && sectionKey !== undefined) {
            sections.push([sectionKey, content]);
        }
    }
    if (headingIndices[0] !== 0) {
        //if our first index where we find our heading isn't 0, it means
        //some content comes before that index in our array
        sliceContent(0, headingIndices[0]);
    }
    // get all the sections (each element between a header of the level we designated (2))
    headingIndices.forEach((headingIndex, index) => {
        let start = headingIndex;
        let end = headingIndices[index + 1];

        if (index + 1 >= headingIndices.length) {
            //Remember that slice doesn't include the end, so end needs to be larger than the array
            end = allChildren.length;
        }
        sliceContent(start, end);

        // //an array of elements
        // let content = allChildren.slice(start + 1, end).map((obj) => obj?.outerHTML);

        // //filter out any that include "Placeholder" for now
        // content = content.filter((elHTML) => !elHTML.toLowerCase().includes("placeholder"));

        // //get the id of the heading-2 to act as the key
        // let sectionKey = allChildren[start]?.getAttribute("id");

        // if (content.length > 0 && sectionKey !== undefined) {
        //     sections.push([sectionKey, content]);
        // }
    });
    // This should be an object with the key being the "id" of the heading, and the value being an array of each element between it and the next header
    let sectionsObject = Object.fromEntries(sections);

    let contentSection = html.querySelector(`.tab-section${appSelector}`);
    contentSection.querySelector(".header").prepend(title);

    // let combinedContent = sectionsObject[sectionKey].map((el) => el).join();
    for (let sectionKey in sectionsObject) {
        //sectionsObject[sectionKey] is an array of html elements
        sectionsObject[sectionKey].forEach((el) => {
            const uniqueKey = sectionKey + "-" + tabDataKey;
            if (sectionKey && sectionKey !== "undefined") {
                tabsData[tabDataKey].tabs[uniqueKey] = {
                    id: uniqueKey,
                    label: sectionKey,
                };
            }
            let charPropertySection = contentSection.querySelector(`section#${uniqueKey}`);
            if (charPropertySection) {
                charPropertySection.insertAdjacentHTML("beforeend", el);

                const existingTab = contentSection.querySelector(
                    `.tabs-container .wrapper button[data-tab='${uniqueKey}']`
                );
                if (!existingTab) {
                    let newTab = document.createElement("button");
                    charPropertySection = document.createElement("section");
                    newTab.dataset.tab = uniqueKey;
                    newTab.dataset.tabType = tabDataKey;
                    //clean up the "key" for display
                    let cleanKey = sectionKey
                        .replaceAll(/-+/g, " ")
                        .replace("site", "(Site)")
                        .replace("area", "[Area]")
                        .replace("region", "Region - ");
                    cleanKey = game.JTCS.utils.manager.capitalizeEachWord(cleanKey);
                    newTab.textContent = cleanKey;
                    contentSection.querySelector(".tabs-container .wrapper")?.append(newTab);
                }
            } else {
                if (sectionKey) {
                    let newTab = document.createElement("button");
                    charPropertySection = document.createElement("section");
                    newTab.dataset.tab = uniqueKey;
                    newTab.dataset.tabType = tabDataKey;
                    //clean up the "key" for display
                    let cleanKey = sectionKey
                        .replaceAll(/-+/g, " ")
                        .replace("site", "(Site)")
                        .replace("area", "[Area]")
                        .replace("region", "Region - ");
                    cleanKey = game.JTCS.utils.manager.capitalizeEachWord(cleanKey);
                    newTab.textContent = cleanKey;
                    charPropertySection.setAttribute("id", uniqueKey);
                    $(charPropertySection).addClass("content");
                    charPropertySection.insertAdjacentHTML("beforeend", el);
                    contentSection.querySelector(".tabs-container .wrapper")?.append(newTab);
                    contentSection.querySelector(".content-wrapper")?.append(charPropertySection);
                }
            }
        });
    }
    let buttons = contentSection.querySelectorAll(".tabs-container .wrapper button");
    buttons[0].click();
}
