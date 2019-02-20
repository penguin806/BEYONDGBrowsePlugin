// Track that draws histogram
// Snow 2019-01-30

define([
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/dom-construct',
        'JBrowse/View/Track/BlockBased',
    ],
    function (
        declare,
        array,
        lang,
        domConstruct,
        BlockBasedTrack
    ) {
        return declare(
            [
                BlockBasedTrack
            ],
            {

                constructor: function ( args ) {
                    
                },

                fillBlock: function ( renderArgs ) {
                    var blockIndex = renderArgs.blockIndex;
                    var block = renderArgs.block;
                    var leftBase = renderArgs.leftBase;
                    var rightBase = renderArgs.rightBase;
                    var scale = renderArgs.scale;

                    // Todo: Check if the user's browser support HTML canvas element
                    this.fillHistograms( renderArgs );
                },

                fillHistograms: function ( args ) {
                    var histData = [
                        {"key":632.0333849,"value":2988.667223},
                        {"key":680.5928342,"value":1155.390511},
                        {"key":710.411926,"value":1152.658037},
                        {"key":749.4333483,"value":1729.825008},
                        {"key":831.3868395,"value":1264.8382},
                        {"key":853.488464,"value":1913.211091},
                        {"key":868.6782834,"value":3533.121477},
                        {"key":1156.646592,"value":1052.036554},
                        {"key":1194.012072,"value":935.1523377},
                        {"key":1289.746934,"value":2645.348555},
                        {"key":1407.809556,"value":673.3459446},
                        {"key":1438.879551,"value":1615.504777},
                        {"key":1549.889269,"value":2041.588973},
                        {"key":1651.942614,"value":1593.798358},
                        {"key":1790.011013,"value":1352.322675},
                        {"key":1947.576779,"value":1256.54348},
                        {"key":2169.220591,"value":1257.662272},
                        {"key":2197.030845,"value":932.6885953},
                        {"key":2251.280739,"value":3531.849469},
                        {"key":2276.080739,"value":9873.694419},
                    ];
                    // Todo: Remove the code above, Query feature histogram data from STORE
                    // and push into histData Object
                    this._drawHistograms(args, histData);
                },

                _drawHistograms: function ( viewArgs, histData) {
                    // First we're going to find the max value
                    var maxValue = histData.length > 0 ? histData[0].value : 0;
                    array.forEach(histData,function (item, index) {
                        if(maxValue < item.value)
                        {
                            maxValue = item.value;
                        }
                    });

                    var block = viewArgs.block;
                    var height = 100; // this.config.histograms.height;
                    var scale = viewArgs.scale; // 0.019079618407631848
                    var leftBase = viewArgs.leftBase;
                    var rightBase = viewArgs.rightBase;
                    var minVal = 0; // this.config.histograms.min;

                    // Calc the diff between max(last) and min(first) key
                    var keyMin = parseFloat(histData[0].key);
                    var keyMax = parseFloat(histData[histData.length - 1].key);
                    var keyDiff = Math.ceil(keyMax - keyMin);
                    // Calc the scale level
                    var keyScale = parseFloat(keyDiff) / (rightBase - leftBase - 1);

                    domConstruct.empty(block.domNode);
                    var c = block.featureCanvas =
                        domConstruct.create(
                            'canvas',
                            {
                                height: height,
                                width: block.domNode.offsetWidth + 1,
                                style: {
                                    cursor: 'default',
                                    height: height + 'px',
                                    position: 'absolute'
                                },
                                innerHTML: 'Browser doesn\'t support HTML canvas element',
                                className: 'canvas-track canvas-track-histograms'
                            },
                            block.domNode
                        );
                    // Todo: Update Histogram Height
                    var ctx = c.getContext('2d');

                    ctx.beginPath();
                    ctx.moveTo(0,height);
                    ctx.lineTo(Math.ceil((rightBase - leftBase + 1)*scale),height);
                    ctx.stroke();

                    // Todo: Scale the canvas
                    ctx.fillStyle = '#fd79a8';//this.config.histograms.color; "goldenrod"
                    array.forEach(histData,function (item, index) {
                        var barHeight = item.value / maxValue * height;
                        var barWidth = 3;
                        var barLeft = (parseFloat(item.key) - keyMin) / keyScale * scale;
                        ctx.fillRect(
                            barLeft,
                            height - barHeight,
                            barWidth,
                            barHeight
                        );

                        // Todo: Beautify
                    });

                    // Todo: After rendering the histogram, scale the Y-axis
                }

            }
        );
    }
);
