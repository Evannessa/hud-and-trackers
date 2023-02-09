import {
    generateTemplates,
    createTemplatePathString,
    mapTemplates,
} from "./helpers/templates.js";

Hooks.on("init", async () => {
    console.log("Initializing Hud-and-Trackers");


    //map of template names w/ short keys
    let templates = generateTemplates();
    let mappedTemplates = mapTemplates(templates);

    // once settings are set up, create our API object
    game.modules.get("hud-and-trackers").api = {
        templates: mappedTemplates,
    };

    //load templates
    loadTemplates(templates);
    // now that we've created our API, inform other modules we are ready
    // provide a reference to the module api as the hook arguments for good measure
    // Hooks.callAll(
    //     "journalToCanvasSlideshowReady",
    //     game.modules.get("journal-to-canvas-slideshow").api
    // );
});
Hooks.once('ready', async function () {
    // Enable binding
    new DragDrop({
        callbacks: {
            drop: handleDrop
        }
    })
        .bind(document.getElementById("board"));
});

/**
* handles the drop, returning if invalid is dropped
 * @author - https://github.com/cswendrowski/FoundryVTT-Drag-Upload/blob/master/dragupload.js
 * @param {*} event
 */
async function handleDrop(event) {
    event.preventDefault();
    console.log(event);

    const files = event.dataTransfer.files;
    console.log(files);

    let file
    if (!files || files.length === 0) {
        let url = event.dataTransfer.getData("Text")
        if (!url) {
            console.log("DragUpload | No Files detected, exiting");
            // Let Foundry handle the event instead
            canvas._onDrop(event);
            return;
        }
        // trimming query string
        if (url.includes("?")) url = url.substr(0, url.indexOf("?"))
        const splitUrl = url.split("/")
        let filename = splitUrl[splitUrl.length - 1]
        if (!filename.includes(".")) {
            console.log("DragUpload | Dragged non-file text:", url);
            // Let Foundry handle the event instead
            canvas._onDrop(event);
            return
        }
        const extension = filename.substr(filename.lastIndexOf(".") + 1)
        const validExtensions =
            Object.keys(CONST.IMAGE_FILE_EXTENSIONS)
                .concat(Object.keys(CONST.VIDEO_FILE_EXTENSIONS))
                .concat(Object.keys(CONST.AUDIO_FILE_EXTENSIONS));
        if (!validExtensions.includes(extension)) {
            console.log("DragUpload | Dragged file with bad extension:", url);
            // Let Foundry handle the event instead
            canvas._onDrop(event);
            return
        }
        // special case: chrome imgur drag from an album gives a low-res webp file instead of a PNG
        if (url.includes("imgur") && filename.endsWith("_d.webp")) {
            filename = filename.substr(0, filename.length - "_d.webp".length) + ".png"
            url = url.substr(0, url.length - "_d.webp".length) + ".png"
        }
        // must be a valid file URL!
        file = { isExternalUrl: true, url: url, name: filename }
    } else {
        file = files[0]
    }

    if (file == undefined) {
        // Let Foundry handle the event instead
        canvas._onDrop(event);
        return;
    }
    console.log(file);
    await updateTile(file)

}

/**
 * update the default tile in the scene to be this image
 */
async function updateTile(file) {

    const folder = game.settings.get("hud-and-trackers", "characterImagePath")
    let response;
    if (file.isExternalUrl) {
        response = { path: file.url }
    } else {
        response = await FilePicker.upload("data", folder, file, {});
    }
    let img = response.path
    const tileID = await game.JTCS.tileUtils.manager.getDefaultArtTileID()
    const frameID = await game.JTCS.tileUtils.manager.getGalleryTileDataFromID(tileID, "linkedBoundingTile")
    await game.JTCS.imageUtils.updateTileObjectTexture(tileID, frameID, img, "anyScene")


}
