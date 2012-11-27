/* Copyright 2012 Xavier Mamano, http://github.com/jorix/OL-GhostNodes
 * Published under MIT license. All rights reserved. */

/**
 * @requires OpenLayers/Control.js
 */

/**
 * Class: OpenLayers.Control.GhostNodes
 *
 * Inherits from:
 *  - <OpenLayers.Control>
 */
OpenLayers.Control.GhostNodes = OpenLayers.Class(OpenLayers.Control, {

    /**
     * APIProperty: renderIntent
     * {String} key used to retrieve the modified style from the layer's
     * style map. Default is "select".
     */
    renderIntent: "select",

    /**
     * Property: layer
     * {<OpenLayers.Layer.Vector>} The target layer with features to be managed.
     */
    layer: null,

    indexFeatures: null,
    indexNodes: null,
    indexModified: null,
    ghostly: false,
    currentFeature: null,
    splitControl: null, 
    
    addSplit: function(control) { // TODO: initialize
        if (this.layer === control.source) {
            this.splitControl = control;
        }
    },
    
    /**
     * Property: layerListeners
     * {Object} The layerListeners is a internal object registered with
     *     <OpenLayers.Events.on> on the layar. The object structure is a
     *     listeners object as shown in the example for the events.on method.
     */
    layerListeners: null,
    
    /**
     * Method: destroy
     * Clean up the control.
     */
    /**
     * Method: destroy
     * Clean up the control.
     */
    destroy: function() {
        this.deactivate();
        OpenLayers.Control.prototype.destroy.call(this);
    },
    
    /**
     * APIMethod: activate
     * Activate the control.
     */
    activate: function() {
        var activated = OpenLayers.Control.prototype.activate.call(this);
        if (activated) {
            this.indexFeatures = {};
            this.indexNodes = {};
            this.indexModified = {};
            
            if (this.layer && this.layer.map) {
                this.addToIndex(this.layer.features);
                
                if (this.splitControl) {
                    this.splitControl.events.on({ // TODO: `un` on deactivate
                        "aftersplit": this.onAftersplit,
                        scope: this
                    });
                }
                
                this.layerListeners = {
                    "featuresadded": function(evt) {this.addToIndex(evt.features);},
                    "featuresremoved": function(evt) {this.removeFromIndex(evt.features);},
                    "featuremodified": this.onFeatureModified,
                    // "beforefeaturemodified" TODO: listen and trigger with cancel??
                    // "afterfeaturemodified" TODO: listen and trigger??
                    "vertexmodified": this.onVertexModified,
                    //"vertexremoved", TODO: listen and trigger??
                    scope: this
                }
                this.layer.events.on(this.layerListeners);
            }
        }
        return activated;
    },
        
    /**
     * APIMethod: activate
     * Activate the control.
     */
    onAftersplit: function(evt) {
        this.addToIndex(evt.features);
        var source = [evt.source];
        this.removeFromIndex(source);
        this.addToIndex(source);
    },
    /**
     * APIMethod: deactivate
     * Deactivate the control.
     */
    deactivate: function() {
        var deactivated = OpenLayers.Control.prototype.deactivate.call(this);
        if (deactivated) {
           this.layer.events.un(this.layerListeners);
        }
        return deactivated;
    },
    onFeatureModified: function(evt) {
        if (this.ghostly) { return; } // Ignoring event fired by itself.

        console.log("onFeatureModified: " + evt.feature.id);
        this.completeModification();
        var feature = evt.feature;
        if (this.removeFromIndex([feature])) {
            this.addToIndex([feature]);
        }
    },
    onVertexModified: function(evt) {
        // TODO: `this.ghostly` to be used if self trigger a "vertexmodified" event
        if (this.ghostly) { return; } // Ignoring event fired by itself.

        var feature = evt.feature,
            line = this.getLineString(evt.feature);
        if (line) {
            var nodes = null,
                vertex = evt.vertex,
                components = line.components;
            if (components[0] === vertex) {
                nodes = this.findNodeFeatures(feature, 0);
            } else {
                var last = components.length-1;
                if (components[last] === vertex) {
                    nodes = this.findNodeFeatures(feature, 1);
                }
            }
            if (nodes) {
                var currentFeature = this.currentFeature;
                if (currentFeature && currentFeature !== feature) {
                console.log("**** setCurrentFeature: " + feature.id);
                    this.completeModification();
                }
                this.currentFeature = feature;
                for (var vertexType = 0; vertexType <= 1; vertexType++) {
                    var features = nodes[vertexType];
                    for (var i = 0, len = features.length; i < len; i++) {
                        var item = features[i];
                        if (item !== feature) {
                            this.modifyVertex(vertex, vertexType, item);
                        }
                    }
                }
            }
        }
    },


    /**
     * Method: modifyVertex
     */
    modifyVertex: function(newVertex, vertexType, feature) {
        var line = this.getLineString(feature);
        if (line) {
            if (!this.indexModified[feature.id]) { 
                this.indexModified[feature.id] = feature.geometry.clone();
            }
            var comp;
            if (vertexType === 0) {
                comp = line.components[0];
            } else {
                comp = line.components[line.components.length -1];
            }
            comp.x = newVertex.x;
            comp.y = newVertex.y;
            this.layer.drawFeature(feature, this.renderIntent);
            console.log("vertex" +feature.id);
        }
    },
    
    /**
     * Method: completeModification
     * Called when the features are modified.  If the current state is not
     *     INSERT or DELETE, the state is set to UPDATE.
     */
    completeModification: function() {
        this.ghostly = true;
console.log("completeModification: start");
        var layer = this.layer,
            indexModified = this.indexModified,
            indexFeatures = this.indexFeatures;
        for (var featureId in indexModified) {
            console.log("featureId = " +featureId);
            var feature = indexFeatures[featureId].feature;
            if (!feature.modified) {
                feature.modified = indexModified[featureId];
            }
            if (feature.state !== OpenLayers.State.INSERT &&
                                feature.state !== OpenLayers.State.DELETE) {
                feature.state = OpenLayers.State.UPDATE;
            }
            layer.drawFeature(feature, "default"); // TODO: required?
            console.log("complete: " +feature.id);
            this.removeFromIndex([feature]);
            this.addToIndex([feature]);
            layer.events.triggerEvent("featuremodified", {feature: feature});
        }
console.log("completeModification: end");
        this.indexModified = {};
        this.currentFeature = null;

        this.ghostly = false;
    },
    
    /**
     * APIMethod: addToIndex
     * Deactivate the control.
     */
    addToIndex: function(features) {
        var indexFeatures = this.indexFeatures;
        for (var i = 0, len = features.length; i < len; i++) {
            var feature = features[i],
                line = this.getLineString(feature);
            if (line) {
                console.log("addToIndex: " + feature.id);
                indexFeatures[feature.id] = {
                    feature: feature,
                    nodes: [
                        this.addToNode(line.components[0], 0, feature),
                        this.addToNode(
                            line.components[line.components.length - 1],
                            1,
                            feature
                        )
                    ]
                };
            }
        }
    },
    
    /**
     * APIMethod: removeFromIndex
     * Deactivate the control.
     */
    removeFromIndex: function(features) {
        var count = 0,
            indexFeatures = this.indexFeatures;
        for (var i = 0, len = features.length; i < len; i++) {
            var feature = features[i],
                item = indexFeatures[feature.id];
            if (item) {
                this.removeFromNode(item.nodes[0], 0, feature);
                this.removeFromNode(item.nodes[1], 1, feature);
                delete indexFeatures[feature.id];
                count++;
            }
        }
        return count;
    },
    
    /**
     * Fucntion: getLineString
     *
     * Returns a <OpenLayers.Geometry.LineString> if the feature contains only a
     *    single LineString geometry, Otherwise returns null.
     *
     * *Caution* has side effects: cleaning is done removing the feature from
     *    the index if the feature has "DELETE" estate.
     *
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>}
     *
     * Returns:
     * - {<OpenLayers.Geometry.LineString>|null}
     */
    getLineString: function(feature) {
        var line = feature.geometry;
        if (line) {
            if (feature.state !== OpenLayers.State.DELETE) {
                while (line.components && line.components.length === 1) {
                    line = line.components[0];
                }
                if (line instanceof OpenLayers.Geometry.LineString) {
                    return line;
                }
            } else {
                this.removeFromIndex(feature);
            }
        }
        return null;
    },
    
    addToNode: function(point, vertexType, feature) {
        var indexNodes = this.indexNodes,
            nodeKey = point.x.toString() + "_" + point.y.toString();
        var item = indexNodes[nodeKey];
        if (!item) {
            item = [[], []]; // startNone: item[0], endNone: item[1]
            indexNodes[nodeKey] = item;
        }
        item[vertexType].push(feature);
        return nodeKey;
    },
    removeFromNode: function(nodeKey, vertexType, feature) {
        var indexNodes = this.indexNodes;
        var item = indexNodes[nodeKey];
        if (item) {
            OpenLayers.Util.removeItem(item[vertexType], feature);
            if (item[0].length === 0 && item[1].length === 0) {
                delete indexNodes[nodeKey];
            }
        }
    },
    
    findNodeFeatures: function(feature, vertexType) {
        var idItem = this.indexFeatures[feature.id];
        if (idItem) {
            return this.indexNodes[idItem.nodes[vertexType]];
        }
        return null;
    },

    
    CLASS_NAME: "OpenLayers.Control.GhostNodes"
});
