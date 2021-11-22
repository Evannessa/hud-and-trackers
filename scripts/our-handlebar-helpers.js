export default function registerAllHandlebarHelpers() {
    Handlebars.registerHelper("convertToSentence", function (strInputCode) {
        let result = strInputCode.replace(/([A-Z])/g, " $1");
        let finalResult = result.charAt(0).toUpperCase() + result.slice(1);
        return finalResult;
    });
}
