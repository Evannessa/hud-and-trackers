import { HelperFunctions as HF } from "../helper-functions.js";
import { CharacterPopout } from "./CharacterPopout.js";
import { InSceneEntityManager as EntityManager } from "./InSceneCharacterManager.js";
import { fetchAllEntities, getUrlsFromURL } from "./ProcessWikiData.js";

export function extractUrlFromCard(event, card) {
    if (!card) card = event.currentTarget;
    let url = card.querySelector(".internal-link").getAttribute("href");
    url = url.split("/").pop();
    return { url, card };
}

export const popoutActions = {
    card: {
        removeFromScene: {
            onRightClick: async (event, options) => {
                // const { app } = options;
                const { url, card: clickedCard } = extractUrlFromCard(event);
                await EntityManager.removeEntityFromScene({ cardHTML: clickedCard.outerHTML, url }, "", "character");
                clickedCard.remove();
            },
        },
        unlinkLocation: {
            onRightClick: async (event, options) => {
                // const { app } = options;
                const { url, card: clickedCard } = extractUrlFromCard(event);
                await EntityManager.removeEntityFromScene({ cardHTML: clickedCard.outerHTML, url }, "", "location");
                clickedCard.remove();
            },
        },
        addCharacterToScene: {
            onClick: async (event, options = {}) => {
                const { url, card: clickedCard } = extractUrlFromCard(event);
                await EntityManager.addEntityToScene({ cardHTML: clickedCard.outerHTML, url }, "", "character");
            },
        },
        linkLocationToScene: {
            onClick: async (event, app) => {
                const { url, card: clickedCard } = extractUrlFromCard(event);
                console.log("Eeeeh?");
                await EntityManager.addEntityToScene({ cardHTML: clickedCard.outerHTML, url }, "", "location");
            },
        },
        selectCharacter: {
            onClick: async () => {
                // game.characterPopout.element.find("")
                return;
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
                let urls = await HF.getFlagValue(game.scenes.viewed, "currentURLs", "", {
                    currentCharacterUrl: "",
                    currentLocationUrl: "",
                });
                urls[propertyName] = url;
                await HF.setFlagValue(game.scenes.viewed, "currentURLs", urls);
                // await HelperFunctions.setSettingValue("currentURLs", urls);

                //change the tab to reflect the name of the selected character or location
                const ourTab = app.element[0].querySelector(`[data-tab='${dataSelector}']`);
                ourTab.textContent = decodeURIComponent(entityName);

                //show the tab
                ourTab.classList.remove("hidden");

                //reset the "isFetched" so new data can be fetched
                this.tabsData.global.tabs[dataSelector].isFetched = false;
            },
        },

        linkSubLocations: {
            onClick: async (event, options = {}) => {
                const { url, card: clickedCard } = extractUrlFromCard(event);
                const { html } = options;
                console.log("%cPopoutActions.js line:48 url", "color: #26bfa5;", url);
                await getUrlsFromURL(html, url);
                // await fetchAllEntities(html, url, )
                //add sub locations
                //1.
            },
        },
        displayMapFrame: {
            onClick: async (event, mapUrl = "") => {
                let url = mapUrl;
                if (!url) url = extractUrlFromCard(event).url;
                // const { html } = options;
                // const allLocationsContainer = html[0].querySelector(".tab-section#current-location .main");
                const baseURL = "https://fastidious-smakager-702620.netlify.app/";
                const iframe = `<iframe class="map-display-frame" src='${baseURL}${url}'></iframe>`;
                // allLocationsContainer.appendChild(iframe);
                HF.createIFrameJournal(iframe);
            },
        },
    },
};
