import { InSceneEntityManager as CharacterManager, InSceneEntityManager } from "../classes/InSceneCharacterManager.js";
import Search from "./Search.js";
import { LocationsManager } from "../classes/LocationsManager.js";
import { ClockConfig } from "../ClockConfig.js";
import { HelperFunctions } from "../helper-functions.js";
import { extractUrlFromCard } from "./PopoutActions.js";
// let baseURL = "https://classy-bavarois-433634.netlify.app/";
// let locationsDatabaseURL = "https://classy-bavarois-433634.netlify.app/search-locations";
let locationsDatabaseURL = "https://fastidious-smakager-702620.netlify.app/starshead-map";
// let baseURLNoTrail = "https://classy-bavarois-433634.netlify.app";
let baseURL = "https://fastidious-smakager-702620.netlify.app/";
let baseURLNoTrail = "https://fastidious-smakager-702620.netlify.app";
// let characterDatabaseURL = "https://classy-bavarois-433634.netlify.app/search-characters";
let characterDatabaseURL = "https://fastidious-smakager-702620.netlify.app/search-characters";
let locationMapDataBaseURL = "https://fastidious-smakager-702620.netlify.app/assets/data/";
let locationBaseNames = ["StarsheadIsland.dpo"];
export let clanTags;
export let locationTags;

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
                callback: async (event, html) => {
                    await fetchAllCharacters(html);
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
    fetch(`${locationMapDataBaseURL}${locationBaseNames[0]}`)
        // fetch(locationsDatabaseURL)
        // .then((response) => response.text())
        .then((response) => response.json())
        .then(async (data) => await getAllLocations(data, html));
}
export async function getAllLocations(data, html) {
    // const dummyElement = document.createElement("div");
    // dummyElement.insertAdjacentHTML("beforeend", data);
    let locations = data.sheets[0].lines.filter((line) => line.type === "global");
    let locationCards = locations
        .map((location) => {
            const imgPath = encodeURIComponent(location.imageData.mainImage.split("\\").pop()).replace(/'/g, "%27");
            function returnTags(tags) {
                if (tags) {
                    return `<p>${tags}</p>`;
                } else {
                    return "";
                }
            }
            return `
        <div class="card individual-location" data-card-type="location">
            <img class="card-img" src='${baseURL}assets/locations/${imgPath}'/>
            <p><a class="internal-link" href="/starshead-map">${location.id}</a></p>
            ${returnTags(location.tags)}
        </div>
        `;
        })
        .map((string) => HelperFunctions.stringToElement(string));
    const fragment = document.createDocumentFragment();
    locationCards.forEach((card) => fragment.appendChild(card));
    const allLocationsContainer = html.querySelector(".tab-section#all-locations .main");
    // allLocationsContainer.append(convertedElement);
    // img.textContent = JSON.stringify(data.sheets[0].lines);
    allLocationsContainer.appendChild(fragment);
    return;
    // let { convertedElement } = convertAnchorsAndImages(dummyElement, ".wrapper");
    let convertedElement = HelperFunctions.stringToElement(`<iframe src='${locationsDatabaseURL}'></iframe>`);
    // console.log(Array.from(convertedElement.contentWindow.document.body.querySelectorAll("button")));

    convertedElement.addEventListener("load", () => {
        let iFrameBody;
        if (convertedElement.contentDocument) {
            // FF
            iFrameBody = convertedElement.contentDocument.getElementsByTagName("body")[0];
        } else if (convertedElement.contentWindow) {
            // IE
            iFrameBody = convertedElement.contentWindow.document.getElementsByTagName("body")[0];
        }

        console.log(iFrameBody, iFrameBody.querySelectorAll("button"));
    });
}

export async function _getAllLocations(data, html) {
    const dummyElement = document.createElement("div");
    dummyElement.insertAdjacentHTML("beforeend", data);

    const singleLocationLinks = Array.from(
        dummyElement.querySelector("main #individual-locations").querySelectorAll("a")
    );

    const locationListLinks = Array.from(dummyElement.querySelector("main #location-lists").querySelectorAll("a"));

    const allLocationsContainer = html.querySelector(".tab-section#all-locations .main");

    const locationListsContainer = HelperFunctions.stringToElement(
        `<section class="flex-row flex-wrap scroll-y" id='location-lists'>
        </section>`
    );
    const singleLocationsContainer = HelperFunctions.stringToElement(
        `<section class="flex-row flex-wrap scroll-y" id='individual-locations'>
        </section>`
    );

    function createCard(data, container, cardType) {
        let card = HelperFunctions.stringToElement(
            `<div class="card ${cardType}">
                <div class="card-img__wrapper"></div>
                <div class="card__content">

                </div>
            </div>`
        );
        // card.querySelector("card-img__wrapper")
        card.querySelector(".card__content").insertAdjacentElement("afterbegin", data);
        //    let card = document.createElement("div");
        // card.classList.add("card");
        // let imgWrapper = document.createElement("div");
        // imgWrapper.classList.add("card-img__wrapper");
        // let content = document.createElement("div");
        // content.classList.add("card__content");
        // card.append(imgWrapper);
        // card.append(content);
        // content.insertAdjacentElement("afterbegin", data);
        container.append(card);
        return container;
    }

    locationListLinks.forEach((data) => {
        allLocationsContainer.append(createCard(data, locationListsContainer, "location-list"));
    });

    singleLocationLinks.forEach((data) => {
        allLocationsContainer.append(createCard(data, singleLocationsContainer, "individual-location"));
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
export async function fetchAllEntities($html, url, selector) {
    const html = $html[0];
    fetch(url)
        .then((response) => response.text())
        .then(async (data) => await processAnchorTags(data, html, selector));
}
export async function getUrlsFromURL($html, url) {
    const html = $html[0];
    url = baseURL + url;
    fetch(url)
        .catch((error) => console.log(error))
        .then((response) => response.text())
        .then(async (data) => await getAnchorTags(data, html));
}
export async function getAnchorTags(data, html, selector = "all-locations") {
    const dummyElement = document.createElement("div");
    dummyElement.insertAdjacentHTML("beforeend", data);
    // console.log(dummyElement);
    let { anchorTags, cards } = convertAnchorsAndImages(dummyElement, ".wrapper");
    let subURLs = anchorTags.map((el) => el.getAttribute("href").replace("/", ""));
    let allLocationElements = Array.from(
        html.querySelector(`#${selector}`).querySelectorAll(".card.individual-location")
    );
    let allLocationCards = {};
    for (let cardData of allLocationElements) {
        let { card, url } = extractUrlFromCard("", cardData);
        allLocationCards[url] = { cardHTML: card.outerHTML, url };
    }
    // allLocationCards.map((cardData) => {
    //     let { card, url } = extractUrlFromCard("", cardData);
    //     return { [url]: { cardHTML: card.outerHTML, url } };
    // });

    if (allLocationCards) {
        let byUrl = Object.keys(allLocationCards); //game.characterPopout.allLo
        subURLs = subURLs
            .filter((url) => byUrl.includes(url))
            .map((url) => {
                return allLocationCards[url];
            });
    } else {
        console.log("All locations doesn't exist");
    }
    subURLs.forEach(async (urlData) => {
        console.log(urlData);
        await InSceneEntityManager.addEntityToScene(urlData, game.scenes.viewed, "location");
        //TODO: decide whether you want to have it replace the current entities, maybe w/ a prompt?
        // InSceneEntityManager.setEntitiesInScene()
    });
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
function sortItems(itemList) {}
export async function processAnchorTags(data, html, selector) {
    const dummyElement = document.createElement("div");
    dummyElement.insertAdjacentHTML("beforeend", data);
    let { anchorTags, cards } = convertAnchorsAndImages(dummyElement, ".card-container");
    let items = sortItems(cards);

    let globalSection = html.querySelector(`.tab-section${selector}`);
    let appContainer = globalSection.querySelector(".main");

    function createSection(key) {
        let section = HelperFunctions.stringToElement(
            `<section class="content" id="${key}">

        </section>
        `
        );
        appContainer.append(section);
        items[key].forEach((dataItem) => {
            section.append(dataItem);
        });
    }
    for (let key in items) {
        createSection(key);
    }

    //activate the default tab
    let defaultKey = Object.keys(items)[0];

    if (key === defaultKey) {
        section.classList.add("visible");
        // html.querySelector(`[data-tab='${clanKey}']`).classList.add("active");
    }
    let buttons = globalSection.querySelectorAll(".tabs-container .wrapper button");
    buttons[0].click();
}

export function convertAnchorsAndImages(convertedElement, selector = "") {
    if (selector) convertedElement = convertedElement.querySelector(selector);

    let anchorTags = convertedElement.querySelectorAll("a");
    anchorTags = Array.from(anchorTags);
    anchorTags.forEach((a) => {
        let oldHref = a.getAttribute("href");
        if (oldHref.includes("https")) {
            // console.log("Internal link?", a);
            let newHref = `${baseURLNoTrail}${oldHref}`;
            // let newHref = `https://classy-bavarois-433634.netlify.app${oldHref}`;
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
            let newSrc = `${baseURLNoTrail}${oldSrc}`;
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
    let { convertedElement } = convertAnchorsAndImages(dummyElement, ".gallery-section");
    let clanContainer = html.querySelector(".tab-section#all-characters .main");
    clanContainer.append(convertedElement);
    const search = new Search();
    let searchData = {
        searchBox: convertedElement.querySelector("#search-box"),
        filterSpans: Array.from(convertedElement.querySelectorAll(".filter-span")),
        searchableElements: Array.from(convertedElement.querySelectorAll(".card")),
        activeFilterList: convertedElement.querySelector(".active-filters"),
    };
    search.initializeSearchElements(searchData);
    const { searchBox } = searchData;
    searchBox.addEventListener("input", (event) => search.filterSearch());
}
export async function _getAllCharacters(data, html) {
    const dummyElement = document.createElement("div");
    dummyElement.insertAdjacentHTML("beforeend", data);
    let { anchorTags, cards } = convertAnchorsAndImages(dummyElement, ".card-container");

    let characterData = cards.map((data) => data);

    let items = sortCharacters(characterData);

    let clanContainer = html.querySelector(".tab-section#all-characters .main");
    let urls = {};
    for (let clanKey in items) {
        let updatedData = items[clanKey].map((card) => card.querySelector("a").textContent);
        urls[clanKey] = updatedData;
    }
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
    console.log(dummyElement);

    const title = convertAnchorsAndImages(dummyElement, titleSelector).convertedElement;

    //any extra metadata that can be mechanized by the module
    let propsAndVibes = checkForMetadata(tabDataKey, dummyElement);
    // let anchorTags = dummyElement.querySelectorAll("a");

    const content = convertAnchorsAndImages(dummyElement, wikiSiteSelector).convertedElement;
    // dummyElement = convertedDummyData.element;

    // let relationships = anchorTags.filter((element) => element.closest(".card"));
    // let relationshipCards = relationships.map((a) => a.closest(".card"));

    let allChildren = Array.from(content.children);
    let headings = dummyElement.querySelectorAll(`content h${headingLevel}`);
    headings = Array.from(headings);

    //get the index of the heading in the list of all children (this way we can get what's between each of them)
    let headingIndices = headings
        .map((heading) => {
            return allChildren.indexOf(heading);
        })
        .filter((index) => index !== -1);
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
    });
    if (propsAndVibes.length > 0) {
        console.log(propsAndVibes);
        sections.push(["props-and-vibes", propsAndVibes]);
    }
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
                    if (typeof el === "string") {
                        charPropertySection.insertAdjacentHTML("beforeend", el);
                    } else {
                        charPropertySection.append(el);
                    }
                    contentSection.querySelector(".tabs-container .wrapper")?.append(newTab);
                    contentSection.querySelector(".content-wrapper")?.append(charPropertySection);
                }
            }
        });
    }
    let buttons = contentSection.querySelectorAll(".tabs-container .wrapper button");
    buttons[0].click();
}
function createRollButton(tableName) {
    return HelperFunctions.stringToElement(`<button data-roll-table='${tableName}'>${tableName}</button>`);
}
function createLevelInput(value) {
    return HelperFunctions.stringToElement(`<input type="number" min="1" max="10" value=${value}/>`);
}

function createClock(value) {}

function checkForMetadata(tabDataKey, dummyElement) {
    let propsVibesUtilities = [];
    switch (tabDataKey) {
        case "location":
            const locationData = $(dummyElement.querySelector("content content")).data(); //.rollTable;
            if (locationData?.rollTable) {
                let button = createRollButton(locationData.rollTable);
                $(button).on("click", (event) => {
                    const rollTable = game.tables.getName(locationData.rollTable);
                    rollTable.draw();
                });
                propsVibesUtilities.push($(button)[0]);
            }
            if (locationData?.macro) {
                let button = createRollButton(locationData.macro);
                $(button).on("click", (event) => {
                    const macro = game.macros.getName(locationData.macro);
                    macro.execute();
                    // rollTable.draw();
                });
                propsVibesUtilities.push($(button)[0]);
            }
            break;
        case "character":
            let mechanicsSection = [];
            const characterData = $(dummyElement.querySelector("content content")).data(); //.rollTable;
            let { level, clockValue } = characterData;
            if (level) {
                level = characterData.level;
            } else {
                level = 4;
            }
            mechanicsSection.push(createLevelInput(level));
            if (clockValue) {
                new ClockConfig({}).render(true);
                //
                //
            }

            break;
        default:
            break;
    }
    if (tabDataKey === "location") {
    }
    return propsVibesUtilities;
}
