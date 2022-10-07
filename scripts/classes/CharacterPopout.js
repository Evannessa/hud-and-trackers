"use strict";
import { setInvisibleHeader, handleDrag, addDragHandle, HelperFunctions } from "../helper-functions.js";
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
        let { tabsData, clanTags, locationTags } = ProcessWikiData;
        const { currentCharacterUrl, currentLocationUrl } = await HelperFunctions.getSettingValue("currentURLs");
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

        console.log("%cCharacterPopout.js line:78 value", "color: #26bfa5;", object);
        setProperty(object, `global.tabs.${property}.label`, value);
    }
    async setTab(tabId, tabType, event, appElement) {
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
        await this.activateDefaultTab(html, "linked-locations");
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
            if (currentTarget[0].dataset.action === "expandTabs")
                currentTarget[0].closest(".tabs-container").classList.toggle("expanded");
            else app.element[0].closest("#CharacterPopout").classList.toggle("expanded");
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
            let urls = await HelperFunctions.getSettingValue("currentURLs");
            console.log("%cCharacterPopout.js line:202 urls", "color: #26bfa5;", urls);
            urls[propertyName] = url;
            await HelperFunctions.setSettingValue("currentURLs", urls);
            console.log("%cCharacterPopout.js line:202 urls", "color: #26bfa5;", urls);

            //change the tab to reflect the name of the selected character or location
            const ourTab = app.element[0].querySelector(`[data-tab='${dataSelector}']`);
            ourTab.textContent = entityName;

            //show the tab
            ourTab.classList.remove("hidden");

            //reset the "isFetched" so new data can be fetched
            this.tabsData.global.tabs[dataSelector].isFetched = false;
        } else if (actionType === "tabClick") {
            let tabType = currentTarget.data().tabType;
            let tabId = event.currentTarget.dataset.tab;
            await this.setTab(tabId, tabType, event, app.element);
        } else if (actionType === "sendToTile") {
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
