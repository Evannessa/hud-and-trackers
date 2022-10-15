import { HelperFunctions, tokenFromExternalData } from "../helper-functions.js";
import { InSceneEntityManager as CharacterManager, InSceneEntityManager } from "../classes/InSceneCharacterManager.js";
export class CharacterSpotlightHUD {
    static async createDisplayHUDs() {
        $(document.documentElement.querySelector("#ui-middle")).append("<div id='characterDisplay'></div>");
        $(document.documentElement.querySelector("#ui-middle")).append(
            `<div id='characterSpotlight' class='JTCS-hidden'>
            <img src="" alt="spotlight image"/>
        </div>`
        );
    }

    static async addCharactersToSceneHUD() {
        const characters = await InSceneEntityManager.getEntitiesInScene(game.scenes.viewed, "charactersInScene");
        const characterDisplay = document.documentElement
            .querySelector("#ui-middle")
            .querySelector("#characterDisplay");
        const characterSpotlight = document.documentElement
            .querySelector("#ui-middle")
            .querySelector("#characterSpotlight");
        const characterImages = characters
            .map((char) => {
                const ourElement = HelperFunctions.stringToElement(char.cardHTML);
                const img = ourElement.querySelector("img.card-img");
                if (img) {
                    img.setAttribute("dataName", ourElement.querySelector("a").textContent);
                }
                return img; //.getAttribute("src");
            })
            .filter((img) => img);
        characterImages.forEach((element) => {
            let { createdElement, classList, src, name } = CharacterSpotlightHUD.createElement(element);
            // const $element = $(element);
            // const src = $element.attr("src");
            // const classList = $element.attr("class");
            // let name = $element.attr("dataName");
            // name = game.JTCS.utils.manager.capitalizeEachWord(name);
            characterDisplay.append(
                createdElement
                // HelperFunctions.stringToElement(
                // `<img src=${src} width="25%" data-name='${name}' data-title='${name}' height="auto"/>`
                // )
            );
            const appended = characterDisplay.querySelector(`img[src='${src}']`);
            $(appended).addClass(classList);
            CharacterSpotlightHUD.activateListeners(appended, src, name);
        });
    }
    static createElement(element) {
        const $element = $(element);
        const src = $element.attr("src");
        const classList = $element.attr("class");
        let name = $element.attr("dataName");
        name = game.JTCS.utils.manager.capitalizeEachWord(name);
        return {
            createdElement: HelperFunctions.stringToElement(
                `<img src=${src} width="25%" data-name='${name}' data-title='${name}' height="auto"/>`
            ),
            classList,
            src,
            name,
        };
    }
    static activateListeners(appended, src, name) {
        $(appended)
            .on("mouseenter", (event) => {
                characterSpotlight.querySelector("img").setAttribute("src", src);
                characterSpotlight.classList.remove("JTCS-hidden");
            })
            .on("mouseleave", (event) => {
                characterSpotlight.querySelector("img").setAttribute("src", "");
                characterSpotlight.classList.add("JTCS-hidden");
            })
            .on("click", async (event) => {
                if (game.user.isGM) {
                    //create token
                    await tokenFromExternalData("", "", { src, name });
                    //TODO: - add some way to configure clocks here as well
                } else {
                    HelperFunctions.createImagePopout(src, name);
                }
            });
    }
}
