"use strict";
import { setInvisibleHeader, handleDrag, addDragHandle } from "../helper-functions.js";
const MODULE_ID = "hud-and-trackers";
import { InSceneCharacterManager as CharacterManager } from "../classes/InSceneCharacterManager.js";
import * as ProcessWikiData from "../classes/ProcessWikiData.js";
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
        let { tabsData, clanTags } = ProcessWikiData;
        let ourData = { ...tabsData, clans: { tabs: clanTags } };
        this.tabsData = ourData;
        return ourData;
    }
    async setTab(tabId, tabType, event, appElement) {
        // //for dash to camelCase and vise versa
        const sectionData = this.tabsData[tabType].tabs[tabId];
        if (sectionData.hasOwnProperty("callback")) {
            let isFetched = sectionData.hasOwnProperty("isFetched") && sectionData.isFetched === true;
            //if it doesn't have an isFetched property, or it's set to false
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
