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
                    let oldConfig = this.inherited(arguments);
                    let newConfig = {
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

                fillHistograms: function ( renderArgs, isAlignByIonPosition ) {
                    let _this = this;
                    let histData = [
                        // Example:
                        // {
                        //     "key": 10604.08939,
                        //     "value": 5616.92,
                        //     "label": "A5",
                        //     "amino_acid": "L",
                        //     "position": 90
                        // },
                        // {
                        //     "key": 10762.17255,
                        //     "value": 27003.31,
                        //     "label": "A6",
                        //     "amino_acid": "T",
                        //     "position": 92
                        // }
                    ];

                    if(
                        isAlignByIonPosition === true &&
                        renderArgs.hasOwnProperty('mappingResultObjectArray') &&
                        renderArgs.hasOwnProperty('proteoformStartPosition') &&
                        renderArgs.hasOwnProperty('scanId')
                    )
                    {
                        _this._drawHistograms_v2(
                            renderArgs, renderArgs.mappingResultObjectArray,
                            renderArgs.proteoformStartPosition, renderArgs.scanId
                        );
                    }
                    else if(renderArgs.hasOwnProperty('dataToDraw'))
                    {
                        _this._drawHistograms(renderArgs, renderArgs.dataToDraw);
                    }
                    else if (renderArgs.debug === true) {
                        // Generating test data
                        histData = this._generateRandomData(histData, renderArgs.leftBase);

                        _this._drawHistograms(renderArgs, histData);
                    }
                },

                _drawHistograms_v2: function (
                    viewArgs, mappingResultObjectArray, proteoformStartPosition, scanId
                ) {
                    let _this = this;
                    let maxValue = this.config.histograms.maxValue || 100000.0;

                    let block = viewArgs.block;
                    let histogramHeight = this.config.histograms.height || 100;
                    let trackTotalHeight = histogramHeight + 100;
                    let bottomLineHeight = 10;
                    let blockScaleLevel = viewArgs.scale;
                    let blockStartBase = viewArgs.leftBase;
                    let blockEndBase = viewArgs.rightBase;
                    let blockOffsetStartBase = blockStartBase - (blockStartBase % 3);
                    let blockOffsetEndBase = blockEndBase - (blockEndBase % 3);
                    let blockBpLength = blockOffsetEndBase - blockOffsetStartBase;
                    let blockActualWidthInPx = blockBpLength * blockScaleLevel;

                    // Filter mapping result array for this block
                    let filteredMSScanMassMappingResultArray = [];
                    for(let index in mappingResultObjectArray)
                    {
                        if(
                            mappingResultObjectArray.hasOwnProperty(index) &&
                            typeof mappingResultObjectArray[index] == "object"
                        )
                        {
                            mappingResultObjectArray[index].leftBaseInBp =
                                proteoformStartPosition + 3 * mappingResultObjectArray[index].position;

                            if(
                                mappingResultObjectArray[index].leftBaseInBp >= blockOffsetStartBase &&
                                mappingResultObjectArray[index].leftBaseInBp < blockOffsetEndBase
                            )
                            {
                                // Because of the bIon mark is on the top right corner, add offset by 3bp here
                                mappingResultObjectArray[index].leftBaseInBp += 3;
                                filteredMSScanMassMappingResultArray.push(mappingResultObjectArray[index]);
                            }
                        }
                    }


                    domConstruct.empty(block.domNode);
                    let c = block.featureCanvas =
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

                    this.heightUpdate(trackTotalHeight, viewArgs.blockIndex);
                    let ctx = c.getContext('2d');
                    _this._scaleCanvas(c);
                    ctx.fillStyle = _this.config.histograms.color || '#fd79a8';
                    ctx.textAlign = "center";
                    ctx.font = "10px sans-serif";
                    ctx.lineWidth = 1;

                    // Draw the X-Axis line
                    ctx.beginPath();
                    ctx.moveTo(0, trackTotalHeight - bottomLineHeight);
                    ctx.lineTo(Math.ceil((blockEndBase - blockStartBase + 1)*blockScaleLevel), trackTotalHeight - bottomLineHeight);
                    ctx.stroke();

                    if(filteredMSScanMassMappingResultArray.length === 0)
                    {
                        // Empty Data
                        return;
                    }


                    let spanAtBlockStartAndEnd = blockActualWidthInPx * 0;
                    let blockWidthInPxAfterMinusOffsetAtStartAndEnd = blockActualWidthInPx - spanAtBlockStartAndEnd * 2;
                    let xAxisScale = blockWidthInPxAfterMinusOffsetAtStartAndEnd / blockBpLength;

                    array.forEach(filteredMSScanMassMappingResultArray,function (item, index) {
                        let barHeight = item.value / maxValue * histogramHeight;
                        let barWidth = 3;
                        let keyPosition = (item.leftBaseInBp - blockOffsetStartBase) * xAxisScale;
                        let barLeft_X = keyPosition + spanAtBlockStartAndEnd;
                        let barLeft_Y = trackTotalHeight - barHeight - bottomLineHeight;
                        // Draw histogram
                        ctx.save();
                        ctx.shadowOffsetX = 2;
                        ctx.shadowOffsetY = 0;
                        ctx.shadowBlur = 2;
                        ctx.shadowColor = "#999";
                        ctx.fillRect(
                            barLeft_X,
                            barLeft_Y,
                            barWidth,
                            barHeight
                        );
                        ctx.restore();

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

                            ctx.save();
                            ctx.fillStyle = '#2d3436';
                            ctx.font = "9px sans-serif";
                            // Draw value above the label
                            ctx.fillText((Math.round(item.value * 100) / 100).toString(),
                                barLeft_X + 1, barLeft_Y - 85);
                            if(viewArgs.showMzValue)
                            {
                                // Draw key under the X-axis
                                ctx.fillStyle = '#7f8c8d';
                                ctx.fillText((Math.round(item.key * 100) / 100).toString(),
                                    barLeft_X + 1, trackTotalHeight);
                            }
                            ctx.restore();
                        }
                    });

                    this._makeHistogramYScale(trackTotalHeight, histogramHeight, maxValue, bottomLineHeight);
                },

                _drawHistograms: function (viewArgs, histData) {
                    let _this = this;
                    // First we're going to find the max value (Deprecated: use fixed value instead)
                    // let maxValue = histData.length > 0 ? histData[0].value : 0;
                    // array.forEach(histData,function (item, index) {
                    //     if(maxValue < item.value)
                    //     {
                    //         maxValue = item.value;
                    //     }
                    // });
                    // let minVal = this.config.histograms.minValue || 0.0;
                    let maxValue = this.config.histograms.maxValue || 100000.0;

                    let block = viewArgs.block;
                    let histogramHeight = this.config.histograms.height || 100;
                    let trackTotalHeight = histogramHeight + 100;
                    let bottomLineHeight = 10;
                    let scaleLevel = viewArgs.scale;
                    let leftBase = viewArgs.leftBase;
                    let rightBase = viewArgs.rightBase;
                    let blockLengthWithoutScale = rightBase - leftBase;
                    let blockActualWidth = blockLengthWithoutScale * scaleLevel;

                    domConstruct.empty(block.domNode);
                    let c = block.featureCanvas =
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
                    let ctx = c.getContext('2d');
                    _this._scaleCanvas(c);
                    ctx.fillStyle = _this.config.histograms.color || '#fd79a8';
                    ctx.textAlign = "center";
                    ctx.font = "10px sans-serif";
                    ctx.lineWidth = 1;

                    // Draw the X-Axis line
                    ctx.beginPath();
                    ctx.moveTo(0, trackTotalHeight - bottomLineHeight);
                    ctx.lineTo(Math.ceil((rightBase - leftBase + 1)*scaleLevel), trackTotalHeight - bottomLineHeight);
                    ctx.stroke();

                    if(histData.length === 0)
                    {
                        // Empty Data
                        return;
                    }

                    // Calc the diff between max(last) and min(first) key
                    let keyMin = parseFloat(histData[0].key);
                    let keyMax = parseFloat(histData[histData.length - 1].key);
                    let keyDiffRange = (keyMax - keyMin) || 100;

                    let offsetAtStartAndEnd = blockActualWidth * 0.1;
                    let keyScale = (blockActualWidth - offsetAtStartAndEnd * 2) / keyDiffRange;

                    array.forEach(histData,function (item, index) {
                        let barHeight = item.value / maxValue * histogramHeight;
                        let barWidth = 3;
                        let keyPosition = (parseFloat(item.key) - keyMin) * keyScale;
                        let barLeft_X = offsetAtStartAndEnd + keyPosition;
                        let barLeft_Y = trackTotalHeight - barHeight - bottomLineHeight;
                        // Draw histogram
                        ctx.save();
                        ctx.shadowOffsetX = 2;
                        ctx.shadowOffsetY = 0;
                        ctx.shadowBlur = 2;
                        ctx.shadowColor = "#999";
                        ctx.fillRect(
                            barLeft_X,
                            barLeft_Y,
                            barWidth,
                            barHeight
                        );
                        ctx.restore();

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

                            ctx.save();
                            ctx.fillStyle = '#2d3436';
                            ctx.font = "9px sans-serif";
                            // Draw value above the label
                            ctx.fillText((Math.round(item.value * 100) / 100).toString(),
                                barLeft_X + 1, barLeft_Y - 85);
                            if(viewArgs.showMzValue)
                            {
                                // Draw key under the X-axis
                                ctx.fillStyle = '#7f8c8d';
                                ctx.fillText((Math.round(item.key * 100) / 100).toString(),
                                    barLeft_X + 1, trackTotalHeight);
                            }
                            ctx.restore();
                        }
                    });

                    this._makeHistogramYScale(trackTotalHeight, histogramHeight, maxValue, bottomLineHeight);

                    // Todo: Beautify
                    // Todo: After rendering the histogram, scale the Y-axis
                },

                _drawArrow: function (context, fromX, fromY, toX, toY){
                    context.save();
                    // Prepare for the arrow
                    context.beginPath();
                    context.strokeStyle = '#7f8c8d';
                    let headLength = 5;
                    let angle = Math.atan2(toY-fromY,toX-fromX);
                    context.moveTo(fromX, fromY);
                    context.lineTo(toX, toY);
                    context.lineTo(toX-headLength*Math.cos(angle-Math.PI/6),toY-headLength*Math.sin(angle-Math.PI/6));
                    context.moveTo(toX, toY);
                    context.lineTo(toX-headLength*Math.cos(angle+Math.PI/6),toY-headLength*Math.sin(angle+Math.PI/6));
                    // Call this function several times
                    context.stroke();
                    context.restore();
                },

                // For demo/testing only
                _generateRandomData: function ( histData , blockLeftBase ) {
                    if(blockLeftBase < 0)
                    {
                        blockLeftBase = 0;
                    }

                    let newHistData = lang.clone(histData);
                    let minKey = 300;
                    let minValue = 300;
                    let tempIncrease = 1;

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

                _makeHistogramYScale: function(trackTotalHeight ,histogramHeight, maxValue, bottomLineHeight ) {
                    if(
                        this.yscaleParams &&
                        // this.yscaleParams.height === trackTotalHeight &&
                        this.yscaleParams.max === maxValue &&
                        this.yscaleParams.min === 0
                    )
                    {
                        return;
                    }

                    this.yscaleParams = {
                        height: trackTotalHeight - bottomLineHeight,
                        min: 0,
                        max: maxValue
                    };
                    this.height = trackTotalHeight - bottomLineHeight;

                    this.makeYScale(this.yscaleParams);
                },

            }
        );
    }
);
