let keywords;
fetch("/modules/hud-and-trackers/data/icon-glossery-data.json")
    .then((response) => {
        return response.json();
    })
    .then((data) => (keywords = data));

let journalName = "ICON TEST";
Hooks.on("canvasReady", () => {
    game.journal.getName(journalName).sheet.render(true);
});
//maybe add tooltip entity link if there is one
Hooks.on("renderJournalSheet", (ourObject, html, data) => {
    //go through all of our keywords, and highlight them, and give
    //event listeners to show tooltips on hover

    //add a button to journal header
    var btnString = "<button class='addTooltips'>Click Me</button>";
    var $btnElement = $(btnString);
    $(html[0])
        .find(".window-header")
        .children("a:first-of-type")
        .first()
        .before($btnElement);
    $btnElement.on("click", (event) => {
        renderJournalTooltipDialogue();
    });
    for (let keyword of keywords) {
        highlightKeywords(html, keyword);
    }
});

async function highlightKeywords(html, keyword) {
    //TODO: Find keywords, highlight them
    let searchTerm = keyword.Term.trim();
    let definition = keyword.Definition.trim();
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

    $(html[0]).on("mouseover", `.showTooltip.${className}`, (event) => {
        renderTooltip(
            searchTerm,
            definition,
            $(event.currentTarget).closest(".window-app")
        );
    });

    $(html[0]).on("mouseleave", `.showTooltip.${className}`, (event) => {
        console.log(event);
        console.log(event.key, event.code);
        if (event.ctrlKey) {
            console.log("Interacting with card");
        } else {
            hideTooltip($(event.currentTarget).closest(".window-app"));
        }
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

function parseKeywordList(stringData) {
    let keywordArray = stringData.toString().split(",");
    console.log(keywordArray);
    //TODO: turn into object, separating the data somehow
}

function renderJournalTooltipDialogue() {
    let dialog = new Dialog({
        title: "Convert Dialogue",
        content: `
	<form><input type="text" name="keyword-list" /><form/>`,
        buttons: {
            add: {
                label: "Add Tooltips",
                callback: (html) => {
                    let keywordList = html.find("[name='keyword-list']").val();
                    parseKeywordList(keywordList);
                },
            },
            cancel: {
                label: "Cancel",
            },
        },
    }).render(true);
}
