// Track that draws histogram
// Snow 2019-01-30

define([
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/on',
        'dojo/dom-construct',
        'dojo/dom-geometry',
        'dojo/query',
        // 'JBrowse/View/Track/BlockBased',
        'JBrowse/View/Track/CanvasFeatures',
        'JBrowse/View/Track/_YScaleMixin'
    ],
    function (
        declare,
        array,
        lang,
        dojoOn,
        domConstruct,
        domGeom,
        dojoQuery,
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

                fillBlock: function (renderArgs) {
                    let _this = this;
                    _this.fillHistograms( renderArgs );
                },

                fillHistograms: function (renderArgs, isAlignByIonPosition) {
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

                    _this.mappingResultObjectArray = renderArgs.mappingResultObjectArray;
                    _this._attachMouseOverEvents();

                    function findMaxIntensity(mappingResultObjectArray) {
                        let maxInstensity = 0;
                        for(let index in mappingResultObjectArray)
                        {
                            if(mappingResultObjectArray.hasOwnProperty(index))
                            {
                                if(mappingResultObjectArray[index].value > maxInstensity)
                                {
                                    maxInstensity = mappingResultObjectArray[index].value;
                                }
                            }
                        }
                        return maxInstensity === 0 ? 100000.0 : maxInstensity;
                    }

                    if(
                        isAlignByIonPosition === true &&
                        renderArgs.hasOwnProperty('mappingResultObjectArray') &&
                        renderArgs.hasOwnProperty('proteoformStartPosition') &&
                        renderArgs.hasOwnProperty('scanId')
                    )
                    {
                        _this.config.histograms.maxValue = findMaxIntensity(renderArgs.mappingResultObjectArray);
                        _this._drawHistograms_v2(
                            renderArgs, renderArgs.mappingResultObjectArray,
                            renderArgs.proteoformStartPosition, renderArgs.scanId
                        );
                    }
                    else if(renderArgs.hasOwnProperty('dataToDraw'))
                    {
                        // Deprecated
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
                    let maxValue = _this.config.histograms.maxValue =
                        _this.config.histograms.maxValue || 100000.0;

                    let block = viewArgs.block;
                    let histogramHeight = _this.config.histograms.height =
                        _this.config.histograms.height || 100;
                    let trackTotalHeight = _this.trackTotalHeight = histogramHeight * 2;
                    let bottomLineHeight = _this.bottomLineHeight = 10;
                    let blockScaleLevel = viewArgs.scale;
                    let blockStartBase = viewArgs.leftBase;
                    let blockEndBase = viewArgs.rightBase;
                    let blockOffsetStartBase = blockStartBase - (blockStartBase % 3);
                    let blockOffsetEndBase = blockEndBase - (blockEndBase % 3);
                    // let blockBpLength = blockOffsetEndBase - blockOffsetStartBase;
                    // let blockActualWidthInPx = blockBpLength * blockScaleLevel;

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
                    let context = c.getContext('2d');
                    _this._scaleCanvas(c);
                    context.fillStyle = _this.config.histograms.color || '#fd79a8';
                    context.textAlign = "center";
                    context.font = "10px sans-serif";
                    context.lineWidth = 1;

                    // Draw the X-Axis line
                    context.beginPath();
                    context.moveTo(0, trackTotalHeight - bottomLineHeight);
                    context.lineTo(Math.ceil((blockEndBase - blockStartBase + 1)*blockScaleLevel), trackTotalHeight - bottomLineHeight);
                    context.stroke();

                    // Filter mapping result array for this block
                    let filteredMSScanMassMappingResultArray = [];
                    for(let index in mappingResultObjectArray)
                    {
                        if(
                            mappingResultObjectArray.hasOwnProperty(index) &&
                            typeof mappingResultObjectArray[index] == "object"
                        )
                        {
                            if(
                                mappingResultObjectArray[index].leftBaseInBp >= blockOffsetStartBase &&
                                mappingResultObjectArray[index].leftBaseInBp < blockOffsetEndBase
                            )
                            {
                                let resultObjectInThisBlock = mappingResultObjectArray[index];
                                // Because the bIon mark is on the top right corner, add offset by 3bp here
                                resultObjectInThisBlock.leftBaseInBpWithOffset =
                                    resultObjectInThisBlock.leftBaseInBp + 3;
                                // Minus block left offset
                                resultObjectInThisBlock.leftBaseInBpWithOffset -= (blockStartBase - blockOffsetStartBase);
                                resultObjectInThisBlock.leftBaseInBpWithOffset -= (proteoformStartPosition % 3);
                                resultObjectInThisBlock.context = context;
                                resultObjectInThisBlock.viewArgs = viewArgs;

                                filteredMSScanMassMappingResultArray.push(resultObjectInThisBlock);
                            }
                        }
                    }

                    if(filteredMSScanMassMappingResultArray.length === 0)
                    {
                        // Empty Data
                        return;
                    }

                    array.forEach(
                        filteredMSScanMassMappingResultArray,
                        function (item, index) {
                            _this._drawGraph(
                                item, context, viewArgs
                            );
                        }
                    );

                    this._makeHistogramYScale(trackTotalHeight, histogramHeight, maxValue, bottomLineHeight);
                },

                _attachMouseOverEvents: function( ) {
                    let _this = this;
                    let genomeView = _this.browser.view;

                    if( !_this._mouseoverEvent ) {
                        _this._mouseoverEvent = _this.own(
                            dojoOn(
                                _this.staticCanvas, 'mousemove', function( evt ) {
                                    domGeom.normalizeEvent(evt);
                                    let bpX = genomeView.absXtoBp( evt.clientX ) + 1;
                                    if(isNaN(bpX))
                                    {
                                        return;
                                    }
                                    if(_this.lastMouseOverPositionXInBp)
                                    {
                                        if(
                                            Math.abs(bpX - _this.lastMouseOverPositionXInBp) < 0.1
                                        )
                                        {
                                            return;
                                        }
                                    }
                                    _this.lastMouseOverPositionXInBp = Math.floor(bpX);
                                    // console.info('mousemove', bpX);
                                    let mappingResultObjectArray = _this.mappingResultObjectArray;
                                    for(let index in mappingResultObjectArray)
                                    {
                                        if(
                                            mappingResultObjectArray.hasOwnProperty(index) &&
                                            typeof mappingResultObjectArray[index] == "object" &&
                                            mappingResultObjectArray[index].hasOwnProperty('leftBaseInBpWithOffset')
                                        )
                                        {
                                            let barPositionInBp = mappingResultObjectArray[index].leftBaseInBpWithOffset + 2.1;
                                            if(mappingResultObjectArray[index].type === 'Y')
                                            {
                                                barPositionInBp -= 3;
                                            }
                                            if(
                                                typeof window.BEYONDGBrowseProteinTrack == "object" &&
                                                window.BEYONDGBrowseProteinTrack.hasOwnProperty('config')
                                            )
                                            {
                                                if(window.BEYONDGBrowseProteinTrack.config.hasOwnProperty('proteoformExtraOffset'))
                                                {
                                                    barPositionInBp += parseInt(
                                                        window.BEYONDGBrowseProteinTrack.config.proteoformExtraOffset
                                                    ) * 0.01  * (_this.blocks[_this.firstAttached].endBase - _this.blocks[_this.firstAttached].startBase);
                                                }
                                            }

                                            if(Math.abs(bpX - barPositionInBp) < 1)
                                            {
                                                let item = _this.lastHighlistItem = mappingResultObjectArray[index];
                                                SnowConsole.info('bpX', bpX, 'barPositionInBp', barPositionInBp, item, item.context, item.viewArgs);
                                                _this._drawGraph(item, item.context, item.viewArgs, true);

                                                if(item.type === 'B')
                                                {
                                                    dojoQuery(
                                                        '.snow_proteoform_frame.scan_' + _this.scanId
                                                        + ' .Snow_aminoAcid_bIon_' + item.label
                                                    ).addClass('hoverState');
                                                }
                                                else if(item.type === 'Y')
                                                {
                                                    dojoQuery(
                                                        '.snow_proteoform_frame.scan_' + _this.scanId
                                                        + ' .Snow_aminoAcid_yIon_' + item.label
                                                    ).addClass('hoverState');
                                                }

                                                break;
                                            }
                                        }
                                        if(_this.lastHighlistItem)
                                        {
                                            let item = _this.lastHighlistItem;
                                            _this.lastHighlistItem = undefined;
                                            _this._drawGraph(item, item.context, item.viewArgs, false);
                                            dojoQuery(
                                                '.snow_proteoform_frame.scan_' + _this.scanId
                                                + ' .Snow_aminoAcid_bIon_' + item.label
                                            ).removeClass('hoverState');

                                            dojoQuery(
                                                '.snow_proteoform_frame.scan_' + _this.scanId
                                                + ' .Snow_aminoAcid_yIon_' + item.label
                                            ).removeClass('hoverState');
                                        }
                                    }
                                }
                            )
                        )[0];
                    }

                    if( !this._mouseoutEvent ) {
                        this._mouseoutEvent = this.own(
                            dojoOn(
                                this.staticCanvas, 'mouseout', function(evt) {
                                    SnowConsole.info('mouseout', evt);
                                    if(_this.lastHighlistItem)
                                    {
                                        let item = _this.lastHighlistItem;
                                        _this.lastHighlistItem = undefined;
                                        _this._drawGraph(item, item.context, item.viewArgs, false);
                                        dojoQuery(
                                            '.snow_proteoform_frame.scan_' + _this.scanId
                                            + ' .Snow_aminoAcid_bIon_' + item.label
                                        ).removeClass('hoverState');
                                    }
                                }
                            )
                        )[0];
                    }
                },

                _drawGraph: function(
                    item, context, viewArgs, isHighLightState
                ) {
                    let _this = this;

                    let blockScaleLevel = viewArgs.scale;
                    let blockStartBase = viewArgs.leftBase;
                    let blockEndBase = viewArgs.rightBase;
                    let blockOffsetStartBase = blockStartBase - (blockStartBase % 3);
                    let blockOffsetEndBase = blockEndBase - (blockEndBase % 3);
                    let blockBpLength = blockOffsetEndBase - blockOffsetStartBase;
                    let blockActualWidthInPx = blockBpLength * blockScaleLevel;
                    // let spanAtBlockStartAndEnd = blockActualWidthInPx * 0;
                    let spanAtBlockStartAndEnd = 0;
                    let blockWidthInPxAfterMinusOffsetAtStartAndEnd = blockActualWidthInPx - spanAtBlockStartAndEnd * 2;
                    let xAxisScale = blockWidthInPxAfterMinusOffsetAtStartAndEnd / blockBpLength;

                    let maxValue = _this.config.histograms.maxValue;
                    let histogramHeight = _this.config.histograms.height;
                    let trackTotalHeight = _this.trackTotalHeight;
                    let bottomLineHeight = _this.bottomLineHeight;
                    let barHeight = item.value / maxValue * histogramHeight;
                    let barWidth = 3;
                    let keyPosition = (item.leftBaseInBpWithOffset - blockOffsetStartBase) * xAxisScale;
                    if(
                        typeof window.BEYONDGBrowseProteinTrack == "object" &&
                        window.BEYONDGBrowseProteinTrack.hasOwnProperty('config')
                    )
                    {
                        if(window.BEYONDGBrowseProteinTrack.config.hasOwnProperty('proteoformExtraOffset'))
                        {
                            keyPosition += parseInt(
                                window.BEYONDGBrowseProteinTrack.config.proteoformExtraOffset
                            ) * 0.01  * blockWidthInPxAfterMinusOffsetAtStartAndEnd;
                        }
                    }
                    if(item.type === 'Y')
                    {
                        keyPosition -= 3 * xAxisScale;
                    }
                    let barLeft_X = keyPosition + spanAtBlockStartAndEnd;
                    let barLeft_Y = trackTotalHeight - barHeight - bottomLineHeight;
                    // Draw histogram
                    context.save();
                    context.shadowOffsetX = 2;
                    context.shadowOffsetY = 0;
                    context.shadowBlur = 2;
                    context.shadowColor = "#999";

                    function drawLeftAndRightDiff(isHighLightState)
                    {
                        context.save();
                        context.shadowColor = 'rgba(0, 0, 0, 0)';
                        context.shadowBlur = 0;
                        context.shadowOffsetX = 0;
                        context.shadowOffsetY = 0;
                        context.font = "8px sans-serif";
                        if(isHighLightState === true)
                        {
                            context.fillStyle = 'rgba(0, 0, 0, 1)';
                        }
                        else
                        {
                            context.fillStyle = 'rgba(255,255,255,1)';
                        }

                        item.leftNeighbor = undefined;
                        item.rightNeighbor = undefined;
                        // Left Neighbor
                        for(let i = 0; i < item.finalIndex; i++)
                        {
                            if(item.type === 'B')
                            {
                                if(
                                    _this.mappingResultObjectArray[i].type === item.type
                                    && _this.mappingResultObjectArray[i].position < item.position
                                )
                                {
                                    item.leftNeighbor = _this.mappingResultObjectArray[i];
                                }
                            }
                            else if(item.type === 'Y')
                            {
                                if(
                                    _this.mappingResultObjectArray[i].type === item.type
                                    && _this.mappingResultObjectArray[i].position > item.position
                                )
                                {
                                    item.rightNeighbor = _this.mappingResultObjectArray[i];
                                }
                            }
                        }
                        // Right Neighbor
                        for(let i = item.finalIndex + 1; i < _this.mappingResultObjectArray.length; i++)
                        {
                            if(item.type === 'B')
                            {
                                if(
                                    _this.mappingResultObjectArray[i].type === item.type
                                    && _this.mappingResultObjectArray[i].position > item.position
                                )
                                {
                                    item.rightNeighbor = _this.mappingResultObjectArray[i];
                                    break;
                                }
                            }
                            else if(item.type === 'Y')
                            {
                                if(
                                    _this.mappingResultObjectArray[i].type === item.type
                                    && _this.mappingResultObjectArray[i].position < item.position
                                )
                                {
                                    item.leftNeighbor = _this.mappingResultObjectArray[i];
                                    break;
                                }
                            }
                        }

                        if(item.leftNeighbor !== undefined)
                        {
                            context.textAlign = "right";
                            let leftDiffValue = Math.abs(
                                Math.round(
                                    (
                                        item.key -
                                        item.leftNeighbor.key
                                    ) * 100
                                ) / 100
                            );

                            for(let count = isHighLightState === true ? 4 : 0; count < 5; count++)
                            {
                                context.fillText(
                                    item.leftNeighbor.label,
                                    barLeft_X - 4,
                                    trackTotalHeight - 48 - bottomLineHeight
                                );
                                context.fillText(
                                    leftDiffValue.toString(),
                                    barLeft_X - 4,
                                    trackTotalHeight - 40 - bottomLineHeight
                                );
                            }
                        }

                        if(item.rightNeighbor !== undefined)
                        {
                            context.textAlign = "left";
                            let RightDiffValue = Math.abs(
                                Math.round(
                                    (
                                        item.rightNeighbor.key -
                                        item.key
                                    ) * 100
                                ) / 100
                            );

                            for(let count = isHighLightState === true ? 4 : 0; count < 5; count++)
                            {
                                context.fillText(
                                    item.rightNeighbor.label,
                                    barLeft_X + 8,
                                    trackTotalHeight - 48 - bottomLineHeight
                                );
                                context.fillText(
                                    RightDiffValue.toString(),
                                    barLeft_X + 8,
                                    trackTotalHeight - 40 - bottomLineHeight
                                );
                            }
                        }

                        context.restore();
                    }

                    if(isHighLightState === true)
                    {
                        drawLeftAndRightDiff(true);
                        context.fillStyle = 'rgba(253, 121, 168, 0.3)';
                    }
                    else
                    {
                        drawLeftAndRightDiff(false);
                        // context.fillStyle = _this.config.histograms.color || '#fd79a8';
                        context.fillStyle = _this.config.histograms.color || 'rgba(253, 121, 168, 1)';
                    }

                    // Clear and draw histogram
                    context.clearRect(
                        barLeft_X,
                        barLeft_Y,
                        barWidth,
                        barHeight
                    );
                    context.fillRect(
                        barLeft_X,
                        barLeft_Y,
                        barWidth,
                        barHeight
                    );
                    context.restore();

                    if(item.label !== undefined && item.label != null)
                    {
                        // Draw arrow above the histogram column
                        _this._drawArrow(
                            context,
                            barLeft_X + 1,
                            // barLeft_Y - 70,
                            trackTotalHeight - 30 - histogramHeight - bottomLineHeight,
                            barLeft_X + 1,
                            barLeft_Y - 5
                        );
                        // Draw label above the arrow
                        // context.fillText(item.label,barLeft_X + 1, barLeft_Y - 75);

                        context.fillText(
                            item.label + '(+' + item.ionsNum + ')',
                            barLeft_X + 1,
                            trackTotalHeight - 35 - histogramHeight - bottomLineHeight
                        );

                        context.save();
                        context.fillStyle = '#2d3436';
                        context.font = "9px sans-serif";
                        // Draw value above the label
                        // context.fillText((Math.round(item.value * 100) / 100).toString(),
                        //     barLeft_X + 1, barLeft_Y - 85);
                        context.fillText('Int: ' + (Math.round(item.intensityValue * 100) / 100).toString(),
                            barLeft_X + 1, trackTotalHeight - 45 - histogramHeight - bottomLineHeight);
                        context.fillText('M/z: ' + (Math.round(item.mzValue * 100) / 100).toString(),
                            barLeft_X + 1, trackTotalHeight - 54 - histogramHeight - bottomLineHeight);
                        if(viewArgs.showMzValue)
                        {
                            // Draw key under the X-axis
                            context.fillStyle = '#7f8c8d';
                            context.fillText((Math.round(item.key * 100) / 100).toString(),
                                barLeft_X + 1, trackTotalHeight);
                        }
                        context.restore();
                    }
                },

                // Deprecated
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
                    ctx.fillStyle = _this.config.histograms.color || 'rgba(253, 121, 168, 1)';
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
                        max: maxValue / 0.45
                    };
                    this.height = trackTotalHeight - bottomLineHeight;

                    this.makeYScale(this.yscaleParams);
                }

            }
        );
    }
);
