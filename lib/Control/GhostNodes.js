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
     * {String} Key used to retrieve the modified style from the layer's
     *     style map to draw features while being modified by this control.
     *     Default is "select".
     */
    renderIntent: "select",

    /**
     * Property: layers
     * Array({<OpenLayers.Layer.Vector>}) Array of target layers with features
     *    to be managed by this control.
     */
    layers: null,

    /**
     * Property: indexFeatures
     * {Object} Internal use.
     */
    indexFeatures: null,

    /**
     * Property: indexNodes
     * {Object} Internal use.
     */
    indexNodes: null,

    /**
     * Property: indexOriginalGeometry
     * {Object} Internal use.
     */
    indexOriginalGeometry: null,

    /**
     * Property: ghostly
     * {Boolean} Internal use.
     */
    ghostly: false,

    /**
     * Property: currentFeature
     * {OpenLayers.Feature.Vector} Internal use.
     */
    currentFeature: null,

    /**
     * Property: splitControl
     * {<OpenLayers.Control.Split>} The split control associated with this
     *     control.
     */
    splitControl: null, 

    /**
     * Property: layerListeners
     * {Object} The layerListeners is a internal object registered with
     *     <OpenLayers.Events.on> on the layer. The object structure is a
     *     listeners object as shown in the example for the events.on method.
     */
    layerListeners: null,

    /**
     * Property: splitListeners
     * {Object} The splitListeners is a internal object registered with
     *     <OpenLayers.Events.on> on the <splitControl>. The object structure is
     *     a listeners object as shown in the example for the events.on method.
     */
    splitListeners: null,

    /**
     * Property: mapListeners
     * {Object} The mapListeners is a internal object registered with
     *     <OpenLayers.Events.on> on the map. The object structure is a
     *     listeners object as shown in the example for the events.on method.
     */
    mapListeners: null,

    /**
     * Constructor: OpenLayers.Control.GhostNodes
     */
    initialize: function(options) {
        OpenLayers.Control.prototype.initialize.apply(this, arguments);

        // Internal listeners
        this.splitListeners = {
            "aftersplit": this.onAftersplit,
            scope: this
        };
        this.mapListeners = {
            'addlayer': 
                function(evt) {
                    var layer = evt.layer;
                    if (this.active &&
                           OpenLayers.Util.indexOf(this.layers, layer) !== -1) {
                        this.layerOn(layer);
                    }
                },
            'removelayer': 
                function(evt) {
                    var layer = evt.layer;
                    if (this.active &&
                           OpenLayers.Util.indexOf(this.layers, layer) !== -1) {
                        this.layerOff(layer);
                    }
                },
            scope: this
        };
        this.layerListeners = {
            "featuresadded": function(evt) {this.addToIndex(evt.features);},
            "featuresremoved": function(evt) {this.removeFromIndex(evt.features);},
            "featuremodified": this.onFeatureModified,
            "afterfeaturemodified": this.onAfterFeatureModified,
            "vertexmodified": this.onVertexModified,
            scope: this
        }
        
        // Manage indexes
        // ==============
        var indexFeatures,
            indexNodes,
            indexOriginalGeometry;

        // Private functions
        // -----------------
        var addToNode = function(point, vertexType, feature) {
            var nodeKey = point.x.toString() + "_" + point.y.toString(),
                item = indexNodes[nodeKey];
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
            var layers = this.layers;
            for (var i = 0, len = layers.length; i < len; i++) {
                var layer = layers[i];
                for (var featureId in indexOriginalGeometry) {
                    functionItem.call(
                        this,
                        layer,
                        indexFeatures[featureId].feature,
                        indexOriginalGeometry[featureId]
                    );
                }
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
        
        // Set some options
        options = options || {};
        if (options.splitControl) {
            this.splitControl = null;
            this.setSplit(options.splitControl);
        }
        this.layers = [];
        var layers = options.layers;
        if (layers) {
            for (var i = 0, len = layers.length; i < len; i++) {
                this.addLayer(layers[i]);
            }
        }
    },

    /**
     * Method: destroy
     * Clean up the control.
     */
    destroy: function() {
        this.deactivate();
        this.splitListeners = null;
        this.layerListeners = null;
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
            if (this.splitControl) {
                this.splitControl.events.on(this.splitListeners);
            }
            var layers = this.layers;
            for (var i = 0, len = layers.length; i < len; i++) {
                this.layerOn(layers[i]);
            }
            this.map.events.on(this.mapListeners);
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
            this.map.events.un(this.mapListeners);
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
                var layers = this.layers;
                for (var i = 0, len = layers.length; i < len; i++) {
                    layers[i].events.un(this.layerListeners);
                }
            }
        }
        return deactivated;
    },

    /**
     * APIMethod: addLayer
     */
    addLayer: function(layer) {
        if (OpenLayers.Util.indexOf(this.layers, layer) === -1) {
            this.layers.push(layer);
            this.active && this.layerOn(layer);
        }
    },

    /**
     * APIMethod: removeLayer
     */
    removeLayer: function(layer) {
        if (OpenLayers.Util.indexOf(this.layers, layer) !== -1) {
            OpenLayers.Util.removeItem(this.layers, layer);
            this.active && this.layerOff(layer);
        }
    },

    /**
     * Method: layerOn
     */
    layerOn: function(layer) {
        if (layer.map) {
            this.addToIndex(layer.features);
            layer.events.on(this.layerListeners);
        }
    },

    /**
     * Method: layerOff
     */
    layerOff: function(layer) {
        this.removeFromIndex(layer.features);
        layer.events.un(this.layerListeners);
    },

    /**
     * APIMethod: setSplit
     * Associate a split control to this conrol to act at end of any split.
     *
     * Parameters:
     * control - {<OpenLayers.Control.Split>}
     */
    setSplit: function(control) {
        if (this.avtive && this.splitControl) {
            this.splitControl.events.un(this.splitListeners);
        }
        this.splitControl = null;
        if (control) {
            var isSource = false,
                layers = this.layers;
            for (var i = 0, len = layers.length; i < len; i++) {
                if (layers[i] === control.source) {
                    isSource = true;
                    break;
                }
            }
            if (isSource) {
                this.splitControl = control;
                this.avtive && this.splitControl.events.on(this.splitListeners);
                return true;
            } else {
                return false;
            }
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
            feature.layer.drawFeature(feature, this.renderIntent);
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
        layer.drawFeature(feature, "default");
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
