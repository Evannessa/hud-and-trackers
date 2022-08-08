import * as HelperFunctions from "./helper-functions.js";
let clanTags;
let categoryIndividualTags;
let basePath = "/Idyllwild/Art/Characters";

fetch("/Idyllwild/Test JSON Data/tags.json")
    .then((response) => {
        return response.json();
    })
    .then((data) => {
        categoryIndividualTags = data.find((tags) => {
            return tags.tag.includes("category/individual");
        });
        clanTags = data.filter((tags) => {
            return tags.tag.includes("clans/");
        });
    });

Hooks.on("ready", () => {
    // console.log("Our tags", characterTags, processTagData());
    game.characterTags = processTagData();

    let data = {
        mode: "display",
    };

    game.innerSceneDisplayConfig = new InnerSceneDisplayConfig(data).render(true, { data });
});

Hooks.on("canvasReady", async (canvas) => {
    // game.innerSceneDisplayConfig.data.temporaryCharacters = await HelperFunctions.getAllActorsInScene();
    // game.innerSceneDisplayConfig.currentScene = canvas.scene;
    if (game.innerSceneDisplayConfig) {
        console.log(game.innerSceneDisplayConfig.data);
        game.innerSceneDisplayConfig.render(true);
    }
});

Hooks.on("createTile", async (tile) => {
    let tileID = tile.id;
    let sceneTiles = await game.JTCS.getSceneSlideshowTiles("", true);
    let foundTileData = await game.JTCS.getTileDataFromFlag(tileID, sceneTiles);

    if (foundTileData && game.innerSceneDisplayConfig) {
        game.innerSceneDisplayConfig.render(true);
    }
});
Hooks.on("deleteTile", async (tile) => {
    let tileID = tile.id;

    let sceneTiles = await game.JTCS.getSceneSlideshowTiles("", true);
    let foundTileData = await game.JTCS.getTileDataFromFlag(tileID, sceneTiles);

    if (foundTileData && game.innerSceneDisplayConfig) {
        game.innerSceneDisplayConfig.render(true);
    }
});

Hooks.once("init", () => {
    loadTemplates([`modules/hud-and-trackers/templates/character-scene-display/actor-list-template.hbs`]);
});
Hooks.on("renderInnerSceneDisplayConfig", (app, html) => {
    let windowApp = html.closest(".window-app");
    $(windowApp).css({
        height: "-moz-max-content",
        height: "fit-content",
        width: "fit-content",
    });
    HelperFunctions.setInvisibleHeader(html, true);
});

/**
 * Take the data from the JSON file, and convert it into usable data
 * @returns processed array of objects
 */
function processTagData() {
    let individuals = categoryIndividualTags.relativePaths;
    return clanTags.map((tagObject) => {
        let characterPaths = tagObject.relativePaths.filter((charPath) => individuals.includes(charPath));
        return {
            tagName: tagObject.tag,
            characters: characterPaths.map((path, index) => {
                let clanName = tagObject.tag.split("/").pop();
                clanName = clanName.charAt(0).toUpperCase() + clanName.slice(1);
                //get character name from file path
                let name = path.split("/").pop().replace(".md", "");
                let firstName = name.split(" ").shift();
                if (!name.toLowerCase().includes(clanName.toLowerCase())) {
                    firstName = name.split(" ").pop();
                }
                let pathName = name.split(" ").join("-").toLowerCase();

                return {
                    name: name,
                    pathName: pathName,
                    imagePath: `${basePath}/${clanName}/${firstName}.webp`,
                };
            }),
        };
    });
}

/**
 * Will display scenes I don't want to make entire scenes for
 * Along with characters
 */
