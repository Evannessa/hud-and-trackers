// info borrowed from https://github.com/pumbers/journal-templates/blob/master/src/main.js
Hooks.once("ready", async () => {
    let location = "/modules/hud-and-trackers/data/html-files/";
    await FilePicker.browse("user", location).then((res) => {
        console.log("Target is", res.target);
        if (res?.target !== location) {
            console.log(`No HTML files found at ${location}`);
            return [];
        }
        //go through each file in the response
        return res.files.map((file) => {
            //fetch them, then
            return fetch(file).then((response) => {
                //fetch them, then
                return response.text().then((fileContents) => {
                    //get the text content from our response
                    var parsed = new DOMParser().parseFromString(
                        fileContents,
                        "text/html"
                    );
                    let name =
                        parsed.getElementsByTagName("title")[0].innerHTML;
                    console.log(name);
                    let data = {
                        name: name,
                        content: fileContents,
                    };
                    createJournalEntry(data);
                });
            });
        });
    });
});

async function createJournalEntry(data) {
    let newJournal = await JournalEntry.createDocuments([data]);
}
