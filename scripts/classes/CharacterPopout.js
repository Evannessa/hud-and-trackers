"use strict";
import { popoutActions } from "./PopoutActions.js";
import { setInvisibleHeader, handleDrag, addDragHandle, HelperFunctions, uniqBy } from "../helper-functions.js";
const MODULE_ID = "hud-and-trackers";
import { InSceneEntityManager as CharacterManager, InSceneEntityManager } from "../classes/InSceneCharacterManager.js";
import * as ProcessWikiData from "../classes/ProcessWikiData.js";
import { LocationsManager } from "./LocationsManager.js";
import { socket } from "./sockets.js";
Hooks.on("renderHeadsUpDisplay", (app, html, data) => {
    html[0].style.zIndex = 70;
    html.append(`<div id="characterDisplay"></div>`);
});

Hooks.on("ready", async () => {
    let { processClanNames, processLocations } = ProcessWikiData;
    await processClanNames();
    await processLocations();
    if (!game.characterPopout) {
        game.characterPopout = new CharacterPopout().render(true);
    }
    createDisplayHUDs();
});
Hooks.on("renderCharacterPopout", async (app, html) => {
    setInvisibleHeader(html, true);

    addCharactersToSceneHUD();
});
async function createDisplayHUDs() {
    $(document.documentElement.querySelector("#ui-middle")).append("<div id='characterDisplay'></div>");
    $(document.documentElement.querySelector("#ui-middle")).append(
        `<div id='characterSpotlight' class='JTCS-hidden'>
            <img src="" alt="spotlight image"/>
        </div>`
    );
}

async function addCharactersToSceneHUD() {
    const characters = await InSceneEntityManager.getEntitiesInScene(game.scenes.viewed, "charactersInScene");
    const characterDisplay = document.documentElement.querySelector("#ui-middle").querySelector("#characterDisplay");
    const characterSpotlight = document.documentElement
        .querySelector("#ui-middle")
        .querySelector("#characterSpotlight");
    const characterImages = characters.map((char) => {
        const ourElement = stringToElement(char.cardHTML);
        return ourElement.querySelector("img.card-img"); //.getAttribute("src");
    });
    characterImages.forEach((element) => {
        const $element = $(element);
        const src = $element.attr("src");
        const classList = $element.attr("class");
        characterDisplay.append(stringToElement(`<img src=${src} width="25%" height="auto"/>`));
        const appended = characterDisplay.querySelector(`img[src='${src}']`);
        $(appended).addClass(classList);
        $(appended)
            .on("mouseenter", (event) => {
                characterSpotlight.querySelector("img").setAttribute("src", src);
                characterSpotlight.classList.remove("JTCS-hidden");
            })
            .on("mouseleave", (event) => {
                characterSpotlight.querySelector("img").setAttribute("src", "");
                characterSpotlight.classList.add("JTCS-hidden");
            });
    });
}
function stringToElement(html) {
    var template = document.createElement("template");
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild; //.querySelector("img.card-img").getAttribute("src");
}
export class CharacterPopout extends Application {
    constructor(data = {}) {
        super();
        this.tabsData = data;
    }

    async addCharacterToScene(event, app) {
        let clickedCard = event.currentTarget;
        let url = clickedCard.querySelector(".internal-link").getAttribute("href");
        url = url.split("/").pop();
        await CharacterManager.addEntityToScene({ cardHTML: clickedCard.outerHTML, url });
    }

