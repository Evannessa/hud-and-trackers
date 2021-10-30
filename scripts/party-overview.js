/**
 * Define your class that extends FormApplication
 */
Hooks.on("ready", () => {
    if (game.user.isGM) {
        game.partyOverview = new PartyOverview().render(true);
    }
});
Hooks.on("sceneInit", () => {
    if (game.user.isGM && game.partyOverview.rendered) {
        game.partyOverview.render();
    }
});
Hooks.on("updateActor", (actor, data, diff, actorId) => {
    if (actor.data.type == "PC") {
        //re-render the party overview if the stats change
        //maybe specify to only re-render if
        if (data.data.pools || data.data.damage) {
            //only update if pools or damage track have changed
            if (game.user.isGM && game.partyOverview.rendered) {
                game.partyOverview.render();
            }
        }
    }
});

Handlebars.registerHelper("lowPool", (value) => {
    if (value < 10) {
        return new Handlebars.SafeString("current low");
    } else {
        return new Handlebars.SafeString("current");
    }
});

export class PartyOverview extends FormApplication {
    constructor() {
        super();
        this.pcs = this.filterByFolder(this.getPCs(), "Main PCs");
        this.sceneFilter = "none";
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form"],
            popOut: true,
            minimizable: true,
            template: `modules/hud-and-trackers/templates/party-overview/party-overview.hbs`,
            id: "party-overview",
            title: "Party Overview",
        });
    }
    filter() {
        $("#search").on("keyup", function () {
            var value = $(this).val().toLowerCase();
            $("#partyTable tr.cellRow").filter(function () {
                $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
            });
        });
    }
    filterByScene(pcArray, activeOrViewed) {
        let sceneActors;
        if (activeOrViewed == "active") {
            sceneActors = game.scenes.active.tokens.map((token) => token.actor);
        } else if (activeOrViewed == "viewed") {
            sceneActors = game.scenes.viewed.tokens.map((token) => token.actor);
        } else {
            sceneActors = this.getPCs();
        }
        console.log(activeOrViewed, sceneActors);
        sceneActors = [...new Set(sceneActors)];
        return this.filterByFolder(sceneActors, "Main PCs");
        pcArray.filter((actor) => {
            return sceneActors.includes(actor);
        });
    }

    getData() {
        // Send data to the template
        return {
            pcs: this.pcs,
            sceneFilter: this.sceneFilter,
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        this.filter();
        $(`input[type=radio][value=${this.sceneFilter}]`).prop("checked", true);
        let app = this;
        $("input[type=radio]").change(function () {
            app.pcs = app.filterByScene(app.pcs, this.value);
            app.sceneFilter = this.value;
            console.log(this.value);
            app.render();
        });
    }

    async _updateObject(event, formData) {}
    getPCs() {
        return Array.from(game.actors).filter((actor) => {
            return actor.data.type == "PC";
        });
    }
    filterByFolder(pcArray, folderName) {
        return pcArray.filter((actor) => {
            return game.folders.getName(folderName).content.includes(actor);
        });
    }
}

window.PartyOverview = PartyOverview;
