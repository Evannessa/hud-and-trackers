let journalName = "Alresch";
Hooks.on("canvasReady", () => {
    game.journal.getName(journalName).sheet.render(true);
});
const keywords = [
    {
        Alresch: "Hail my name is Alresch, King of the Deep",
    },
    {
        priest: "There's stuff about priests here",
    },
    {
        Damage: `Damage in ICON depends on your job. Every class has a damage die (d6, d8, etc) which is often written as [D], and a fray damage value (a fixed amount).`,
    },
];
Hooks.on("renderJournalSheet", (ourObject, html, data) => {
    for (let keyword of keywords) {
        highlightKeywords(html, keyword);
    }
});

async function highlightKeywords(html, keyword) {
    //TODO: Find keywords, highlight them
    let searchTerm = Object.keys(keyword)[0];
    console.log("Current search Term", searchTerm, "Keyword", keyword);
    let pattern = `(${searchTerm})`;
    let regexTerm = new RegExp(pattern);

    //find all the paragraphs in the children, filter them for ones whose text content
    //includes the keyword, then use html.replace() with regex to turn them into anchor tags
    //w/ show-tooltip class
    let paragraphs = [...html[0].querySelectorAll("p")].filter((p) =>
        p.textContent.includes(searchTerm)
    );
    paragraphs.forEach((p) =>
        $(p).html((i, html) => {
            return html.replace(
                regexTerm,
                `<a href="#" class="showTooltip ${searchTerm}">${searchTerm}</a>`
            );
        })
    );
    paragraphs.forEach((p) => $(p).addClass("journalTooltipParagraph"));
    //select them all
    html[0].querySelectorAll(`.showTooltip.${searchTerm}`).forEach((element) => {
        return $(element)
            .mouseover((event) => {
                renderTooltip(
                    searchTerm,
                    keyword[searchTerm],
                    // event.currentTarget
                    $(event.currentTarget).closest(".window-app")
                );
            })
            .mouseleave((event) => {
                hideTooltip(
                    // event.currentTarget);
                    $(event.currentTarget).closest(".window-app")
                );
            });
    });
}

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
    $(keywordElement).append(tooltipHtml);
}

// let dialog = new Dialog({
// 	"title": "Convert Dialogue",
// 	content: `
// 	<input type="text" name="keyword-list" />`

// }

// ).render(true)
