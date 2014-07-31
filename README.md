Control for OpenLayers to maintain the junction points as a network.
====================================================================

**GhostNodes** control for OpenLayers maintains the junction of initial vertices and end vertices of the lines as a network. 
Modifying a initial or final vertex are modified all of the vertices of other lines that begin or end at that vertex.

This control is specially designed to work together with `OpenLayers.Control.ModifyFeature` and `OpenLayers.Control.Split`.

Is also recommended to use a `OpenLayers.Control.Snapping`.

Please, open a **issue** if you have questions or problems using this control.

Operation:
---------

Example:

```javascript
    ...
    var gNodes = new OpenLayers.Control.GhostNodes({layers: [myVectorLayer]});
    map.addControl(gNodes);
    gNodes.activate();
    ...
    // and if using a `Split` control should make it known to the `GhostNodes` as:
    var mySplitControl = new OpenLayers.Control.Split({source: vectorLayer ...});
    gNodes.setSplit(mySplitControl);
```
and nothing more is required.

Examples:
---------
 * [ghost-nodes.html](http://jorix.github.com/OL-GhostNodes/examples/ghost-nodes.html) a editing a street network based on the example "wfs-snap-split.html" of OL.

TODO:
-----
 * unSplit by vertexremoved if is single jointed.
 * docs
 * and ...

Compatibility with OpenLayers releases:
---------------------------------------
The `GhostNodes` control is designed to work correctly with release 2.11 of OpenLayers or higher
including the development version.
