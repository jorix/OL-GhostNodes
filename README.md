Control for OpenLayers to maintain the junction points as a network.
====================================================================

**WARNING: this code is under development**

**GhostNodes** control for OpenLayers maintains the junction points as a network lines at modify the ends of the segments.

Control is specially designed to work together with `OpenLayers.Control.ModifyFeature` and `OpenLayers.Control.Split`.

Operation:
---------

Example:

```javascript
    ...
    var mySplitControl = new OpenLayers.Control.Split({source: vectorLayer ...});
    var gNodes = new OpenLayers.Control.GhostNodes({layer: myVectorLayer});
    gNodes.addSplit(mySplitControl);
    map.addControl(gNodes);
    gNodes.activate();
    ...
```
and nothing more is required.

Examples:
---------
 * [ghost-nodes.html](http://jorix.github.com/OL-GhostNodes/examples/ghost-nodes.html) a editing a street network based on the example "wfs-snap-split.html" of OL.

TODO:
-----
 * if dragging a node the lines intersect with other should trigger a split (trigger the vertexXXX events)

Compatibility with OpenLayers releases:
---------------------------------------
The `GhostNodes` control works correctly with release 2.11 or higher
including the development version.
