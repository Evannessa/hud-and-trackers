import { InSceneCharacterManager as CharacterManager } from "../classes/InSceneCharacterManager.js";
import { LocationsManager } from "../classes/LocationsManager.js";
let baseURL = "https://classy-bavarois-433634.netlify.app/";
let locationsDatabaseURL = "https://classy-bavarois-433634.netlify.app/00-locations-moc";
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
                // isFetched: false,
                callback: async (event, html) => {
                    let characters = await CharacterManager.getCharactersInScene();
                    console.log("Our characters in scene are", characters);
                    populateSelectedCharacters(characters, html);
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
            "linked-locations": {
                id: "linked-locations",
                label: "Connected Locations",
                callback: async (event, html) => {
                    let locations = await LocationsManager.getLinkedLocations();
                    console.log("Our locations in scene are", locations);
                    populateLinkedLocations(locations, html);
                },
            },
            "current-location": {
                id: "current-location",
                label: "Current Location",
                isFetched: false,
                callback: async (event, html) => {
                    await fetchLocationData(html);
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
    let anchorTags = Array.from(dummyElement.querySelector("content").querySelectorAll("a"));
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
        console.log(card);
        locationsContainer.append(card);
    });
    // locationsContainer.append(locationsData);

    // let { anchorTags, cards } = convertAnchorsAndImages(dummyElement, "content");

    // let characterData = cards.map((data) => data);

    // let urls = {};
    // for (let clanKey in items) {
    //     let updatedData = items[clanKey].map((card) => card.querySelector("a").textContent);
    //     urls[clanKey] = updatedData;
    // }
    // let clanContainer = html.querySelector(".tab-section#all-locations .main");
    //add the cards to the all-characters tab section
    // for (let clanKey in items) {
    //     let clanSection = document.createElement("section");
    //     clanSection.setAttribute("id", clanKey);
    //     clanSection.classList.add("content");
    //     clanContainer.append(clanSection);
    //     items[clanKey].forEach((charDataItem) => {
    //         clanSection.append(charDataItem);
    //     });
    //     //activate the default tab
    //     let defaultKey = "alimoux";
    //     if (clanKey === defaultKey) {
    //         clanSection.classList.add("visible");
    //         html.querySelector(`[data-tab='${clanKey}']`).classList.add("active");
    //     }
    // }
}

/**
 * Description
 */
export async function fetchAllCharacters($html) {
    const html = $html[0];
    fetch(baseURL)
        .then((response) => response.text())
        .then(async (data) => await getAllCharacters(data, html));
}

