import { HelperFunctions, tokenFromExternalData } from "../helper-functions.js";
import { InSceneEntityManager as CharacterManager, InSceneEntityManager } from "../classes/InSceneCharacterManager.js";
Hooks.on("renderSidebarTab", async (app, html) => {
    html[0].style.position = "relative";
});
export class CharacterSpotlightHUD {
    static async createDisplayHUDs() {
        let parentElement = $(document.documentElement.querySelector("#ui-middle"));
        parentElement.append(
            `<div id='characterSpotlight' class='JTCS-hidden'>
            <img src="" alt="spotlight image"/>
        </div>`
        );
    }

    static async clearSceneHUD() {
        const characterDisplay = document.documentElement
            .querySelector("#CharacterPopout")
            .querySelector("#characterDisplay");
        $(characterDisplay).empty();
    }
    static async addCharactersToSceneHUD(ancestorId = "#ui-middle") {
        const characters = await InSceneEntityManager.getEntitiesInScene(game.scenes.viewed, "charactersInScene");
        const characterDisplay = document.documentElement
            .querySelector("#CharacterPopout")
            .querySelector("#characterDisplay");
        game.characterDisplay = characterDisplay;
        const characterSpotlight = document.documentElement
            .querySelector("#ui-middle")
            .querySelector("#characterSpotlight");
        const characterImages = characters
            .map((char) => {
                const ourElement = HelperFunctions.stringToElement(char.cardHTML);
                const img = ourElement.querySelector("img.card-img");
                if (img) {
                    img.setAttribute("dataName", ourElement.querySelector("a").textContent);
                    img.setAttribute("dataURL", ourElement.querySelector("a").getAttribute("href"));
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
            CharacterSpotlightHUD.activateListeners(appended, src, name, characterSpotlight);
        });
    }
    static createElement(element) {
        const $element = $(element);
        const src = $element.attr("src");
        const classList = $element.attr("class");
        let name = $element.attr("dataName");
        let url = $element.attr("dataURL");

        name = game.JTCS.utils.manager.capitalizeEachWord(name);
        return {
            createdElement: HelperFunctions.stringToElement(
                `<img src=${src} width="25%" data-name='${name}' data-url='${url}' title='${name}' height="auto"/>`
            ),
            classList,
            src,
            name,
        };
    }
    static activateListeners(appended, src, name, characterSpotlight) {
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
                if (event.ctrlKey || event.metaKey) {
                    //select character
                    let url = appended.dataset.url.split("/").pop();
                    await game.characterPopout.selectCharacterOrLocation(
                        url,
                        name,
                        "selectCharacter",
                        game.characterPopout
                    );
                    let selectedCharacterTab = game.characterPopout.element[0].querySelector(
                        "[data-tab='selected-character']"
                    );
                    //if it's already active, click it again to reset the data to the new character
                    if (selectedCharacterTab.classList.contains("active")) {
                        selectedCharacterTab.click();
                    }
                } else {
                    if (game.user.isGM) {
                        //create token
                        await tokenFromExternalData("", "", { src, name });
                    } else {
                        //show image in popout
                        HelperFunctions.createImagePopout(src, name);
                    }
                }
            });
    }
}
