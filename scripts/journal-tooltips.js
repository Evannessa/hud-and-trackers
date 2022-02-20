let journalName = "Alresch";
Hooks.on("canvasReady", () => {
    game.journal.getName(journalName).sheet.render(true);
});
const keywords = [
    {
        Alresch: "Hail my name is Alresch, King of the Deep",
    },
    {
        Damage: `Damage in ICON depends on your job. Every class has a damage die (d6, d8, etc) which is often written as [D], and a fray damage value (a fixed amount).`,
    },
];
Hooks.on("renderJournalSheet", (ourObject, html, data) => {
    //TODO: Find keywords, highlight them
    let searchTerm = Object.keys(keywords[0]);
    let pattern = `(${searchTerm})`;
    let regexTerm = new RegExp(pattern);
    let array = [...html];
    [...html[0].querySelectorAll("p")]
        .filter((p) => p.textContent.includes(Object.keys(keywords[0])))
        .forEach((p) =>
            $(p).html((i, html) => {
                return html.replace(
                    regexTerm,
                    `<a href="#" class="showTooltip">${searchTerm}</a>`
                );
            })
        );
    html[0].querySelectorAll(".showTooltip").forEach((element) => {
        return $(element)
            .mouseover((event) => {
                renderTooltip(
                    searchTerm,
                    keywords[0][searchTerm],
                    $(event.currentTarget).closest(".window-app")
                );
            })
            .mouseleave((event) => {
                hideTooltip($(event.currentTarget).closest(".window-app"));
            });
    });

    const title = keywords[0];
});
async function hideTooltip(keywordElement) {
    $(keywordElement).children(".journal-tooltip").remove();
}
async function renderTooltip(title, description, keywordElement) {
    const template = "/modules/hud-and-trackers/templates/tooltip/tooltip.hbs";
    const data = {
        title: title,
        description: description,
    };
    const tooltipHtml = await renderTemplate(template, { data: data });
    // console.log($(keywordElement).closest(".journal-sheet"));
    $(keywordElement).append(tooltipHtml);
}

// let dialog = new Dialog({
// 	"title": "Convert Dialogue",
// 	content: `
// 	<input type="text" name="keyword-list" />`

// }

// ).render(true)