export async function fetchLocationData($html) {
    const html = $html[0];
    await clearCurrentEntityData(html);
    let url = baseURL + "the-martyred-moon-café-and-divination-shop";
    // let url = baseURL + game.characterPopout.currentLocationUrl;
    console.log("Url is", game.characterPopout.currentLocationUrl);
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
export async function fetchCharacterData($html) {
    const html = $html[0];
    await clearCurrentEntityData(html);
    let url = baseURL + game.characterPopout.currentCharacterUrl;
    console.log(game.characterPopout.currentCharacterUrl);
    fetch(url)
        .then((response) => response.text())
        .then(
            async (data) => await getSelectedEntityData(data, html, "#selected-character", "content article content")
        );
}

export function convertAnchorsAndImages(dummyElement, selector = "") {
    if (selector) dummyElement = dummyElement.querySelector(selector);
    let anchorTags = dummyElement.querySelectorAll("a");
    anchorTags = Array.from(anchorTags);
    anchorTags.forEach((a) => {
        let oldHref = a.getAttribute("href");
        if (oldHref.includes("https")) {
            // console.log("Internal link?", a);
            let newHref = `https://classy-bavarois-433634.netlify.app${oldHref}`;
            a.setAttribute("href", newHref);
        }
    });

    let imgTags = dummyElement.querySelectorAll("img");
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

    let cards = Array.from(dummyElement.querySelectorAll(".card"));
    return {
        anchorTags,
        imgTags,
        cards,
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

export async function clearCurrentEntityData(html, selector) {
    let contentSection = html.querySelector(`.tab-section${selector}`);
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
    const dummyElement = document.createElement("div");
    dummyElement.insertAdjacentHTML("beforeend", data);
    const content = dummyElement.querySelector(wikiSiteSelector);
    const title = dummyElement.querySelector(titleSelector);
    // let anchorTags = dummyElement.querySelectorAll("a");

    let { anchorTags, imgTags } = convertAnchorsAndImages(dummyElement);
    // let relationships = anchorTags.filter((element) => element.closest(".card"));
    // let relationshipCards = relationships.map((a) => a.closest(".card"));

    let allChildren = Array.from(content.children);
    let headings = dummyElement.querySelectorAll(`content h${headingLevel}`);
    headings = Array.from(headings);
    console.log("Page content is", content.children, "headings are", headings);

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
    console.log("Sections object is", sectionsObject);

    let contentSection = html.querySelector(`.tab-section${appSelector}`);
    contentSection.querySelector(".header").prepend(title);

    // let combinedContent = sectionsObject[sectionKey].map((el) => el).join();
    for (let sectionKey in sectionsObject) {
        //sectionsObject[sectionKey] is an array of html elements
        sectionsObject[sectionKey].forEach((el) => {
            if (sectionKey && sectionKey !== "undefined") {
                tabsData[tabDataKey].tabs[sectionKey] = {
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
                    newTab.dataset.tabType = tabDataKey;
                    newTab.textContent = sectionKey;
                    charPropertySection.setAttribute("id", sectionKey);
                    $(charPropertySection).addClass("content flex-col flex-wrap");
                    charPropertySection.insertAdjacentHTML("beforeend", el);
                    contentSection.querySelector(".tabs-container")?.append(newTab);
                    contentSection.querySelector(".content-wrapper")?.append(charPropertySection);
                }
            }
        });
    }
}

// export async function getSelectedCharacterData(data, html) {
//     const headingLevel = 2;

//     const dummyElement = document.createElement("div");
//     dummyElement.insertAdjacentHTML("beforeend", data);
//     const content = dummyElement.querySelector("content article content");
//     const title = dummyElement.querySelector(".featured-image");
//     // let anchorTags = dummyElement.querySelectorAll("a");

//     let { anchorTags, imgTags } = convertAnchorsAndImages(dummyElement);
//     let relationships = anchorTags.filter((element) => element.closest(".card"));
//     let relationshipCards = relationships.map((a) => a.closest(".card"));

//     let allChildren = Array.from(content.children);
//     let headings = dummyElement.querySelectorAll(`content h${headingLevel}`);
//     headings = Array.from(headings);

//     //get the index of the heading
//     let indexes = headings.map((heading) => {
//         return allChildren.indexOf(heading);
//     });
//     let sections = [];

//     // get all the sections (each element between a header of the level we designated (2))
//     indexes.forEach((headingIndex, index) => {
//         let start = headingIndex;
//         let end = indexes[index + 1];
//         if (end > allChildren.length) {
//             end = allChildren.length - 1;
//         }

//         //filter out any that include "Placeholder" for now
//         let content = allChildren.slice(start + 1, end).map((obj) => obj?.outerHTML); //an array of elements
//         content = content.filter((elHTML) => !elHTML.toLowerCase().includes("placeholder"));

//         //get the id of the heading-2 to act as the key
//         let sectionKey = allChildren[start]?.getAttribute("id");

//         if (content.length > 0 && sectionKey !== undefined) {
//             sections.push([sectionKey, content]);
//         }
//     });
//     // This should be an object with the key being the "id" of the heading, and the value being an array of each element between it and the next header
//     let sectionsObject = Object.fromEntries(sections);

//     let contentSection = html.querySelector(".tab-section#selected-character");
//     contentSection.querySelector(".header").prepend(title);

//     // let combinedContent = sectionsObject[sectionKey].map((el) => el).join();
//     for (let sectionKey in sectionsObject) {
//         //sectionsObject[sectionKey] is an array of html elements
//         sectionsObject[sectionKey].forEach((el) => {
//             if (sectionKey && sectionKey !== "undefined") {
//                 tabsData.item.tabs[sectionKey] = {
//                     id: sectionKey,
//                     label: sectionKey,
//                 };
//             }
//             let charPropertySection = contentSection.querySelector(`#${sectionKey}`);
//             if (charPropertySection) charPropertySection.insertAdjacentHTML("beforeend", el);
//             else {
//                 if (sectionKey) {
//                     let newTab = document.createElement("button");
//                     charPropertySection = document.createElement("section");
//                     newTab.dataset.tab = sectionKey;
//                     newTab.dataset.tabType = "item";
//                     newTab.textContent = sectionKey;
//                     charPropertySection.setAttribute("id", sectionKey);
//                     $(charPropertySection).addClass("content flex-col flex-wrap");
//                     charPropertySection.insertAdjacentHTML("beforeend", el);
//                     contentSection.querySelector(".tabs-container").append(newTab);
//                     contentSection.querySelector(".content-wrapper").append(charPropertySection);
//                 }
//             }
//         });
//     }

//     //#TODO: put this back in later
//     // relationshipCards.forEach((card) => {
//     //     contentSection.querySelector("footer").append(card);
//     // });
// }
