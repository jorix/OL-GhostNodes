panel.addControls([
    new OpenLayers.Control.Button({
        // To add as a button on a panel:
        trigger: function() {
            // Internal functions
            var addKey = function (collection, key) {
                var sum = collection[key];
                collection[key] = sum ? ++sum : 1;
            };
            var logCollection = function (title, collection) {
                console.log(title + ":");
                var keys = [];
                for (var key in collection) {
                    keys.push(key);
                }
                keys.sort();
                for (var i = 0, len = keys.length; i < len; i++) {
                    console.log("  " + keys[i] + ": " + collection[keys[i]]);
                }
            };
            // Summarize
            var features = vectorLayer.features,
                sumStates = {},
                sumTypes = {},
                sumAttributes1 = {},
                sumAttributes2 = {},
                key;
            for (var i = 0, len = features.length; i < len; i++) {
                var item = features[i];
                // state
                addKey(sumStates, item.state + " fid:" + !!item.fid);
                // geometry type & state
                var geometry = item.geometry;
                key = geometry.CLASS_NAME.split(".")[2]
                if (geometry.getLength() === 0) {
                    key += " len=0";
                }
                addKey(sumTypes, key + ' "' + item.state + '"');
                addKey(sumAttributes1, item.attributes.label + ' "' + item.state + '"');
                addKey(sumAttributes2, item.attributes.cat + ' "' + item.state + '"');
            }
            // Show summary
            logCollection("States & has fid", sumStates);
            logCollection("Types & States", sumTypes);
            logCollection("Attribute label & States", sumAttributes1);
            logCollection("Attribute cat & States", sumAttributes2);
            console.log("Total: " + features.length + " =================\n");
        },        
        draw: function() {}, // nothing to draw.
        displayClass: "olControlSummary olButtonText", 
        title: "Log features summary, see on F12"
    })
]);
