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
    indexOriginalGeometry: null,
    ghostly: false,
    currentFeature: null,
    splitControl: null, 

    /**
     * Property: layerListeners
     * {Object} The layerListeners is a internal object registered with
     *     <OpenLayers.Events.on> on the layar. The object structure is a
     *     listeners object as shown in the example for the events.on method.
     */
    layerListeners: null,
    splitListeners: null,

    initialize: function(){
        OpenLayers.Control.prototype.initialize.apply(this, arguments);

        // Manage indexes
        // ==============
        var indexFeatures,
            indexNodes,
            indexOriginalGeometry;

        // Private functions
        // -----------------
        var addToNode = function(point, vertexType, feature) {
            nodeKey = point.x.toString() + "_" + point.y.toString();
            var item = indexNodes[nodeKey];
            if (!item) {
                item = [[], []]; // startNone: item[0], endNone: item[1]
                indexNodes[nodeKey] = item;
            }
            item[vertexType].push(feature);
            return nodeKey;
        };
        var removeFromNode = function(nodeKey, vertexType, feature) {
            var item = indexNodes[nodeKey];
            if (item) {
                OpenLayers.Util.removeItem(item[vertexType], feature);
                if (item[0].length === 0 && item[1].length === 0) {
                    delete indexNodes[nodeKey];
                }
            }
        };

        // Public functions
        // ----------------
        /**
         * Method: clearIndexes
         * Deactivate the control.
         */
        var clearIndexes = function() {
            this.indexFeatures = indexFeatures = {};
            this.indexNodes = indexNodes = {};
        };
        var clearIindexModified = function() {
            this.indexOriginalGeometry = indexOriginalGeometry = {};
        };
        
        /**
         * Method: addToIndex
         * Deactivate the control.
         */
        var addToIndex = function(features) {
            for (var i = 0, len = features.length; i < len; i++) {
                var feature = features[i],
                    line = this.getLineString(feature);
                if (line) {
                    indexFeatures[feature.id] = {
                        feature: feature,
                        nodes: [
                            addToNode(line.components[0], 0, feature),
                            addToNode(
                                line.components[line.components.length - 1],
                                1,
                                feature
                            )
                        ]
                    };
                }
            }
        };
        
        /**
         * Method: removeFromIndex
         * Deactivate the control.
         */
        var removeFromIndex = function(features) {
            for (var i = 0, len = features.length; i < len; i++) {
                var feature = features[i],
                    item = indexFeatures[feature.id];
                if (item) {
                    removeFromNode(item.nodes[0], 0, feature);
                    removeFromNode(item.nodes[1], 1, feature);
                    delete indexFeatures[feature.id];
                }
            }
        };

        /**
         * Method: findNodeFeatures
         */
        var findNodeFeatures = function(feature, vertexType) {
            var idItem = indexFeatures[feature.id];
            if (idItem) {
                return indexNodes[idItem.nodes[vertexType]];
            }
            return null;
        };

        /**
         * Method: eachModification
         */
        var eachModification = function(functionItem) {
            this.ghostly = true;
            var layer = this.layer;
            for (var featureId in indexOriginalGeometry) {
                functionItem.call(
                    this,
                    layer,
                    indexFeatures[featureId].feature,
                    indexOriginalGeometry[featureId]
                );
            }
            this.ghostly = false;
        };

        // Public names
        this.clearIndexes = clearIndexes;
        this.clearIindexModified = clearIindexModified;
        this.addToIndex = addToIndex;
        this.removeFromIndex = removeFromIndex;
        this.findNodeFeatures = findNodeFeatures;
        this.eachModification = eachModification;
    },

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
            this.clearIndexes();
            this.clearIindexModified(); 
            
            if (this.layer && this.layer.map) {
                this.addToIndex(this.layer.features);
                
                if (this.splitControl) {
                    this.splitListeners = {
                        "aftersplit": this.onAftersplit,
                        scope: this
                    };
                    this.splitControl.events.on(this.splitListeners);
                }
                
                this.layerListeners = {
                    "featuresadded": function(evt) {this.addToIndex(evt.features);},
                    "featuresremoved": function(evt) {this.removeFromIndex(evt.features);},
                    "featuremodified": this.onFeatureModified,
                    "afterfeaturemodified": this.onAfterFeatureModified,
                    // "beforefeaturemodified" TODO: listen and trigger with cancel??
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
     * APIMethod: deactivate
     * Deactivate the control.
     */
    deactivate: function() {
        var deactivated = false;
        if (this.active) {
            if (this.currentFeature) {
                this.eachModification(this.completeModification);
                this.eachModification(this.stopModification);
            }
            this.clearIndexes();
            this.clearIindexModified();
            this.currentFeature = null;
            deactivated = OpenLayers.Control.prototype.deactivate.call(this);
            if (deactivated) {
                this.splitListeners && 
                            this.splitControl.events.un(this.splitListeners);
                this.layer.events.un(this.layerListeners);
            }
        }
        return deactivated;
    },

    /**
     * APIMethod: addSplit
     */
    addSplit: function(control) { // TODO: initialize
        if (this.layer === control.source) {
            this.splitControl = control;
        }
    },

    /**
     * Method: onAftersplit
     */
    onAftersplit: function(evt) {
        this.removeFromIndex([evt.source]);
        this.addToIndex(evt.features);
    },

    /**
     * Method: onFeatureModified
     */
    onFeatureModified: function(evt) {
        if (this.ghostly) { return; } // To ignore events fired by itself.

        this.eachModification(this.completeModification);
        var feature = evt.feature;
        this.removeFromIndex([feature])
        this.addToIndex([feature]);
    },

    /**
     * Method: onAfterFeatureModified
     */
    onAfterFeatureModified: function() {
        if (this.ghostly) { return; } // To ignore events fired by itself.

        this.eachModification(this.stopModification);
        this.clearIindexModified();
        this.currentFeature = null;
    },

    /**
     * Method: onVertexModified
     */
    onVertexModified: function(evt) {
        if (this.ghostly) { return; } // To ignore events fired by itself.

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
                    this.eachModification(this.completeModification);
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
            if (!this.indexOriginalGeometry[feature.id]) {
                var originalGeometry = feature.modified && 
                                       feature.modified.geometry;
                if (originalGeometry) {
                    this.indexOriginalGeometry[feature.id] = originalGeometry;
                } else {
                    this.indexOriginalGeometry[feature.id] = feature.geometry.clone();
                }
            }
            var comp;
            if (vertexType === 0) {
                comp = line.components[0];
            } else {
                comp = line.components[line.components.length -1];
            }
            comp.x = newVertex.x;
            comp.y = newVertex.y;
            comp.clearBounds();
            this.layer.drawFeature(feature, this.renderIntent);
        }
    },

    /**
     * Method: completeModification
     * Called when the features are modified.  If the current state is not
     *     INSERT or DELETE, the state is set to UPDATE.
     */
    completeModification: function(layer, feature, originalGeometry) {
        feature.modified = OpenLayers.Util.extend(feature.modified, {
            geometry: originalGeometry
        });

        if (feature.state !== OpenLayers.State.INSERT &&
                            feature.state !== OpenLayers.State.DELETE) {
            feature.state = OpenLayers.State.UPDATE;
        }
        layer.drawFeature(feature, "default"); // TODO: required?
        this.removeFromIndex([feature]);
        this.addToIndex([feature]);
        layer.events.triggerEvent("featuremodified", {feature: feature});
    },

    /**
     * Method: stopModification
     */
    stopModification: function(layer, feature) {
        layer.events.triggerEvent("afterfeaturemodified", {
            feature: feature,
            modified: true
        });
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
                this.removeFromIndex([feature]);
            }
        }
        return null;
    },

    CLASS_NAME: "OpenLayers.Control.GhostNodes"
});
