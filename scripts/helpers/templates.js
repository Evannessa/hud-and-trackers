
const MODULE_ID = "hud-and-trackers"
const baseTemplatePath = `modules/${MODULE_ID}/templates/`;

const templateBaseNames = [
    `point-display.html`,

];
/**
 * @returns
 */
export function generateTemplates() {
    let templates = templateBaseNames.map((baseName) =>
        createTemplatePathString(baseName)
    );
    return templates;
}
export function createTemplatePathString(templateBaseName) {
    return `${baseTemplatePath}${templateBaseName}`;
}
export function mapTemplates(templates) {
    if (!templates) {
        templates = generateTemplates();
    }
    let mappedTemplates = {};

    templates.forEach((path) => {
        let baseName = path.split("/").pop().split(".").shift();
        mappedTemplates[baseName] = path;
    });

    return mappedTemplates;
}