class InnerSceneDisplayConfig extends Application {
    constructor(data) {
        super();
        this.getSceneDisplayData();
        this.data = { ...data };
        if (!game.user.isGM) {
            this.data.mode === "display";
        }
        if (this.data.mode === "display") {
            this.element.addClass("transparent");
        }
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["transparent", "hud-and-trackers"],
            popOut: true,
            template: `/modules/hud-and-trackers/templates/inner-scene-display/scene-map.hbs`,
            id: "inner-scene-display",
            title: "Inner Scene Display",
            resizable: true,
        });
    }

    async getSceneDisplayData() {
        let currentScene = game.scenes.viewed;
        let sceneDisplayData = await currentScene.getFlag("hud-and-trackers", "sceneDisplayData");
        if (!sceneDisplayData || !sceneDisplayData.characters || !sceneDisplayData.innerScenes) {
            let data = {
                mode: "edit",
                characters: [],
                innerScenes: [],
            };
            sceneDisplayData = await currentScene.setFlag("hud-and-trackers", "sceneDisplayData", data);
        }
        return sceneDisplayData;
    }

    async setSceneDisplayData(data) {
        await currentScene.setFlag("hud-and-trackers", "sceneDisplayData", data);
    }

    async getSceneDisplayTiles() {
        let flaggedTiles = await game.JTCS.getSceneSlideshowTiles("art", true);
        // let currentScene = game.scenes.viewed;
        // let flaggedTiles = (await currentScene.getFlag("journal-to-canvas-slideshow", "slideshowTiles")) || [];
        return flaggedTiles;
    }

    async panToTile(tile) {
        let scale = game.scenes.viewed._viewPosition;
        let tileObject = tile.object;

        game.canvas.animatePan({ x: tileObject.center.x, y: tile.object.center.y, scale: scale });
    }

    async removeCharacter(character) {
        let currentScene = game.scenes.viewed;
        let sceneDisplayData = await currentScene.getFlag("hud-and-trackers", "sceneDisplayData");
        let characters = sceneDisplayData.characters;
        characters = characters.filter((ch) => ch.name !== character.name);
        sceneDisplayData = { ...sceneDisplayData, characters: [...characters] };
        await currentScene.setFlag("hud-and-trackers", "sceneDisplayData", sceneDisplayData);
        this.render(true);
    }

    async updateSceneDisplayData(newData, type) {
        let currentScene = game.scenes.viewed;
        let sceneDisplayData = await currentScene.getFlag("hud-and-trackers", "sceneDisplayData");
        if (type === "character") {
            let characters = sceneDisplayData.characters;
            //make sure we don't already hve a character with this name before pushing
            if (!characters.some((cha) => cha.name === newData.name)) {
                characters.push(newData);
                sceneDisplayData = { ...sceneDisplayData, characters: [...characters] };
            }
        } else if (type === "innerScene") {
            let innerScenesArray = sceneDisplayData.innerScenes;
            let foundSceneData = innerScenesArray.find((sceneData) => sceneData.id === newData.id);
            //see if the id already exists
            if (!foundSceneData) {
                innerScenesArray.push(newData);
            } else {
                let index = innerScenesArray.indexOf(foundSceneData);
                let updatedData = { ...foundSceneData, ...newData };
                innerScenesArray.splice(index, 1, updatedData);
            }
            sceneDisplayData = { ...sceneDisplayData, innerScenes: [...innerScenesArray] };
        } else if (type === "mode") {
            sceneDisplayData = { ...sceneDisplayData, mode: newData };
        }
        await currentScene.setFlag("hud-and-trackers", "sceneDisplayData", sceneDisplayData);
        this.render(true);
    }

    setStyles(mode) {
        switch (mode) {
            case "display":
                this.element.addClass("transparent");
                break;
            case "edit":
                this.element.removeClass("transparent");
                break;
            default:
                break;
        }
    }

    async getData() {
        // Send data to the template
        let currentScene = game.scenes.viewed;
        let displayTiles = await this.getSceneDisplayTiles(); //TODO: Update to fit API
        let sceneDisplayData = await currentScene.getFlag("hud-and-trackers", "sceneDisplayData");
        if (!sceneDisplayData) {
            this.getSceneDisplayData();
        }
        this.setStyles(sceneDisplayData.mode);
        let clans = game.characterTags
            .filter((tag) => tag.tagName !== "clans/")
            .map((obj) => {
                return {
                    name: obj.tagName.split("/").pop(),
                    value: obj.tagName,
                };
            });

        clans = clans.filter((clan) => clan.name !== " " || "");
        let options = [];

        //get any character tags that fit the tag name
        if (this.data.clanSelect) {
            options = game.characterTags.find((el) => el.tagName === this.data.clanSelect).characters;
        }
        // filter out any that are included in the selected characters already
        options = options.filter((opt) => {
            return !sceneDisplayData.characters.map((char) => char.name).includes(opt.name);
        });
        options.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));
        clans.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));

        sceneDisplayData = {
            ...sceneDisplayData,
            clans: clans,
            clanSelect: this.data.clanSelect || "none",
            options: options,
            displayTiles: displayTiles,
            isGM: game.user.isGM,
            basePath: basePath,
        };

        return sceneDisplayData;
    }
    _handleHover(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    async _handleButtonClick(event) {
        event.stopPropagation();
        event.preventDefault();
        let clickedElement = $(event.currentTarget); //$(event.target.closest("li"));

        let action = clickedElement.data().action;
        let name = clickedElement.data().name;
        let imagePath = clickedElement.data().imagePath;
        let value = event.currentTarget.value;
        let data = { name: name, imagePath: imagePath };

        switch (action) {
            case "select":
                this.updateSceneDisplayData(data, "character", false);
                break;
            case "toggleMode":
                this.updateSceneDisplayData(value, "mode", false);
                break;
            case "toggle-fold":
                let targetId = clickedElement.data().target;

                let targetElement = document.querySelector(`#${targetId}`);
                targetElement = $(targetElement);
                if (targetElement.hasClass("minimize")) {
                    //show the target element and style button as active
                    targetElement.removeClass("minimize");
                    clickedElement.addClass("open");
                    $(clickedElement[0].querySelector("img")).addClass("open");
                    clickedElement[0].setAttribute("title", "Minimize controls");
                } else {
                    //hide the target element and style button as inactive
                    targetElement.addClass("minimize");
                    clickedElement.removeClass("open");
                    $(clickedElement[0].querySelector("img")).removeClass("open");
                    clickedElement[0].setAttribute("title", "Show controls");
                }
                event.stopPropagation();
                event.preventDefault();
                break;
            // clickedElement.toggleClass("holdOpen");
            case "remove":
                this.removeCharacter(data);
                break;
            case "browse":
                // let img = clickedElement[0].src;
                let parentLi = clickedElement[0].closest("li");

                let name = parentLi.querySelector("input[type='text']").value || parentLi.dataset.name;
                let id = parentLi.dataset.id;
                console.log(parentLi, parentLi.dataset, id);

                let filepicker = new FilePicker({
                    type: "image",
                    callback: async (path) => {
                        data.imagePath = path;
                        if (!id) {
                            //if this is a tile that hasn't been created yet
                            data.name = name;
                            data.id = foundry.utils.randomID();
                        }
                        await this.updateSceneDisplayData(data, "innerScene");
                        // this.addInnerScene({ name: name, imagePath: path });
                    },
                }).render(true);
                break;
            case "pan":
                let imagePath = event.currentTarget.dataset.img;
                let tile = game.scenes.viewed.tiles.contents.find((tile) => {
                    return tile.data.img.toLowerCase().includes(imagePath.toLowerCase());
                });
                if (tile) {
                    this.panToTile(tile);
                }
                break;
            case "switch":
                let targetTileId = clickedElement.data().target;
                if (event.ctrlKey) {
                    let api = game.modules.get("journal-to-canvas-slideshow")?.api;
                    api.selectTile(targetTileId);
                    break;
                }
                let boundingTileID = clickedElement.data().frame;
                let imageElement = event.currentTarget.closest(".character, .innerScene").querySelector("img");
                if (game.JTCS) {
                    await game.JTCS.displayImageInScene(imageElement, targetTileId, boundingTileID);
                }
                // displayImageInScene(imageElement, targetTileId, boundingTileID);
                break;
        }
    }

    activateListeners(html) {
        delete ui.windows[this.appId];
        // super.activateListeners(html);
        let windowContent = html.closest(".window-content");
        windowContent.off("click").on("click", "[data-action]", this._handleButtonClick.bind(this));
        this.handleChange();
        this.handleHover();
    }

    async handleHover() {
        let api = game.modules.get("journal-to-canvas-slideshow")?.api;

        $(".hover-controls button").on("mouseenter mouseleave", async (event) => {
            let isLeave = event.type === "mouseleave" || event.type === "mouseout";
            let button = $(event.currentTarget);
            let tileID = button.data().target;
            let frameID = button.data().frame;
            let tile = await api?.getTileByID(tileID);
            let frame = await api?.getTileByID(frameID);
            if (!isLeave) {
                api?.showTileIndicator(tile);
                if (frame) api?.showTileIndicator(frame, 0.5);
            } else {
                api?.hideTileIndicator(tile);
                if (frame) api?.hideTileIndicator(frame);
            }
        });
    }

    handleChange() {
        $("select, input[type='checkbox'], input[type='radio'], input[type='text']").on(
            "change",
            async function (event) {
                let { value, name, checked, type } = event.currentTarget;

                let ourType = event.currentTarget.dataset.type;
                let ourId = event.currentTarget.dataset.id;
                game.innerSceneDisplayConfig.data[name] = type == "checkbox" ? checked : value;

                let data = {
                    id: ourId,
                    name: value,
                };
                if (type === "text") {
                    await game.innerSceneDisplayConfig.updateSceneDisplayData(data, ourType);
                } else {
                    game.innerSceneDisplayConfig.render(true, { renderData: game.innerSceneDisplayConfig.data });
                }

                //update the flags

                //re-render
            }
        );
    }

    async _updateObject(event, formData) {}
}
//TODO: Refactor this to actually access this method from the JTCS module
async function displayImageInScene(imageElement, selectedTileID, boundingTileID) {
    let url = imageElement.getAttribute("src");

    let displayTile = game.scenes.viewed.tiles.get(selectedTileID);

    //get the tile data from the selected tile id;

    let boundingTile = game.scenes.viewed.tiles.get(boundingTileID);

    await updateTileInScene(displayTile, boundingTile, game.scenes.viewed, url);
}

