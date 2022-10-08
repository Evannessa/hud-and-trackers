import { HelperFunctions as HF } from "../helper-functions.js";
import { InSceneEntityManager as EntityManager } from "./InSceneCharacterManager.js";

function extractUrlFromCard(event) {
    const clickedCard = event.currentTarget;
    let url = clickedCard.querySelector(".internal-link").getAttribute("href");
    url = url.split("/").pop();
    return { url, clickedCard };
}
export const popoutActions = {
    card: {
        removeFromScene: {
            onRightClick: async (event, options) => {
                // const { app } = options;
                const { url, clickedCard } = extractUrlFromCard(event);
                await EntityManager.removeEntityFromScene({ cardHTML: clickedCard.outerHTML, url }, "", "character");
                clickedCard.remove();
            },
        },
        unlinkLocation: {
            onRightClick: async (event, options) => {
                // const { app } = options;
                const { url, clickedCard } = extractUrlFromCard(event);
                await EntityManager.removeEntityFromScene({ cardHTML: clickedCard.outerHTML, url }, "", "location");
                clickedCard.remove();
            },
        },
        addCharacterToScene: {
            onClick: async (event, options = {}) => {
                const { url, clickedCard } = extractUrlFromCard(event);
                await EntityManager.addEntityToScene({ cardHTML: clickedCard.outerHTML, url }, "", "character");
            },
        },
        linkLocationToScene: {
            onClick: async (event, app) => {
                const { url, clickedCard } = extractUrlFromCard(event);
                await EntityManager.addEntityToScene({ cardHTML: clickedCard.outerHTML, url }, "", "location");
                // await LocationsManager.linkLocationToScene({ cardHTML: clickedCard.outerHTML, url });
            },
        },
    },
};
