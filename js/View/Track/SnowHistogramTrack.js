// Track that draws histogram
// Snow 2019-01-30

define([
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/dom-construct',
        // 'JBrowse/View/Track/BlockBased',
        'JBrowse/View/Track/CanvasFeatures',
        'JBrowse/View/Track/_YScaleMixin'
    ],
    function (
        declare,
        array,
        lang,
        domConstruct,
        // BlockBasedTrack
        CanvasFeatures,
        _YScaleMixin
    ) {
        return declare(
            [
                CanvasFeatures,
                _YScaleMixin
            ],
            {

                constructor: function ( args ){

                },

                _defaultConfig: function () {
                    var oldConfig = this.inherited(arguments);
                    var newConfig = {
                        histograms: {
                            height: 100,
                            color: '#fd79a8',
                            maxValue: 100000.0
                        }
                    };

                    newConfig = lang.mixin(
                        lang.clone(oldConfig),
                        newConfig
                    );
                    return newConfig;
                },

                fillBlock: function ( renderArgs ) {

                    this.fillHistograms( renderArgs );
                },

                fillHistograms: function ( renderArgs ) {
                    var histData = [
                        // { key: "632.0333849", value: "2988.667223" , label: null },
                        // { key: "680.5928342", value: "1155.390511" , label: null },
                        // { key: "710.411926", value: "1152.658037" , label: null },
                        // { key: "749.4333483", value: "1729.825008" , label: null },
                        // { key: "831.3868395", value: "1264.8382" , label: null },
                        // { key: "853.488464", value: "1913.211091" , label: "B1" },
                        // { key: "868.6782834", value: "3533.121477" , label: null },
                        // { key: "1156.646592", value: "1052.036554" , label: "B2" },
                        // { key: "1194.012072", value: "935.1523377" , label: null },
                        // { key: "1289.746934", value: "2645.348555" , label: null },
                        // { key: "1407.809556", value: "673.3459446" , label: "B3" },
                        // { key: "1438.879551", value: "1615.504777" , label: null },
                        // { key: "1549.889269", value: "2041.588973" , label: "B4" },
                        // { key: "1651.942614", value: "1593.798358" , label: null },
                        // { key: "1790.011013", value: "1352.322675" , label: null },
                        // { key: "1947.576779", value: "1256.54348" , label: null },
                        // { key: "2169.220591", value: "1257.662272" , label: null },
                        // { key: "2197.030845", value: "932.6885953" , label: null },
                        // { key: "2251.280739", value: "3531.849469" , label: null },
                        // { key: "2276.080739", value: "9873.694419" , label: null }
                    ];

                    if(renderArgs.hasOwnProperty('dataToDraw'))
                    {
                        this._drawHistograms(renderArgs, renderArgs.dataToDraw);
                    }
                    else {
                        // Generating test data
                        histData = this._generateRandomData(histData, renderArgs.leftBase);

                        this._drawHistograms(renderArgs, histData);
                    }

                },

                _drawHistograms: function (viewArgs, histData) {
                    var _this = this;
                    // First we're going to find the max value (Deprecated: use fixed value instead)
                    // var maxValue = histData.length > 0 ? histData[0].value : 0;
                    // array.forEach(histData,function (item, index) {
                    //     if(maxValue < item.value)
                    //     {
                    //         maxValue = item.value;
                    //     }
                    // });
                    // var minVal = this.config.histograms.minValue || 0.0;
                    var maxValue = this.config.histograms.maxValue || 100000.0;

                    var block = viewArgs.block;
                    var histogramHeight = this.config.histograms.height || 100;
                    var trackTotalHeight = histogramHeight + 100;
                    var scaleLevel = viewArgs.scale;
                    var leftBase = viewArgs.leftBase;
                    var rightBase = viewArgs.rightBase;
                    var blockLengthWithoutScale = rightBase - leftBase;
                    var blockActualWidth = blockLengthWithoutScale * scaleLevel;

                    domConstruct.empty(block.domNode);
                    var c = block.featureCanvas =
                        domConstruct.create(
                            'canvas',
                            {
                                height: trackTotalHeight,
                                width: block.domNode.offsetWidth + 1,
                                style:
                                {
                                    cursor: 'default',
                                    height: trackTotalHeight + 'px',
                                    position: 'absolute'
                                },
                                innerHTML: 'HTML5 Canvas Block',
                                className: 'canvas-track canvas-track-histograms'
                            },
                            block.domNode
                        );

                    // Done: Update Histogram Height
                    this.heightUpdate(trackTotalHeight, viewArgs.blockIndex);
                    var ctx = c.getContext('2d');
                    _this._scaleCanvas(c);
                    ctx.fillStyle = this.config.histograms.color;
                    ctx.textAlign = "center";
                    ctx.font = "Arial";

                    // Draw the X-Axis line
                    ctx.beginPath();
                    ctx.moveTo(0,trackTotalHeight);
                    ctx.lineTo(Math.ceil((rightBase - leftBase + 1)*scaleLevel),trackTotalHeight);
                    ctx.stroke();

                    if(histData.length === 0)
                    {
                        // Empty Data
                        return;
                    }

                    // Prepare for the arrow
                    ctx.beginPath();
                    // Calc the diff between max(last) and min(first) key
                    var keyMin = parseFloat(histData[0].key);
                    var keyMax = parseFloat(histData[histData.length - 1].key);
                    var keyDiffRange = (keyMax - keyMin) || 100;

                    var offsetAtStartAndEnd = blockActualWidth * 0.1;
                    var keyScale = (blockActualWidth - offsetAtStartAndEnd * 2) / keyDiffRange;

                    array.forEach(histData,function (item, index) {
                        var barHeight = item.value / maxValue * histogramHeight;
                        var barWidth = 3;
                        var keyPosition = (parseFloat(item.key) - keyMin) * keyScale;
                        var barLeft_X = offsetAtStartAndEnd + keyPosition;
                        var barLeft_Y = trackTotalHeight - barHeight;
                        // Draw histogram
                        ctx.fillRect(
                            barLeft_X,
                            barLeft_Y,
                            barWidth,
                            barHeight
                        );

                        if(item.label !== undefined && item.label != null)
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
                            // Draw value above the label
                            ctx.fillText((Math.round(item.value * 100) / 100).toString(),
                                barLeft_X + 1, barLeft_Y - 85);
                        }
                    });
                    ctx.stroke();

                    this._makeHistogramYScale(histogramHeight, maxValue);

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
                },

                // For demo/testing only
                _generateRandomData: function ( histData , blockLeftBase ) {
                    if(blockLeftBase < 0)
                    {
                        blockLeftBase = 0;
                    }

                    var newHistData = lang.clone(histData);
                    var minKey = 300;
                    var minValue = 300;
                    var tempIncrease = 1;

                    array.forEach(newHistData,function (item, index) {
                        item.key = minKey + 150 * index + Math.random() * 130;
                        item.value = minValue + Math.random() * 6000;

                        if(index === newHistData.length - 3 && tempIncrease <=3 ) {
                            if(1 === tempIncrease)
                            {
                                newHistData[newHistData.length - 3].label = 'B' +
                                    ( parseInt(blockLeftBase / newHistData.length)*3 + tempIncrease);
                                tempIncrease ++;
                            }
                            if(2 === tempIncrease)
                            {
                                newHistData[newHistData.length - 2].label = 'B' +
                                    ( parseInt(blockLeftBase / newHistData.length)*3 + tempIncrease);
                                tempIncrease ++;
                            }
                            if(3 === tempIncrease)
                            {
                                newHistData[newHistData.length - 1].label = 'B' +
                                    ( parseInt(blockLeftBase / newHistData.length)*3 + tempIncrease);
                                tempIncrease ++;
                            }
                        }
                        else if(Math.random() > 0.8 && tempIncrease <= 3) {
                            item.label = 'B' +
                                ( parseInt(blockLeftBase / newHistData.length)*3 + tempIncrease);
                            tempIncrease ++;
                        }
                        else {
                            item.label = null;
                        }
                    }, this);

                    return newHistData;
                },

                _makeHistogramYScale: function( histogramHeight, maxValue ) {
                    if(
                        this.yscaleParams &&
                        this.yscaleParams.height === histogramHeight &&
                        this.yscaleParams.max === maxValue &&
                        this.yscaleParams.min === 0
                    )
                    {
                        return;
                    }

                    this.yscaleParams = {
                        height: histogramHeight,
                        min: 0,
                        max: maxValue
                    };

                    this.makeYScale(this.yscaleParams);
                },

            }
        );
    }
);
