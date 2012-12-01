// Declare a custom control to delete features.
var DeleteFeature = OpenLayers.Class(OpenLayers.Control, {
    initialize: function(layer, options) {
        OpenLayers.Control.prototype.initialize.apply(this, [options]);
        this.layer = layer;
        this.handler = new OpenLayers.Handler.Feature(
            this, layer, {click: this.clickFeature}
        );
    },
    clickFeature: function(feature) {
        // if feature doesn't have a fid, destroy it
        if(feature.fid == undefined) {
            this.layer.destroyFeatures([feature]);
        } else {
            feature.state = OpenLayers.State.DELETE;
            this.layer.events.triggerEvent("afterfeaturemodified", 
                                           {feature: feature});
            feature.renderIntent = "select";
            this.layer.drawFeature(feature);
        }
    },
    CLASS_NAME: "OpenLayers.Control.DeleteFeature"
});

// Create the map
var map = new OpenLayers.Map({
    div: "map",
    maxResolution: 156543.0339,
    maxExtent: new OpenLayers.Bounds(-20037508, -20037508, 20037508, 20037508),
    restrictedExtent: new OpenLayers.Bounds(
        -11563906, 5540550, -11559015, 5542996
    ),
    projection: new OpenLayers.Projection("EPSG:900913"),
    units: "m",
    controls: [
        new OpenLayers.Control.PanZoom(),
        new OpenLayers.Control.Navigation()
    ]
});

// Crate a vector layer
var styles = new OpenLayers.StyleMap({
    "default": new OpenLayers.Style(null, {
        rules: [
            new OpenLayers.Rule({
                symbolizer: {
                    "Point": {
                        pointRadius: 5,
                        graphicName: "square",
                        fillColor: "white",
                        fillOpacity: 0.25,
                        strokeWidth: 1,
                        strokeColor: "#333333"
                    },
                    "Line": {
                        strokeWidth: 3,
                        strokeOpacity: 0.5, // to show the overlap
                        strokeColor: "#666666"
                    }
                }
            })
        ]
    }),
    "select": new OpenLayers.Style({
        strokeWidth: 3,
        strokeColor: "#00ccff"
    }),
    "temporary": new OpenLayers.Style(null, {
        rules: [
            new OpenLayers.Rule({
                symbolizer: {
                    "Point": {
                        pointRadius: 5,
                        graphicName: "square",
                        fillColor: "white",
                        fillOpacity: 0.25,
                        strokeWidth: 1,
                        strokeColor: "#333333"
                    },
                    "Line": {
                        strokeWidth: 2,
                        strokeColor: "#00ccff"
                    }
                }
            })
        ]
    })
});
var vectorLayer = new OpenLayers.Layer.Vector("Editable Features", {
    strategies: [new OpenLayers.Strategy.Fixed()],
    projection: new OpenLayers.Projection("EPSG:4326"),
    styleMap: styles,
    //Use HTTP instead of WFS, because WFS doesn't work on gh-pages
    protocol: new OpenLayers.Protocol.HTTP({
        srsName: "EPSG:4326",
        url: "data/demo_opengeo_org_geoserver_wfs.xml",
        format: OpenLayers.Format.WFST({
                version: "1.1.0",
                featureType: "roads",
                featureNS: "http://opengeo.org",
                geometryName: "the_geom",
                srsName: this.srsName,
                schema: "http://demo.opengeo.org/geoserver/wfs/DescribeFeatureType?version=1.1.0&typename=og:roads"
        })
    })
});

// Add layers to map
map.addLayers([new OpenLayers.Layer.OSM(), vectorLayer]);

// configure the snapping agent
var snap = new OpenLayers.Control.Snapping({layer: vectorLayer});
map.addControl(snap);
snap.activate();

// configure split agent
var split = new OpenLayers.Control.Split({
    layer: vectorLayer,
    source: vectorLayer,
    tolerance: 0.0001,
    deferDelete: true,
    eventListeners: {
        aftersplit: function(event) {
            var msg = "Split resulted in " + event.features.length + " features.";
            flashFeatures(event.features);
        }
    }
});
map.addControl(split);
split.activate();

// Ceate GhostNodes control
var gNodes = new OpenLayers.Control.GhostNodes({
    layer: vectorLayer,
    splitControl: split,
    // To add as a button on a panel:
    type: OpenLayers.Control.TYPE_TOGGLE,
    displayClass: "olControlGhostNodes olButtonText", 
    title: "Ghost Nodes on/off"
});
map.addControl(gNodes);

// Add some editing tools to a panel
var panel = new OpenLayers.Control.Panel({
    displayClass: 'olControlEditingToolbar',
    allowDepress: true
});
panel.addControls([
    new DeleteFeature(vectorLayer, {
        // To add as a button on a panel:
        title: "Delete Feature"
    }),
    new OpenLayers.Control.ModifyFeature(vectorLayer, {
        // To add as a button on a panel:
        title: "Modify Feature"
    }),
    new OpenLayers.Control.DrawFeature(vectorLayer, OpenLayers.Handler.Path, {
        handlerOptions: {multi: true},
        // To add as a button on a panel:
        title: "Draw Feature",
        displayClass: "olControlDrawFeaturePoint"
    }),
    gNodes
]);
map.addControl(panel);

// Set center
map.setCenter(new OpenLayers.LonLat(-11561460.5, 5541773), 15);

// Used by eventListeners of split agent
function flashFeatures(features, index) {
    if(!index) {
        index = 0;
    }
    var current = features[index];
    if(current && current.layer === vectorLayer) {
        vectorLayer.drawFeature(features[index], "select");
    }
    var prev = features[index-1];
    if(prev && prev.layer === vectorLayer) {
        vectorLayer.drawFeature(prev, "default");
    }
    ++index;
    if(index <= features.length) {
        window.setTimeout(function() {flashFeatures(features, index)}, 100);
    }
}
