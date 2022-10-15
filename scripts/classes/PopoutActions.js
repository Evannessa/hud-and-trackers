import { HelperFunctions as HF } from "../helper-functions.js";
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
                await EntityManager.addEntityToScene({ cardHTML: clickedCard.outerHTML, url }, "", "location");
            },
        },
        addCharacterToken: {},
        addSceneDisplay: {},
        linkSubLocations: {
            onClick: async (event, options = {}) => {
                const { url, clickedCard } = extractUrlFromCard(event);
                const { html } = options;
                console.log("%cPopoutActions.js line:48 url", "color: #26bfa5;", url);
                await getUrlsFromURL(html, url);
                // await fetchAllEntities(html, url, )
                //add sub locations
                //1.
            },
        },
    },
};