async function updateTileInScene(displayTile, boundingTile, ourScene, url) {
    //load the texture from the source
    const tex = await loadTexture(url);
    var imageUpdate;

    if (!boundingTile) {
        imageUpdate = await scaleToScene(displayTile, tex, url);
    } else {
        imageUpdate = await scaleToBoundingTile(displayTile, boundingTile, tex, url);
    }

    const updated = await ourScene.updateEmbeddedDocuments("Tile", [imageUpdate]);
}

async function scaleToScene(displayTile, tex, url) {
    let displayScene = game.scenes.viewed;
    var dimensionObject = calculateAspectRatioFit(
        tex.width,
        tex.height,
        displayScene.data.width,
        displayScene.data.height
    );
    //scale down factor is how big the tile will be in the scene
    //make this scale down factor configurable at some point
    var scaleDownFactor = 200;
    dimensionObject.width -= scaleDownFactor;
    dimensionObject.height -= scaleDownFactor;
    //half of the scene's width or height is the center -- we're subtracting by half of the image's width or height to account for the offset because it's measuring from top/left instead of center

    //separate objects depending on the texture's dimensions --
    //create an 'update' object for if the image is wide (width is bigger than height)
    var wideImageUpdate = {
        _id: displayTile.id,
        width: dimensionObject.width,
        height: dimensionObject.height,
        img: url,
        x: scaleDownFactor / 2,
        y: displayScene.data.height / 2 - dimensionObject.height / 2,
    };
    //create an 'update' object for if the image is tall (height is bigger than width)
    var tallImageUpdate = {
        _id: displayTile.id,
        width: dimensionObject.width,
        height: dimensionObject.height,
        img: url, // tex.baseTexture.resource.url,
        y: scaleDownFactor / 2,
        x: displayScene.data.width / 2 - dimensionObject.width / 2,
    };
    //https://stackoverflow.com/questions/38675447/how-do-i-get-the-center-of-an-image-in-javascript
    //^used the above StackOverflow post to help me figure that out

    //Determine if the image or video is wide, tall, or same dimensions and update depending on that
    let testArray = [tallImageUpdate, wideImageUpdate];

    if (dimensionObject.height > dimensionObject.width) {
        //if the height is longer than the width, use the tall image object
        return tallImageUpdate;
        // return await displayScene.updateEmbeddedDocuments("Tile", [tallImageUpdate]);
    } else if (dimensionObject.width > dimensionObject.height) {
        //if the width is longer than the height, use the wide image object
        return wideImageUpdate;
        // return await displayScene.updateEmbeddedDocuments("Tile", [wideImageUpdate]);
    }

    //if the image length and width are pretty much the same, just default to the wide image update object
    return wideImageUpdate;
    // return await displayScene.updateEmbeddedDocuments("Tile", [wideImageUpdate]);
}

