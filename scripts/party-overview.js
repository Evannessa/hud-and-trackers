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
        if (data.data?.pools || data.data?.damage) {
            //only update if pools or damage track have changed
            if (
                game.user.isGM &&
                game.partyOverview.rendered &&
                game.partyOverview.dataFilter == "stats"
            ) {
                game.partyOverview.render();
            }
        }
    }
});
Hooks.on("createItem", (item, data, id) => {
    if (item.parent.type == "PC") {
        if (
            game.user.isGM &&
            game.partyOverview.rendered &&
            game.partyOverview.dataFilter == "skills"
        ) {
            game.partyOverview.render();
        }
    }
});
Handlebars.registerPartial("po-items-partial", "{{prefix}}");

Handlebars.registerHelper("lowPool", (value) => {
    if (value < 10) {
        return new Handlebars.SafeString("current low");
    } else {
        return new Handlebars.SafeString("current");
    }
});

Handlebars.registerHelper("filterByType", (items, type) => {
    return items.filter((item) => {
        return item.type === type;
    });
});

export class PartyOverview extends FormApplication {
    constructor() {
        super();
        this.pcs = this.filterByFolder(this.getPCs(), "Main PCs");
        this.sceneFilter = "none";
        this.dataFilter = "stats";
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form"],
            popOut: true,
            minimizable: true,
            resizable: true,
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
        sceneActors = [...new Set(sceneActors)];
        return this.filterByFolder(sceneActors, "Main PCs");
    }

    getData() {
        // Send data to the template
        return {
            pcs: this.pcs,
            sceneFilter: this.sceneFilter,
            dataFilter: this.dataFilter,
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        this.filter();
        //every table row with expanded class, make it visible
        $("#party-overview tr.expanded").css("overflow", "visible");

        //every radio button whose value is equal to our sceneFilter, or dataFilter, check it
        $(`input[type=radio][value=${this.sceneFilter}]`).prop("checked", true);
        $(`input[type=radio][value=${this.dataFilter}]`).prop("checked", true);

        let app = this;
        $("input[type=radio][name='sceneFilter']").change(function () {
            app.pcs = app.filterByScene(app.pcs, this.value);
            app.sceneFilter = this.value;
            app.render();
        });
        $("input[type=radio][name='dataFilter']").change(function () {
            app.dataFilter = this.value;
            app.render();
        });
        $("#party-overview tr").click((event) => {
            let row = event.currentTarget;
            row.classList.toggle("expanded");

            //when row expanded, make the overflow visible and the height larger to accommodate
            $("#party-overview tr.expanded *").css({
                overflow: "visible",
                "max-height": "max-content",
            });

            //when row NOT expanded, make the overflow hidden and the height of inner div smaller
            $("#party-overview tr:not(.expanded) td:not(.name) > div").css({
                overflow: "hidden",
                "max-height": "1rem",
            });

            //when not expanded, change the icon to chevron right
            $("#party-overview tr:not(.expanded) td.name i")
                .addClass("fa-chevron-circle-right")
                .removeClass("fa-chevron-circle-down");

            //when not expanded, change the icon to chevron down
            $("#party-overview tr.expanded td.name i")
                .addClass("fa-chevron-circle-down")
                .removeClass("fa-chevron-circle-right");

            // app.render();
        });
        $("#party-overview li").click((event) => {
            event.stopPropagation();

            //get the id of the item, from the list item, and the actor, from the parent table row
            let itemId = event.currentTarget.id;
            let actorId = event.currentTarget.closest("tr").id;

            //find the actor, them find the item on the actor
            let actor = game.actors.get(actorId);
            let item = actor.items.find((item) => item.id === itemId);

            //render the item sheet
            item.sheet.render(true);
        });
        $("#party-overview td.name").click((event) => {
            let actorId = event.currentTarget.id;
            let actor = game.actors.get(actorId);
            actor.sheet.render(true);
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
