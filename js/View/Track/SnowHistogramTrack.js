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

                _defaultConfig: function () {
                    var oldConfig = this.inherited(arguments);
                    var newConfig = lang.mixin(
                        oldConfig,
                        {
                            histograms: {
                                height: 100,
                                color: '#fd79a8'
                            }
                        }
                    );

                    return newConfig;
                },

                fillBlock: function ( renderArgs ) {
                    // var blockIndex = renderArgs.blockIndex;
                    // var block = renderArgs.block;
                    // var leftBase = renderArgs.leftBase;
                    // var rightBase = renderArgs.rightBase;
                    // var scale = renderArgs.scale;

                    // Todo: Check if the user's browser support HTML canvas element
                    this.fillHistograms( renderArgs );
                },

                fillHistograms: function ( args ) {
                    var histData = [
                        { key: "632.0333849", value: "2988.667223" , label: null },
                        { key: "680.5928342", value: "1155.390511" , label: null },
                        { key: "710.411926", value: "1152.658037" , label: null },
                        { key: "749.4333483", value: "1729.825008" , label: null },
                        { key: "831.3868395", value: "1264.8382" , label: null },
                        { key: "853.488464", value: "1913.211091" , label: "B1" },
                        { key: "868.6782834", value: "3533.121477" , label: null },
                        { key: "1156.646592", value: "1052.036554" , label: "B2" },
                        { key: "1194.012072", value: "935.1523377" , label: null },
                        { key: "1289.746934", value: "2645.348555" , label: null },
                        { key: "1407.809556", value: "673.3459446" , label: "B3" },
                        { key: "1438.879551", value: "1615.504777" , label: null },
                        { key: "1549.889269", value: "2041.588973" , label: "B4" },
                        { key: "1651.942614", value: "1593.798358" , label: null },
                        { key: "1790.011013", value: "1352.322675" , label: null },
                        { key: "1947.576779", value: "1256.54348" , label: null },
                        { key: "2169.220591", value: "1257.662272" , label: null },
                        { key: "2197.030845", value: "932.6885953" , label: null },
                        { key: "2251.280739", value: "3531.849469" , label: null },
                        { key: "2276.080739", value: "9873.694419" , label: null }
                    ];
                    // Todo: Remove the code above, Query feature histogram data from STORE
                    // and push into histData Object
                    this._drawHistograms(args, histData);
                },

                _drawHistograms: function ( viewArgs, histData) {
                    var _this = this;
                    // First we're going to find the max value
                    var maxValue = histData.length > 0 ? histData[0].value : 0;
                    array.forEach(histData,function (item, index) {
                        if(maxValue < item.value)
                        {
                            maxValue = item.value;
                        }
                    });

                    var block = viewArgs.block;
                    var histogramHeight = this.config.histograms.height;
                    var trackTotalHeight = histogramHeight + 100;
                    var scale = viewArgs.scale; // 0.019079618407631848
                    var leftBase = viewArgs.leftBase;
                    var rightBase = viewArgs.rightBase;
                    // var minVal = this.config.histograms.min;

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
                                height: trackTotalHeight,
                                width: block.domNode.offsetWidth + 1,
                                style: {
                                    cursor: 'default',
                                    height: trackTotalHeight + 'px',
                                    position: 'absolute'
                                },
                                innerHTML: 'Browser doesn\'t support HTML canvas element',
                                className: 'canvas-track canvas-track-histograms'
                            },
                            block.domNode
                        );

                    // Done: Update Histogram Height
                    this.heightUpdate(trackTotalHeight, viewArgs.blockIndex);
                    var ctx = c.getContext('2d');
                    ctx.fillStyle = this.config.histograms.color;
                    ctx.textAlign = "center";
                    ctx.font = "Arial";

                    // Draw the X-Axis line
                    ctx.beginPath();
                    ctx.moveTo(0,trackTotalHeight);
                    ctx.lineTo(Math.ceil((rightBase - leftBase + 1)*scale),trackTotalHeight);
                    ctx.stroke();
                    // Prepare for the arrow
                    ctx.beginPath();

                    // Todo: Scale the canvas
                    array.forEach(histData,function (item, index) {
                        var barHeight = item.value / maxValue * histogramHeight;
                        var barWidth = 3;
                        var barLeft_X = (parseFloat(item.key) - keyMin) / keyScale * scale;
                        var barLeft_Y = trackTotalHeight - barHeight;
                        // Draw histogram
                        ctx.fillRect(
                            barLeft_X,
                            barLeft_Y,
                            barWidth,
                            barHeight
                        );

                        if(item.label != null)
                        {
                            // Draw arrow above the histogram column
                            _this._drawArrow(
                                ctx,
                                barLeft_X + 1,
                                barLeft_Y - 70,
                                barLeft_X + 1,
                                barLeft_Y - 5
                            );
                            // Draw label above the arrow
                            ctx.fillText(item.label,barLeft_X + 1, barLeft_Y - 75);
                        }
                    });
                    ctx.stroke();

                    // Todo: Beautify
                    // Todo: After rendering the histogram, scale the Y-axis
                },
                
                _drawArrow: function (context, fromX, fromY, toX, toY){
                    var headLength = 5;
                    var angle = Math.atan2(toY-fromY,toX-fromX);
                    context.moveTo(fromX, fromY);
                    context.lineTo(toX, toY);
                    context.lineTo(toX-headLength*Math.cos(angle-Math.PI/6),toY-headLength*Math.sin(angle-Math.PI/6));
                    context.moveTo(toX, toY);
                    context.lineTo(toX-headLength*Math.cos(angle+Math.PI/6),toY-headLength*Math.sin(angle+Math.PI/6));
                    // Call this function several times, then context.stroke()
                }

            }
        );
    }
);