async function scaleToBoundingTile(displayTile, boundingTile, tex, url) {
    var dimensionObject = calculateAspectRatioFit(
        tex.width,
        tex.height,
        boundingTile.data.width,
        boundingTile.data.height
    );

    var imageUpdate = {
        _id: displayTile.id,
        width: dimensionObject.width,
        height: dimensionObject.height,
        img: url,
        y: boundingTile.data.y,
        x: boundingTile.data.x,
    };
    //Ensure image is centered to bounding tile (stops images hugging the top left corner of the bounding box).
    var boundingMiddle = {
        x: boundingTile.data.x + boundingTile.data.width / 2,
        y: boundingTile.data.y + boundingTile.data.height / 2,
    };

    var imageMiddle = {
        x: imageUpdate.x + imageUpdate.width / 2,
        y: imageUpdate.y + imageUpdate.height / 2,
    };

    imageUpdate.x += boundingMiddle.x - imageMiddle.x;
    imageUpdate.y += boundingMiddle.y - imageMiddle.y;
    // var updateArray = [];
    // updateArray.push(imageUpdate);
    return imageUpdate;
}
// V Used snippet from the below stackOverflow answer to help me with proportionally resizing the images
/*https://stackoverflow.com/questions/3971841/how-to-resize-images-proportionally-keeping-the-aspect-ratio*/
function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
    var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    return {
        width: srcWidth * ratio,
        height: srcHeight * ratio,
    };
}
