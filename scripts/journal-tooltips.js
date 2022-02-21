let keywords;
fetch("/modules/hud-and-trackers/data/icon-glossery-data.json")
    .then((response) => {
        return response.json();
    })
    .then((data) => (keywords = data));
// .then((data) => console.log(data));
// const data = require("/modules/hud-and-trackers/data/icon-glossery-data.json");
// const keywords = data;
let journalName = "ICON TEST";
Hooks.on("canvasReady", () => {
    game.journal.getName(journalName).sheet.render(true);
});
//maybe add tooltip entity link if there is one
Hooks.on("renderJournalSheet", (ourObject, html, data) => {
    //go through all of our keywords, and highlight them, and give
    //event listeners to show tooltips on hover
    for (let keyword of keywords) {
        highlightKeywords(html, keyword);
    }
});

async function highlightKeywords(html, keyword) {
    //TODO: Find keywords, highlight them
    let searchTerm = keyword.Term.trim();
    let definition = keyword.Definition.trim();
    // console.log("Current search Term", searchTerm, "Definition", definition);
    let pattern = `(${searchTerm})`;
    let regexTerm = new RegExp(pattern);

    //find all the paragraphs in the children, filter them for ones whose text content
    //includes the keyword, then use html.replace() with regex to turn them into anchor tags
    //w/ show-tooltip class
    let paragraphs = [...html[0].querySelectorAll("p")].filter((p) =>
        p.textContent.includes(searchTerm)
    );

    let className = searchTerm.replaceAll(/[^\w\s]/gi, "").replace(/ /g, "");
    paragraphs.forEach((p) =>
        $(p).html((i, html) => {
            return html.replace(
                regexTerm,
                `<a href="#" class="showTooltip ${className}">${searchTerm}</a>`
            );
        })
    );
    paragraphs.forEach((p) => $(p).addClass("journalTooltipParagraph"));
    //select them all
    html[0].querySelectorAll(`.showTooltip.${className}`).forEach((element) => {
        console.log("This element will render a tooltip", element);
    });
    $(html[0]).on("mouseover", `.showTooltip.${className}`, (event) => {
        renderTooltip(
            searchTerm,
            definition,
            $(event.currentTarget).closest(".window-app")
        );
    });

    $(html[0]).on("mouseleave", `.showTooltip.${className}`, (event) => {
        hideTooltip($(event.currentTarget).closest(".window-app"));
    });
    // setTimeout(() => {
    //     html[0].querySelectorAll(`.showTooltip.${className}`).forEach((element) => {
    //         return $(element)
    //             .mouseover((event) => {
    //                 renderTooltip(
    //                     searchTerm,
    //                     definition,
    //                     // event.currentTarget
    //                     $(event.currentTarget).closest(".window-app")
    //                 );
    //             })
    //             .mouseleave((event) => {
    //                 hideTooltip(
    //                     // event.currentTarget);
    //                     $(event.currentTarget).closest(".window-app")
    //                 );
    //             });
    //     });
    // }, 1000);
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
    console.log("Rendering", data);
    const tooltipHtml = await renderTemplate(template, { data: data });
    $(keywordElement).append(tooltipHtml);
}

// let dialog = new Dialog({
// 	"title": "Convert Dialogue",
// 	content: `
// 	<input type="text" name="keyword-list" />`

// }

// ).render(true)