    async linkLocationToScene(event, app) {
        let clickedCard = event.currentTarget;
        let url = clickedCard.querySelector(".internal-link").getAttribute("href");
        url = url.split("/").pop();
        await LocationsManager.linkLocationToScene({ cardHTML: clickedCard.outerHTML, url });
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form"],
            popOut: true,
            height: 300,
            width: 600,
            resizable: false,
            // minimizeable: true,
            top: "100%",
            template: `modules/${MODULE_ID}/templates/CharacterPopout.hbs`,
            id: "CharacterPopout",
            title: " Character Popout",
        });
    }

    async getData() {
        const { tabsData, clanTags, locationTags } = ProcessWikiData;
        const currentScene = game.scenes.viewed;

        // const { currentCharacterUrl, currentLocationUrl } = await HelperFunctions.getSettingValue("currentURLs");
        const { currentCharacterUrl, currentLocationUrl } = await HelperFunctions.getFlagValue(
            currentScene,
            "currentURLs",
            {
                currentCharacterUrl: "",
                currentLocationUrl: "",
            }
        );
        if (!this.currentCharacterUrl) this.currentCharacterUrl = currentCharacterUrl;
        if (!this.currentLocationUrl) this.currentLocationUrl = currentLocationUrl;

        let ourData = {
            ...tabsData,
            clans: { tabs: clanTags },
            locations: { tabs: locationTags },
            currentCharacterUrl: this.currentCharacterUrl,
            currentLocationUrl: this.currentLocationUrl,
        };
        this.tabsData = ourData;

        this.setLabelText(ourData, "current-location", this.currentLocationUrl);
        this.setLabelText(ourData, "selected-character", this.currentCharacterUrl);

        return ourData;
    }
    setLabelText(object, property, variable) {
        const value = variable
            ? HelperFunctions.capitalizeEachWord(variable, "-", " ")
            : getProperty(object, `global.tabs.${property}.label`);

        setProperty(object, `global.tabs.${property}.label`, decodeURIComponent(value));
    }
    async setTab(tabId, tabType, event, appElement) {
        const sectionData = this.tabsData[tabType].tabs[tabId];
        if (tabType === "location" || tabType === "character") {
            let parentSection = appElement[0].querySelector(`.content#${tabId}`).closest(".tab-section");
            let cleanId = tabId;
            cleanId = game.JTCS.utils.manager.capitalizeEachWord(
                cleanId
                    .replaceAll(/-+/g, " ")
                    .replace("site", "(Site)")
                    .replace("area", "[Area]")
                    .replace("region", "Region - ")
            );
            let title = parentSection.querySelector("h1");
            let subtitle = title.querySelector("span");
            if (subtitle) subtitle.textContent = cleanId;
            else title.insertAdjacentHTML("beforeend", `<span>${cleanId}</span>`);
            // console.log(event.currentTarget, appElement[0].querySelector(`.content#${tabId}`)?.querySelector("h1"));
        }
        if (sectionData.hasOwnProperty("callback")) {
            const isFetched = sectionData.hasOwnProperty("isFetched") && sectionData.isFetched === true;
            //if it doesn't have an isFetched property, or it's set to false
            if (!isFetched) {
                await sectionData.callback(event, appElement);
                if (sectionData.hasOwnProperty("isFetched")) {
                    //if it's false (triple === will make sure it's false, not just undefined)
                    //set it to true
                    sectionData.isFetched = true;
                }
            } else {
                // it's already fetched, we want to set the default tab
                if (tabType === "global") {
                    const defaultButton = Array.from(
                        appElement.find(`#${tabId}`)[0].querySelectorAll(".tabs-container button")
                    )[0];
                    // defaultButton.click();

                    // defaultSection.classList.add("visible");
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
        const closestTabSectionToContentSection = html[0].querySelector(`#${activeID}`).closest(".tab-section");
        console.log(closestTabSectionToContentSection);
        const id = closestTabSectionToContentSection.getAttribute("id");

        let sectionSelector;
        if (activeType === "global") sectionSelector = ".tab-section";
        else sectionSelector = `.tab-section#${id} .content`; //only clear this current section, no others

        //hide other sections of this type, and remove active styles on button
        const hideSections = appElement.find(sectionSelector);
        const deactivateTabs = appElement.find(`[data-tab-type=${activeType}]`);

        hideSections.removeClass("visible");

        deactivateTabs.removeClass("active");

        //make the section w/ the id visible and add active to the button
        const activeSection = appElement.find(`#${activeID}`);
        console.log(activeID, activeSection);
        const activeButton = appElement.find(`[data-tab="${activeID}"]`);

        activeSection.addClass("visible");
        activeButton.addClass("active");
    }
    async activateDefaultTab($html, globalTabID, innerTabID = "") {
        const defaultTabGlobal = $html.find(`[data-tab='${globalTabID}']`)[0];
        await this.syntheticClick(defaultTabGlobal);
        if (innerTabID) {
            const defaultTabInner = $html.find(`[data-tab='${innerTabID}']`)[0];
        }
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
            const el = event.currentTarget;

            if (el.closest("#all-characters")) {
                await popoutActions.card["addCharacterToScene"].onClick(event);
                // await this._handleAction(event, "addToScene", this);
            } else if (el.closest("#all-locations")) {
                await popoutActions.card["linkLocationToScene"].onClick(event);
                // await this._handleAction(event, "linkLocation", this);
            } else if (el.closest("#characters-in-scene")) {
                await this._handleAction(event, "selectCharacter", this);
            } else if (el.closest("#linked-locations")) {
                await this._handleAction(event, "selectLocation", this);
            }
        });
        html.off("contextmenu", ".card").on("contextmenu", ".card", async (event) => {
            const el = event.currentTarget;
            if (el.closest("#characters-in-scene")) {
                await popoutActions.card["removeFromScene"].onRightClick(event, { app: this });
            } else if (el.closest("#linked-locations")) {
                await popoutActions.card["unlinkLocation"].onRightClick(event, { app: this });
            }
        });

        html.off("click", "[data-action]").on(
            "click",
            "[data-action]",
            async (event) => await this._handleAction(event, "expand", this)
        );
        html.off("click", "img").on(
            "click",
            "img",
            async (event) => await this._handleAction(event, "sendToTile", this)
        );
        this.hideTabs(html);
        await this.activateDefaultTab(html, "selected-character");
    }
    dragHandler(html) {
        let ancestorElement = html[0].closest(".window-app");

        addDragHandle(html, ancestorElement, ".window-content");
        const dragHandle = $(ancestorElement).find("#drag-handle")[0];
        const drag = new Draggable(this, html, dragHandle, false);

        handleDrag(drag);
    }

    hideTabs($html) {
        if (!this.currentCharacterUrl) {
            $html.find("[data-tab='selected-character']").addClass("hidden");
        }
        if (!this.currentLocationUrl) {
            $html.find("[data-tab='current-location']").addClass("hidden");
        }
        if (!game.user.isGM) {
            $html.find("[data-tab='all-locations']").addClass("hidden");
            $html.find("[data-tab='all-characters']").addClass("hidden");
        }
    }

    async _handleAction(event, actionType, app) {
        event.preventDefault();
        const currentTarget = $(event.currentTarget);
        if (!actionType || !app) {
            return;
        }
        if (actionType === "expand") {
            const ancestor = app.element[0].closest("#CharacterPopout");
            if (currentTarget[0].dataset.action === "expandTabs") {
                const tabsContainer = currentTarget[0].closest(".tabs-container");
                currentTarget[0].closest(".tabs-container").classList.toggle("expanded");

                const icon = currentTarget[0].querySelector("i");
                if (tabsContainer.classList.contains("expanded")) {
                    $(icon).removeClass("fa-caret-right").addClass("fa-caret-left");
                    $(ancestor).on("click", ".main, .header", (newEvent) => {
                        if (newEvent.target !== event.target) {
                            //if we clicked outside the side-drawer
                            if (!newEvent.target.closest(".tabs-container")) {
                                tabsContainer.classList.toggle("expanded");
                                $(icon).removeClass("fa-caret-left").addClass("fa-caret-right");
                                $(ancestor).off("click", ".main, .header");
                            }
                        }
                    });
                } else {
                    $(icon).removeClass("fa-caret-left").addClass("fa-caret-right");
                    $(ancestor).off("click", ".main, .header");
                }
            } else app.element[0].closest("#CharacterPopout").classList.toggle("expanded");
        }
        if (actionType === "addToScene" || actionType === "linkLocation") {
            //if the card is an "all characters" card, add it to the "charactersInScene"
            if (actionType === "addToScene") await this.addCharacterToScene(event, app.element);
            if (actionType === "linkLocation") await this.linkLocationToScene(event, app.element);
        } else if (actionType === "selectCharacter" || actionType === "selectLocation") {
            //if the card is an "add to scene" card, choose it as the selected character or scene
            //we'll want to get the url of the selected character
            let link = currentTarget[0].querySelector(".internal-link");
            let url = link.getAttribute("href").split("/").pop();
            let entityName = link.innerText;
            let propertyName = actionType === "selectCharacter" ? "currentCharacterUrl" : "currentLocationUrl";
            let dataSelector = actionType === "selectCharacter" ? "selected-character" : "current-location";

            //set the selected character on the app's object
            app[propertyName] = url;
            //set it in our settings
            // let urls = await HelperFunctions.getSettingValue("currentURLs");
            let urls = await HelperFunctions.getFlagValue(game.scenes.viewed, "currentURLs", "", {
                currentCharacterUrl: "",
                currentLocationUrl: "",
            });
            urls[propertyName] = url;
            await HelperFunctions.setFlagValue(game.scenes.viewed, "currentURLs", urls);
            // await HelperFunctions.setSettingValue("currentURLs", urls);

            //change the tab to reflect the name of the selected character or location
            const ourTab = app.element[0].querySelector(`[data-tab='${dataSelector}']`);
            console.log(entityName, decodeURI(entityName), decodeURIComponent(entityName));
            ourTab.textContent = decodeURIComponent(entityName);

            //show the tab
            ourTab.classList.remove("hidden");

            //reset the "isFetched" so new data can be fetched
            this.tabsData.global.tabs[dataSelector].isFetched = false;
        } else if (actionType === "tabClick") {
            let tabType = currentTarget.data().tabType;
            let tabId = event.currentTarget.dataset.tab;
            await this.setTab(tabId, tabType, event, app.element);
        } else if (actionType === "sendToTile") {
            if (!game.user.isGM) {
                let src = currentTarget.attr("src");
                const ip = new ImagePopout(src, {
                    title: "My Featured Image",
                    //   uuid: game.actors.getName("My Hero").uuid
                });

                // Display the image popout
                ip.render(true);
                //popout image and return?
                return;
            }
            //we only want the image clicks to work on the other tabs, not these two
            const wrongTabs = currentTarget[0].closest("#all-characters") || currentTarget[0].closest("#all-locations");
            if (wrongTabs) {
                return;
            }

            let name = "Wiki Display Journal";
            let wikiDisplayJournal = game.journal.getName(name);
            let createData = {
                name: name,
            };
            if (!wikiDisplayJournal) {
                // let wikiJournalData = new JournalEntry(createData);
                wikiDisplayJournal = await JournalEntry.create(createData, {});
            }

            let updateData = {
                _id: wikiDisplayJournal.id,
                content: currentTarget[0].outerHTML,
            };
            await wikiDisplayJournal.update(updateData);
            if (!wikiDisplayJournal.sheet.rendered) {
                wikiDisplayJournal.sheet.render(true);
            }
            // await game.scenes.viewed.tiles.contents[0].update({object: {zIndex:500}})
        }
    }
}

window.CharacterPopout = CharacterPopout;
