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
