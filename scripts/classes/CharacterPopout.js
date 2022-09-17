"use strict";
import { setInvisibleHeader, handleDrag, addDragHandle } from "../helper-functions.js";
const MODULE_ID = "hud-and-trackers";
import { InSceneCharacterManager as CharacterManager } from "../classes/InSceneCharacterManager.js";
import * as ProcessWikiData from "../classes/ProcessWikiData.js";
import { LocationsManager } from "./LocationsManager.js";
Hooks.on("ready", async () => {
    let { processClanNames, processLocations } = ProcessWikiData;
    await processClanNames();
    await processLocations();
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
        await CharacterManager.addCharacterToScene({ cardHTML: clickedCard.outerHTML, url });
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
            resizable: true,
            minimizeable: true,
            template: `modules/${MODULE_ID}/templates/CharacterPopout.hbs`,
            id: "CharacterPopout",
            title: " Character Popout",
        });
    }

    async getData() {
        let { tabsData, clanTags, locationTags } = ProcessWikiData;
        let ourData = { ...tabsData, clans: { tabs: clanTags }, locations: { tabs: locationTags } };
        this.tabsData = ourData;
        return ourData;
    }
    async setTab(tabId, tabType, event, appElement) {
        console.log("Our tabs data is", this.tabsData, "Tab type is", tabType);
        const sectionData = this.tabsData[tabType].tabs[tabId];
        if (sectionData.hasOwnProperty("callback")) {
            let isFetched = sectionData.hasOwnProperty("isFetched") && sectionData.isFetched === true;
            //if it doesn't have an isFetched property, or it's set to false
            if (!isFetched) {
                await sectionData.callback(event, appElement);
                if (sectionData.hasOwnProperty("isFetched")) {
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
            let el = event.currentTarget;
            console.log("Cards are being clicked");

            if (el.closest("#all-characters")) {
                await this._handleAction(event, "addToScene", this);
            } else if (el.closest("#all-locations")) {
                await this._handleAction(event, "linkLocation", this);
            } else if (el.closest("#characters-in-scene")) {
                await this._handleAction(event, "selectCharacter", this);
            } else if (event.currentTarget.closest("#linked-locations")) {
                await this._handleAction(event, "selectLocation", this);
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
        if (actionType === "addToScene" || actionType === "linkLocation") {
            //if the card is an "all characters" card, add it to the "charactersInScene"
            if (actionType === "addToScene") await this.addCharacterToScene(event, app.element);
            if (actionType === "linkLocation") await this.linkLocationToScene(event, app.element);
        } else if (actionType === "selectCharacter" || actionType === "selectLocation") {
            //if the card is an "add to scene" card, choose it as the selected character or scene
            //we'll want to get the url of the selected character
            let link = currentTarget[0].querySelector(".internal-link");
            let url = link.getAttribute("href").split("/").pop();
            console.log("Our selected link", link);
            let entityName = link.innerText;
            let propertyName = actionType === "selectCharacter" ? "currentCharacterUrl" : "currentLocationUrl";
            let dataSelector = actionType === "selectCharacter" ? "selected-character" : "current-location";

            //set the selected character on the app's object
            app[propertyName] = url;
            // console.log(entityName, propertyName, dataSelector);

            //change the tab to reflect the name of the selected character or location
            app.element[0].querySelector(`[data-tab='${dataSelector}']`).textContent = entityName;
        } else if (actionType === "tabClick") {
            let tabType = currentTarget.data().tabType;
            let tabId = event.currentTarget.dataset.tab;
            await this.setTab(tabId, tabType, event, app.element);
        }
    }
}

window.CharacterPopout = CharacterPopout;
