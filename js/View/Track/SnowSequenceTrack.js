define(
    [
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/dom-construct',
        'dojo/dom-attr',
        'dojo/dom-class',
        'dojo/Deferred',
        'dojo/query',
        'dojo/topic',
        'dojo/request',
        'JBrowse/View/Track/Sequence',
        'JBrowse/View/TrackConfigEditor',
        'JBrowse/View/ConfirmDialog',
        'JBrowse/Util',
        '../Dialog/SnowAnnotationDialog'
    ],
    function(
        declare,
        dojoArray,
        dojoLang,
        domConstruct,
        domAttr,
        domClass,
        dojoDeferred,
        dojoQuery,
        dojoTopic,
        dojoRequest,
        Sequence,
        TrackConfigEditor,
        ConfirmDialog,
        Util,
        SnowAnnotationDialog
    )
    {
        return declare(
            [
                Sequence
            ],
            {
                constructor: function (args) {
                    let _this = this;
                    _this.blockObjectArray = [];
                    _this.proteoformScanIdArray = [];
                    window.snowSequenceTrack = _this;
                    window.debug_printSeq = function (refName, startPos, endPos) {
                        _this._printRefSeqAndConceptualTranslation(_this, refName, startPos, endPos)
                    };

                    // Subscribe draw proteoform event from module <SnowCanvasFeatures>
                    dojoTopic.subscribe(
                        'snow/showProteoform',
                        function(
                            proteoformSequence, proteoformStartPosition, proteoformEndPosition,
                            isReverseStrand, scanId, mSScanMassMappingResultArray
                        ){
                            _this._drawProteoformSequenceEventCallback(
                                proteoformSequence, proteoformStartPosition, proteoformEndPosition,
                                isReverseStrand, scanId, mSScanMassMappingResultArray, _this
                            );
                        }
                    );
                },

                _defaultConfig: function(){
                    var oldConfig = this.inherited(arguments);
                    var newConfig = dojoLang.mixin(
                        oldConfig,{
                            showTranslation1st: true,
                            showTranslation2nd: false,
                            showTranslation3rd: false,
                            showTranslationReverse1st: false,
                            showTranslationReverse2nd: false,
                            showTranslationReverse3rd: false,
                        });
                    newConfig.drawCircle = !!oldConfig.drawCircle || true;
                    newConfig.animationEnabled = !!oldConfig.animationEnabled || true;

                    return newConfig;
                },

                _trackMenuOptions: function() {
                    var _this = this;
                    // var oldTrackMenuOptions = _this.inherited(arguments);

                    var newTrackMenuOptions = [
                        {
                            label: 'About this track',
                            title: 'About track: '+(this.key||this.name),
                            iconClass: 'jbrowseIconHelp',
                            action: 'contentDialog',
                            content: dojoLang.hitch(this,'_trackDetailsContent')
                        },
                        {
                            label: 'Pin to top',
                            type: 'dijit/CheckedMenuItem',
                            title: "make this track always visible at the top of the view",
                            checked: _this.isPinned(),
                            onClick: function() {
                                _this.browser.publish( '/jbrowse/v1/v/tracks/'+( this.checked ? 'pin' : 'unpin' ), [ _this.name ] );
                            }
                        },
                        {
                            label: 'Edit config',
                            title: "edit this track's configuration",
                            iconClass: 'dijitIconConfigure',
                            action: function() {
                                new TrackConfigEditor( _this.config )
                                    .show( function( result ) {
                                        // replace this track's configuration
                                        _this.browser.publish( '/jbrowse/v1/v/tracks/replace', [result.conf] );
                                    });
                            }
                        },
                        {
                            label: 'Delete track',
                            title: "delete this track",
                            iconClass: 'dijitIconDelete',
                            action: function() {
                                new ConfirmDialog({ title: 'Delete track?', message: 'Really delete this track?' })
                                    .show( function( confirmed ) {
                                        if( confirmed )
                                            _this.browser.publish( '/jbrowse/v1/v/tracks/delete', [_this.config] );
                                    });
                            }
                        },
                        {
                            type: 'dijit/MenuSeparator'
                        },
                        {
                            label: 'Show AminoAcid Translation F1',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!_this.config.showTranslation1st,
                            onClick: function(event){
                                _this.config.showTranslation1st = this.checked;
                                _this.changed();
                            }
                        },
                        {
                            label: 'Show AminoAcid Translation F2',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!_this.config.showTranslation2nd,
                            onClick: function(event){
                                _this.config.showTranslation2nd = this.checked;
                                _this.changed();
                            }
                        },
                        {
                            label: 'Show AminoAcid Translation F3',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!_this.config.showTranslation3rd,
                            onClick: function(event){
                                _this.config.showTranslation3rd = this.checked;
                                _this.changed();
                            }
                        },
                        {
                            label: 'Show AminoAcid Translation R1',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!_this.config.showTranslationReverse1st,
                            onClick: function(event){
                                _this.config.showTranslationReverse1st = this.checked;
                                _this.changed();
                            }
                        },
                        {
                            label: 'Show AminoAcid Translation R2',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!_this.config.showTranslationReverse2nd,
                            onClick: function(event){
                                _this.config.showTranslationReverse2nd = this.checked;
                                _this.changed();
                            }
                        },
                        {
                            label: 'Show AminoAcid Translation R3',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!_this.config.showTranslationReverse3rd,
                            onClick: function(event){
                                _this.config.showTranslationReverse3rd = this.checked;
                                _this.changed();
                            }
                        },
                        {
                            type: 'dijit/MenuSeparator'
                        },
                        {
                            label: 'Draw Spans with Circle-Style',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!_this.config.drawCircle,
                            onClick: function (event) {
                                _this.config.drawCircle = this.checked;
                                //that.changed();
                                //console.log(dojoQuery('.Snow_aminoAcid_circle'));
                                if(!!_this.config.drawCircle) {
                                    dojoQuery('.Snow_translatedSequence td.Snow_aminoAcid')
                                        .toggleClass('Snow_aminoAcid_circle',true);
                                }
                                else {
                                    dojoQuery('.Snow_translatedSequence td.Snow_aminoAcid_circle')
                                        .removeClass('Snow_aminoAcid_circle');
                                }
                            }
                        },
                        {
                            label: 'Enable Hover Animation',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!_this.config.animationEnabled,
                            onClick: function (event) {
                                _this.config.animationEnabled = this.checked;
                                //that.changed();
                                if(!!_this.config.animationEnabled) {
                                    dojoQuery('.Snow_translatedSequence td.Snow_aminoAcid')
                                        .toggleClass('Snow_aminoAcid_animation',true);
                                }
                                else {
                                    dojoQuery('.Snow_translatedSequence td.Snow_aminoAcid_animation')
                                        .removeClass('Snow_aminoAcid_animation');
                                }
                            }
                        }
                    ];

                    return newTrackMenuOptions;
                },

                _drawProteoformSequenceEventCallback: function(
                    proteoformSequence, proteoformStartPosition, proteoformEndPosition,
                    isReverseStrand, scanId, mSScanMassMappingResultArray, _this
                ){
                    // 2019-08-16: New implementation:
                    // if(_this.proteoformScanIdArray.hasOwnProperty(scanId) && _this.proteoformScanIdArray[scanId] === true)
                    // {
                    //     return;
                    // }
                    _this.proteoformScanIdArray[scanId] = true;
                    dojoQuery('.snow_proteoform_frame.scan_' + scanId).forEach(domConstruct.destroy);

                    const lengthPerAminoAcidCharacter = 3;
                    let snowSequenceTrackBlocks = _this.blocks;
                    let detailArrayOfProteoformSequence = [];
                    let aminoAcidCharacterCount = 0;

                    for(let index = 0; index < proteoformSequence.length; index++)
                    {
                        let currentAminoAcidDetail = {
                            id: undefined,
                            isEmpty: false,
                            isReverse: isReverseStrand,
                            scan: scanId,
                            headOrTailFlag: undefined,
                            leftPosition: undefined,
                            aminoAcidCharacter: undefined,
                            bIonFlag: undefined,
                            yIonFlag: undefined,
                            modification: undefined,
                        };

                        if(proteoformSequence.charAt(index) !== '[' && proteoformSequence.charAt(index) !== ']')
                        {
                            currentAminoAcidDetail.id = aminoAcidCharacterCount;
                            currentAminoAcidDetail.headOrTailFlag = index === 0 ? 'HEAD' : '';
                            currentAminoAcidDetail.headOrTailFlag += index === proteoformSequence.length - 1 ? 'TAIL' : '';
                            currentAminoAcidDetail.leftPosition = proteoformStartPosition + lengthPerAminoAcidCharacter * aminoAcidCharacterCount;
                            currentAminoAcidDetail.aminoAcidCharacter = proteoformSequence.charAt(index);
                            for(let i = 0; i < mSScanMassMappingResultArray.length; i++)
                            {
                                if(mSScanMassMappingResultArray[i].position === aminoAcidCharacterCount)
                                {
                                    currentAminoAcidDetail.bIonFlag = mSScanMassMappingResultArray[i].label;
                                    break;
                                }
                            }
                            detailArrayOfProteoformSequence.push(currentAminoAcidDetail);
                            aminoAcidCharacterCount ++;
                        }
                        else
                        {
                            // Modification
                            if(detailArrayOfProteoformSequence.length <= 0)
                            {
                                continue;
                            }
                            currentAminoAcidDetail = detailArrayOfProteoformSequence[detailArrayOfProteoformSequence.length - 1];
                            let modificationType = "";
                            for(index++; index < proteoformSequence.length; index++)
                            {
                                if(proteoformSequence.charAt(index) !== '[' && proteoformSequence.charAt(index) !== ']')
                                {
                                    modificationType += proteoformSequence.charAt(index);
                                }
                                else
                                {
                                    detailArrayOfProteoformSequence[detailArrayOfProteoformSequence.length - 1].modification =
                                        modificationType;
                                    break;
                                }
                            }
                        }

                    }


                    let firstAttachedBlockIndex = _this.firstAttached;
                    let lastAttachedBlockIndex = _this.lastAttached;
                    for(let blockIndex in snowSequenceTrackBlocks)
                    {
                        if( snowSequenceTrackBlocks.hasOwnProperty(blockIndex)
                            && typeof snowSequenceTrackBlocks[blockIndex] == "object" )
                        {
                            // Currently visible block
                            let blockStartBase = snowSequenceTrackBlocks[blockIndex].startBase;
                            let blockEndBase = snowSequenceTrackBlocks[blockIndex].endBase;
                            let blockOffsetStartBase = blockStartBase - (blockStartBase % 3);
                            let blockOffsetEndBase = blockEndBase - (blockEndBase % 3);
                            let blockBpLength = blockOffsetEndBase - blockOffsetStartBase;
                            let aminoAcidCharactersPerBlock = (blockOffsetEndBase - blockOffsetStartBase) / lengthPerAminoAcidCharacter;
                            let detailArrayOfProteoformInThisBlock = [];

                            for(let index in detailArrayOfProteoformSequence)
                            {
                                if(
                                    detailArrayOfProteoformSequence.hasOwnProperty(index) &&
                                    typeof detailArrayOfProteoformSequence[index] == "object" &&
                                    detailArrayOfProteoformSequence[index].leftPosition >= blockOffsetStartBase &&
                                    detailArrayOfProteoformSequence[index].leftPosition < blockOffsetEndBase
                                )
                                {
                                    detailArrayOfProteoformInThisBlock.push(detailArrayOfProteoformSequence[index]);
                                }
                            }

                            if(
                                detailArrayOfProteoformInThisBlock.length - aminoAcidCharactersPerBlock <= -1
                            )
                            {
                                let emptyAminoAcidDetail = {
                                    id: undefined,
                                    isEmpty: true,
                                    isReverse: undefined,
                                    scan: undefined,
                                    headOrTailFlag: undefined,
                                    leftPosition: undefined,
                                    aminoAcidCharacter: undefined,
                                    bIonFlag: undefined,
                                    yIonFlag: undefined,
                                    modification: undefined
                                };
                                if(detailArrayOfProteoformInThisBlock.length > 0)
                                {
                                    detailArrayOfProteoformInThisBlock.every(
                                        function (detailItem) {
                                            if(detailItem.headOrTailFlag === 'TAIL')
                                            {
                                                // Append to tail
                                                while(detailArrayOfProteoformInThisBlock.length < aminoAcidCharactersPerBlock)
                                                {
                                                    detailArrayOfProteoformInThisBlock.push(emptyAminoAcidDetail);
                                                }
                                                return false;
                                            }
                                            else if(detailItem.headOrTailFlag === 'HEAD')
                                            {
                                                // Prepend to head
                                                while(detailArrayOfProteoformInThisBlock.length < aminoAcidCharactersPerBlock)
                                                {
                                                    detailArrayOfProteoformInThisBlock.unshift(emptyAminoAcidDetail);
                                                }
                                                return false;
                                            }
                                        }
                                    );

                                }
                                else
                                {
                                    console.error('detailArrayOfProteoformInThisBlock is Empty!', blockIndex, detailArrayOfProteoformInThisBlock);
                                    while(detailArrayOfProteoformInThisBlock.length < aminoAcidCharactersPerBlock)
                                    {
                                        detailArrayOfProteoformInThisBlock.push(emptyAminoAcidDetail);
                                    }
                                }
                            }

                            // Start rendering proteoform sequence
                            let newProteoformSequenceDiv = _this._renderProteoformSequence(
                                detailArrayOfProteoformInThisBlock, proteoformStartPosition, proteoformEndPosition,
                                0, blockOffsetStartBase, blockOffsetEndBase, blockBpLength,
                                snowSequenceTrackBlocks[blockIndex].scale
                            );
                            domClass.add( newProteoformSequenceDiv, "snow_proteoform_frame");
                            domClass.add( newProteoformSequenceDiv, "scan_" + scanId);
                            snowSequenceTrackBlocks[blockIndex].domNode.appendChild(newProteoformSequenceDiv);

                            let totalHeight = 0;
                            dojoArray.forEach(
                                snowSequenceTrackBlocks[blockIndex].domNode.childNodes,
                                function( table ) {
                                    totalHeight += (table.clientHeight || table.offsetHeight);
                                }
                            );
                            _this.heightUpdate( totalHeight, blockIndex );

                        }
                    }


                    // Old implementation
                    // console.info('snow/showProteoform received:',
                    //     proteoformSequence, filteredMSScanMassMappingResultArray,
                    //     proteoformStartPosition, proteoformEndPosition, block
                    // );
                    // console.info('corresponding block in SnowSequenceTrack:',
                    //     _this.blockObjectArray[block.blockIndex]);
                    //
                    // if( _this.blockObjectArray[block.blockIndex] === undefined ||
                    //     _this.blockObjectArray[block.blockIndex].startBase !== block.startBase ||
                    //     _this.blockObjectArray[block.blockIndex].endBase !== block.endBase
                    // )
                    // {
                    //     console.error('Block do not match!');
                    //     return;
                    // }
                    //
                    // let blockLengthPerSequenceCharacter =
                    //     (proteoformEndPosition - proteoformStartPosition) / proteoformSequence.length;
                    // let startOffset = (block.startBase - proteoformStartPosition) / blockLengthPerSequenceCharacter;
                    // let endOffset = (proteoformEndPosition - block.endBase) / blockLengthPerSequenceCharacter;
                    // let proteoformSequenceOfCurrentBlock =
                    //     proteoformSequence.substring(
                    //         Math.round(startOffset),
                    //         Math.round(proteoformSequence.length - endOffset)
                    //     );
                    //
                    // let modificationPositionArray = [];
                    // for(let i=0; i<filteredMSScanMassMappingResultArray.length; i++)
                    // {
                    //     if(filteredMSScanMassMappingResultArray[i].hasOwnProperty('position'))
                    //     {
                    //         modificationPositionArray.push(
                    //             filteredMSScanMassMappingResultArray[i].position - Math.round(startOffset)
                    //         );
                    //     }
                    // }
                    //
                    // let newProteoformSequenceDiv = _this._renderProteoformSequence(
                    //     proteoformSequenceOfCurrentBlock,
                    //     0,
                    //     _this.blockObjectArray[block.blockIndex].startBase,
                    //     _this.blockObjectArray[block.blockIndex].endBase,
                    //     _this.blockObjectArray[block.blockIndex].endBase - _this.blockObjectArray[block.blockIndex].startBase,
                    //     _this.blockObjectArray[block.blockIndex].scale,
                    //     modificationPositionArray
                    // );
                    // domClass.add( newProteoformSequenceDiv, "snow_proteoform_frame" );
                    // _this.blockObjectArray[block.blockIndex].domNode.appendChild(newProteoformSequenceDiv);
                    //
                    // let totalHeight = 0;
                    // dojoArray.forEach(
                    //     _this.blockObjectArray[block.blockIndex].domNode.childNodes,
                    //     function( table ) {
                    //         totalHeight += (table.clientHeight || table.offsetHeight);
                    //     }
                    // );
                    // this.heightUpdate( totalHeight, block.blockIndex );
                },

                fillBlock: function(args) {
                    var _this = this;
                    var blockIndex = args.blockIndex;
                    var blockObject = args.block;
                    var leftBase = args.leftBase;
                    var rightBase = args.rightBase;
                    var scale = args.scale;
                    var leftExtended = leftBase - 2;
                    var rightExtended = rightBase + 2;
                    _this.blockObjectArray[blockIndex] = blockObject;
                    var renderAnnotationMarkDeferred = new dojoDeferred();

                    renderAnnotationMarkDeferred.then(
                        function () {
                            _this._renderAnnotationMark(
                                _this.refSeq.name,
                                blockObject,
                                leftBase,
                                rightBase
                            );
                        }
                    );
                    var blur = domConstruct.create(
                        'div',
                        {
                            className: 'sequence_blur',
                            innerHTML: '<span class="loading">Loading</span>'
                        },
                        blockObject.domNode
                    );

                    this.heightUpdate( blur.offsetHeight+2*blur.offsetTop, blockIndex );

                    // if we are zoomed in far enough to draw bases, then draw them
                    if ( scale >= 1.3 )
                    {
                        this.store.getReferenceSequence(
                            {
                                ref: this.refSeq.name,
                                start: leftExtended,
                                end: rightExtended
                            },
                            function( seq ) {
                                if(seq.trim() === ""){
                                    blur.innerHTML = '<span class="zoom">No sequence available</span>';
                                }
                                else {
                                    domConstruct.empty( blockObject.domNode );
                                    _this._fillSequenceBlock( blockObject, blockIndex, scale, seq );
                                    renderAnnotationMarkDeferred.resolve(true);
                                }
                                args.finishCallback();
                            },
                            function(error) {
                                if (args.errorCallback)
                                    args.errorCallback(error);
                                else {
                                    console.error(error);
                                    args.finishCallback()
                                }
                            }
                        );
                    }
                    else
                    {
                        blur.innerHTML = '<span class="zoom">Zoom in to see sequence</span>';
                        args.finishCallback();
                    }
                },

                _fillSequenceBlock: function( block, blockIndex, scale, seq ) {
                    seq = seq.replace(/\s/g,this.nbsp);
                    var blockStart = block.startBase;
                    var blockEnd = block.endBase;
                    var blockSeq = seq.substring( 2, seq.length - 2 );
                    var blockLength = blockSeq.length;

                    var extStart = blockStart-2;
                    var extEnd = blockStart+2;
                    var leftover = (seq.length - 2) % 3;
                    var extStartSeq = seq.substring( 0, seq.length - 2 );
                    var extEndSeq = seq.substring( 2 );

                    var translationToShow = [
                        this.config.showTranslation1st,
                        this.config.showTranslation2nd,
                        this.config.showTranslation3rd,
                        //].reverse();
                        this.config.showTranslationReverse1st,
                        this.config.showTranslationReverse2nd,
                        this.config.showTranslationReverse3rd
                    ];

                    // Render forward strand translation
                    if( translationToShow[0] || translationToShow[1] || translationToShow[2] )
                    {
                        //if( this.config.showForwardStrand && this.config.showTranslation ) {

                        var frameDiv = [];
                        // array.forEach(translationToShow,function(configItem, i){
                        //         if(!!configItem)
                        //         {
                        //             var transStart = blockStart + i;
                        //             var frame = (transStart % 3 + 3) % 3;
                        //             var translatedDiv = this._renderTranslation( extEndSeq, i, blockStart, blockEnd, blockLength, scale );
                        //             frameDiv[frame] = translatedDiv;
                        //             domClass.add( translatedDiv, "frame" + frame );
                        //         }
                        // }, this);
                        // for(var i = 0; i < 3; i++)
                        // {
                        //     if(translationToShow[i])
                        //     {
                        //         var transStart = blockStart + i;
                        //         var frame = (transStart % 3 + 3) % 3;
                        //         var translatedDiv = this._renderTranslation( extEndSeq, i, blockStart, blockEnd, blockLength, scale );
                        //         frameDiv[frame] = translatedDiv;
                        //         domClass.add( translatedDiv, "frame" + frame );
                        //     }
                        // }
                        // Code above cannot work properly

                        for( var i = 0; i < 3; i++ ) {
                            var transStart = blockStart + i;
                            var frame = (transStart % 3 + 3) % 3;
                            var translatedDiv = this._renderTranslation( extEndSeq, i, blockStart, blockEnd, blockLength, scale );
                            frameDiv[frame] = translatedDiv;
                            domClass.add( translatedDiv, "frame" + frame );
                        }

                        for( var i = 2; i >= 0; i-- ) {
                            if(translationToShow[i])
                            {
                                block.domNode.appendChild( frameDiv[i] );
                            }
                            else
                            {
                                domConstruct.destroy( frameDiv[i] );
                            }
                        }
                    }

                    // Render forward strand sequence
                    // if( false )
                    // {
                    //     // make a table to contain the sequences
                    //     var charSize = this.getCharacterMeasurements('sequence');
                    //     var bigTiles = scale > charSize.w + 4; // whether to add .big styles to the base tiles
                    //     var seqNode;
                    //     if( this.config.showReverseStrand || this.config.showForwardStrand )
                    //         seqNode = domConstruct.create(
                    //             "table", {
                    //                 className: "sequence" + (bigTiles ? ' big' : '') + (this.config.showColor ? '' : ' nocolor'),
                    //                 style: { width: "100%" }
                    //             }, block.domNode);
                    //
                    //     // add a table for the forward strand
                    //     if( this.config.showForwardStrand )
                    //         seqNode.appendChild( this._renderSeqTr( blockStart, blockEnd, blockSeq, scale ));
                    // }
                    // Do not render reverse strand sequence and translation
                    if( true )
                    {
                        // // and one for the reverse strand
                        // // if( this.config.showReverseStrand ) {
                        // var comp = this._renderSeqTr( blockStart, blockEnd, Util.complement(blockSeq), scale );
                        // comp.className = 'revcom';
                        // seqNode.appendChild( comp );

                        if( translationToShow[3] || translationToShow[4] || translationToShow[5] )
                        {
                            // if( this.config.showTranslation ) {
                            var frameDiv = [];
                            for(var i = 0; i < 3; i++) {
                                var transStart = blockStart + 1 - i;
                                var frame = (transStart % 3 + 3 + leftover) % 3;
                                var translatedDiv = this._renderTranslation( extStartSeq, i, blockStart, blockEnd, blockLength, scale, true );
                                frameDiv[frame] = translatedDiv;
                                domClass.add( translatedDiv, "frame" + frame );
                            }
                            for( var i = 0; i < 3; i++ ) {
                                if(translationToShow[ 3 + i ])
                                {
                                    block.domNode.appendChild( frameDiv[i] );
                                }
                                else
                                {
                                    domConstruct.destroy( frameDiv[i] );
                                }
                            }
                        }
                    }

                    var totalHeight = 0;
                    dojoArray.forEach( block.domNode.childNodes, function( table ) {
                        totalHeight += (table.clientHeight || table.offsetHeight);
                    });
                    this.heightUpdate( totalHeight, blockIndex );
                },

                _renderTranslation: function(
                    seq, offset, blockStart,
                    blockEnd, blockLength, scale, reverse
                ) {
                    seq = reverse ? Util.revcom( seq ) : seq;

                    var extraBases = (seq.length - offset) % 3;
                    var seqSliced = seq.slice( offset, seq.length - extraBases );

                    // Object describe how to mark the aminoAcid
                    // var aminoAcidMarks = {
                    //     index: [0,1],
                    //     type: [
                    //         //        "Snow_aminoAcid_mark_left_top",
                    //         "Snow_aminoAcid_mark_left_bottom",
                    //         "Snow_aminoAcid_mark_right_top"
                    //         //        ,"Snow_aminoAcid_mark_right_bottom"
                    //     ]
                    // };

                    var translated = "";
                    for( var i = 0; i < seqSliced.length; i += 3 ) {
                        var nextCodon = seqSliced.slice(i, i + 3);
                        var aminoAcid = this._codonTable[nextCodon] || this.nbsp;
                        translated += aminoAcid;
                    }

                    translated = reverse ? translated.split("").reverse().join("") : translated; // Flip the translated seq for left-to-right rendering
                    var orientedSeqSliced = reverse ? seqSliced.split("").reverse().join("") : seqSliced;

                    var charSize = this.getCharacterMeasurements("aminoAcid");
                    var bigTiles = scale > charSize.w + 4; // whether to add .big styles to the base tiles

                    var charWidth = 100/(blockLength / 3);

                    var container = domConstruct.create(
                        'div',
                        {
                            className: 'Snow_translatedSequence'
                        } );

                    var tableWidthPercent = charWidth * translated.length;
                    var table  = domConstruct.create('table',
                        {
                            className: 'Snow_translatedSequence offset'+offset+(bigTiles ? ' big' : ''),
                            style:
                                {
                                    width: tableWidthPercent + "%"
                                }
                        }, container
                    );
                    var tr = domConstruct.create('tr', {}, table );

                    var tableLeftOffsetPercent = reverse ? 100 - charWidth * (translated.length + offset / 3)
                        : charWidth*offset/3;
                    table.style.left = tableLeftOffsetPercent + "%";
                    container.snowSequenceOffset = tableLeftOffsetPercent;
                    container.snowSequenceWidth = tableWidthPercent;
                    var blockRegion = blockEnd - blockStart;
                    var blockStartExtended = blockStart + blockRegion * tableLeftOffsetPercent * 0.01;
                    var blockEndExtended = blockStart + translated.length * 3;

                    var blockWidth = blockLength * scale;
                    var tableWidthScale = 100 / (charWidth * translated.length);
                    var tableActualWidth = blockWidth / tableWidthScale;
                    var spanActualWidth = (tableActualWidth - translated.length) / translated.length;
                    // Need to minus the space between each two span (border-spacing: 1px)
                    // console.log('blockWidth: ' + blockWidth);
                    // console.log('tableWidthScale: ' + tableWidthScale);
                    // console.log('tableActualWidth: ' + tableActualWidth);
                    // console.log('spanActualWidth: ' + spanActualWidth);

                    charWidth = 100/ translated.length + "%";

                    var drawChars = scale >= charSize.w;
                    if( drawChars )
                        table.className += ' big';

                    for( var i = 0; i < translated.length; i++ ) {
                        // var aminoAcidSpan = document.createElement('td');
                        var aminoAcidSpan = domConstruct.create(
                            'td',
                            {
                                snowSeqPosition: blockStartExtended + i * 3
                            },
                            tr
                        );
                        var originalCodon = orientedSeqSliced.slice(3 * i, 3 * i + 3);
                        originalCodon = reverse ? originalCodon.split("").reverse().join("") : originalCodon;
                        aminoAcidSpan.className = 'Snow_aminoAcid Snow_aminoAcid_'+translated.charAt(i).toLowerCase();

                        // However, if it's known to be a start/stop, apply those CSS classes instead.
                        if (this._codonStarts.indexOf(originalCodon.toUpperCase()) !== -1) {
                            aminoAcidSpan.className = 'Snow_aminoAcid Snow_aminoAcid_start';
                        }
                        else if (this._codonStops.indexOf(originalCodon.toUpperCase()) !== -1) {
                            aminoAcidSpan.className = 'Snow_aminoAcid Snow_aminoAcid_stop';
                        }

                        if(this.config.drawCircle)
                        {
                            aminoAcidSpan.className += ' Snow_aminoAcid_circle';
                        }
                        if(this.config.animationEnabled)
                        {
                            aminoAcidSpan.className += ' Snow_aminoAcid_animation';
                        }

                        // Mark AminoAcid according to the Object 'aminoAcidMarks'
                        // if (aminoAcidMarks.index.indexOf(i) != -1)
                        // Test: random mark
                        // if(Math.random() > 0.75)
                        // {
                        //     //aminoAcidSpan.className = 'Snow_aminoAcid ' + aminoAcidMarks.type[i];
                        //     aminoAcidSpan.className += ' ' + aminoAcidMarks.type[i%2];
                        // }

                        // Finished: Update height and padding as well, not only the width
                        aminoAcidSpan.style.width = charWidth;
                        // Set height equals to width
                        aminoAcidSpan.style.height = spanActualWidth + 'px';
                        if( drawChars ) {
                            aminoAcidSpan.innerHTML = translated.charAt( i );
                        }
                        tr.appendChild(aminoAcidSpan);
                    }
                    return container;
                },

                _renderProteoformSequence: function(
                    detailArrayOfProteoformInThisBlock, proteoformStartPosition, proteoformEndPosition,
                    offset, blockStart, blockEnd,
                    blockLength, scale
                ){
                    var proteoformArrayLength = detailArrayOfProteoformInThisBlock.length;
                    var charSize = this.getCharacterMeasurements("aminoAcid");
                    var bigTiles = scale > charSize.w + 4; // whether to add .big styles to the base tiles
                    var charWidth = 100 / (proteoformArrayLength / 3);

                    var container = domConstruct.create(
                        'div',
                        {
                            className: 'Snow_translatedSequence'
                        }
                    );

                    var tableWidthPercent = (charWidth * detailArrayOfProteoformInThisBlock.length);
                    tableWidthPercent = tableWidthPercent <= 100 ? tableWidthPercent : 100;
                    var table  = domConstruct.create('table',
                        {
                            className: 'Snow_translatedSequence offset'+offset+(bigTiles ? ' big' : ''),
                            style:
                                {
                                    // width: (charWidth * proteoformSequence.length) + "%"
                                    width: tableWidthPercent + '%'
                                }
                        },
                        container
                    );
                    var tr = domConstruct.create('tr', {}, table );
                    table.style.left = (charWidth * offset / 3) + "%";

                    var blockWidth = blockLength * scale;
                    // var tableWidthScale = 100 / (charWidth * proteoformSequence.length);
                    // var tableActualWidth = blockWidth / tableWidthScale;
                    // var spanActualWidth = (tableActualWidth - proteoformSequence.length) / proteoformSequence.length;
                    var aminoAcidTableCellActualWidth = blockWidth * (tableWidthPercent * 0.01) / (blockLength / 3);

                    charWidth = 100 / detailArrayOfProteoformInThisBlock.length + "%";
                    var drawChars = scale >= charSize.w;
                    if( drawChars )
                        table.className += ' big';

                    for( var index = 0; index < detailArrayOfProteoformInThisBlock.length; index++ ) {
                        var aminoAcidSpan = document.createElement('td');
                        aminoAcidSpan.style.width = charWidth;
                        aminoAcidSpan.style.height = aminoAcidTableCellActualWidth + 'px';

                        if(
                            typeof detailArrayOfProteoformInThisBlock[index] == "object" &&
                            detailArrayOfProteoformInThisBlock[index].isEmpty !== true &&
                            detailArrayOfProteoformInThisBlock[index].aminoAcidCharacter !== undefined
                        )
                        {
                            aminoAcidSpan.className = 'Snow_aminoAcid Snow_aminoAcid_' +
                                detailArrayOfProteoformInThisBlock[index].aminoAcidCharacter.toLowerCase();
                            if( drawChars ) {
                                aminoAcidSpan.innerHTML = detailArrayOfProteoformInThisBlock[index].aminoAcidCharacter;
                            }
                            if(this.config.drawCircle)
                            {
                                aminoAcidSpan.className += ' Snow_aminoAcid_circle';
                            }
                            if(this.config.animationEnabled)
                            {
                                aminoAcidSpan.className += ' Snow_aminoAcid_animation';
                            }
                            if(detailArrayOfProteoformInThisBlock[index].bIonFlag !== undefined)
                            {
                                aminoAcidSpan.className += ' Snow_aminoAcid_mark_right_top';
                            }
                            if(detailArrayOfProteoformInThisBlock[index].modification !== undefined)
                            {
                                console.log('Todo: draw modification', detailArrayOfProteoformInThisBlock[index]);
                            }

                            if(detailArrayOfProteoformInThisBlock[index].headOrTailFlag.includes('HEAD'))
                            {
                                let strandSpanAtHead = domConstruct.create('span',
                                    {
                                        className: 'Snow_aminoAcid_head_strand_label',
                                        style: {},
                                        innerHTML: detailArrayOfProteoformInThisBlock[index].isReverse ? '-' : '+'
                                    }
                                );
                                aminoAcidSpan.appendChild(strandSpanAtHead);
                            }
                            else if(detailArrayOfProteoformInThisBlock[index].headOrTailFlag.includes('TAIL'))
                            {
                                let strandSpanAtTail = domConstruct.create('span',
                                    {
                                        className: 'Snow_aminoAcid_tail_strand_label',
                                        style: {},
                                        innerHTML: detailArrayOfProteoformInThisBlock[index].isReverse ? '-' : '+'
                                    }
                                );
                                aminoAcidSpan.appendChild(strandSpanAtTail);
                            }

                        }

                        tr.appendChild(aminoAcidSpan);
                    }
                    return container;
                },

                // Deprecated
                _renderProteoformSequence_Old: function(
                    proteoformSequence, offset,
                    blockStart, blockEnd,
                    blockLength, scale, modificationPositionArray
                ){
                    var charSize = this.getCharacterMeasurements("aminoAcid");
                    var bigTiles = scale > charSize.w + 4; // whether to add .big styles to the base tiles
                    var charWidth = 100 / (blockLength / 3);

                    var container = domConstruct.create(
                        'div',
                        {
                            className: 'Snow_translatedSequence'
                        }
                    );

                    var tableWidthPercent = (charWidth * proteoformSequence.length);
                    tableWidthPercent = tableWidthPercent <= 100 ? tableWidthPercent : 100;
                    var table  = domConstruct.create('table',
                        {
                            className: 'Snow_translatedSequence offset'+offset+(bigTiles ? ' big' : ''),
                            style:
                                {
                                    // width: (charWidth * proteoformSequence.length) + "%"
                                    width: tableWidthPercent + '%'
                                }
                        },
                        container
                    );
                    var tr = domConstruct.create('tr', {}, table );
                    table.style.left = (charWidth*offset/3) + "%";

                    var blockWidth = blockLength * scale;
                    // var tableWidthScale = 100 / (charWidth * proteoformSequence.length);
                    // var tableActualWidth = blockWidth / tableWidthScale;
                    // var spanActualWidth = (tableActualWidth - proteoformSequence.length) / proteoformSequence.length;
                    var spanActualWidth = blockWidth * (tableWidthPercent * 0.01) / proteoformSequence.length;


                    charWidth = 100 / proteoformSequence.length + "%";

                    var drawChars = scale >= charSize.w;
                    if( drawChars )
                        table.className += ' big';

                    for( var i=0; i<proteoformSequence.length; i++ ) {
                        var aminoAcidSpan = document.createElement('td');
                        aminoAcidSpan.className = 'Snow_aminoAcid Snow_aminoAcid_'+proteoformSequence.charAt(i).toLowerCase();

                        if(this.config.drawCircle)
                        {
                            aminoAcidSpan.className += ' Snow_aminoAcid_circle';
                        }
                        if(this.config.animationEnabled)
                        {
                            aminoAcidSpan.className += ' Snow_aminoAcid_animation';
                        }
                        // Modification mark
                        if(modificationPositionArray.indexOf(i) !== -1)
                        {
                            aminoAcidSpan.className += ' Snow_aminoAcid_mark_right_top';
                        }

                        aminoAcidSpan.style.width = charWidth;
                        aminoAcidSpan.style.height = spanActualWidth + 'px';
                        if( drawChars ) {
                            aminoAcidSpan.innerHTML = proteoformSequence.charAt( i );
                        }
                        tr.appendChild(aminoAcidSpan);
                    }
                    return container;
                },

                _renderAnnotationMark: function (refName, blockObject, blockStart, blockEnd) {
                    console.debug('_renderAnnotationMark', refName, blockObject, blockStart, blockEnd);

                    var _this = this;
                    var renderAnnotationDeferred = new dojoDeferred();
                    var blockDomNode = blockObject.domNode;
                    var frameDomNode = blockDomNode.firstChild;
                    var allAminoAcidCell = dojoQuery(".Snow_aminoAcid", frameDomNode);
                    // Add dblclick event handler on all AmioAcid table cell
                    allAminoAcidCell.on('dblclick', function (event) {
                            console.debug('dblclick on .Snow_aminoAcid:', arguments);
                            var finishCallback = function () {
                                domClass.add(event.target, 'Snow_annotation_mark');
                            };
                            var thisAminoAcidCellPosition = domAttr.get(event.target, 'snowseqposition');

                            // dojoLang.hitch(
                            //     _this,
                            //     _this._loadSpecificAnnotationAndPopupModal,
                            //     refName,
                            //     thisAminoAcidCellPosition,
                            //     finishCallback
                            // );

                            _this._loadSpecificAnnotationAndPopupModal(
                                refName,
                                thisAminoAcidCellPosition,
                                finishCallback
                            );
                        }
                    );

                    var blockRegion = blockEnd - blockStart;
                    var blockStartExtended = blockStart + blockRegion * frameDomNode.snowSequenceOffset * 0.01;
                    var blockEndExtended = blockStart + allAminoAcidCell.length * 3;
                    var requestUrl = 'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1')
                        + ':12080' + '/annotation/query/' + refName + '/' + blockStartExtended + '..' + blockEndExtended;

                    dojoRequest(
                        requestUrl,
                        {
                            method: 'GET',
                            headers: {
                                'X-Requested-With': null
                            },
                            handleAs: 'json'
                        }
                    ).then(
                        function (annotationObjectArray) {
                            console.info('annotationObjectArray:', annotationObjectArray);
                            renderAnnotationDeferred.resolve(annotationObjectArray);
                        },
                        function (errorReason) {
                            console.error('Error', requestUrl, errorReason);
                        }
                    );

                    renderAnnotationDeferred.then(
                        function (annotationObjectArray) {
                            for(var i=0; i<allAminoAcidCell.length; i++)
                            {
                                var thisCellPosition = domAttr.get(allAminoAcidCell[i], 'snowseqposition');
                                for(var j=0; j<annotationObjectArray.length; j++)
                                {
                                    if(typeof annotationObjectArray[j] != "object")
                                    {
                                        console.error(annotationObjectArray[j]);
                                        break;
                                    }
                                    var thisAnnotationPosition = annotationObjectArray[j].position;
                                    if(Math.abs(thisCellPosition - thisAnnotationPosition) <= 2)
                                    {
                                        // Match! Add style
                                        domClass.add(allAminoAcidCell[i], 'Snow_annotation_mark');
                                    }
                                }
                            }
                        },
                        function (errorReason) {
                        }
                    )

                },

                _loadSpecificAnnotationAndPopupModal: function (name, position, finishCallback) {
                    var requestUrl = 'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1')
                        + ':12080' + '/annotation/query/' + name + '/' + position + '..' + position;

                    dojoRequest(
                        requestUrl,
                        {
                            method: 'GET',
                            headers: {
                                'X-Requested-With': null
                            },
                            handleAs: 'json'
                        }
                    ).then(
                        function (annotationObjectArray) {
                            console.info('annotationObjectArray:', annotationObjectArray);
                            var annotationDialog = new SnowAnnotationDialog(
                                {
                                    refName: name,
                                    position: position,
                                    annotationObjectArray: annotationObjectArray,
                                    browser: this.browser,
                                    setCallback: function () {
                                        // Make sure the annotation is successfully inserted
                                        dojoRequest(
                                            requestUrl,
                                            {
                                                method: 'GET',
                                                headers: {
                                                    'X-Requested-With': null
                                                },
                                                handleAs: 'json'
                                            }
                                        ).then(
                                            function (annotationObjectArray) {
                                                if(typeof annotationObjectArray == "object" && annotationObjectArray.length > 0)
                                                {
                                                    finishCallback();
                                                }
                                            }
                                        );

                                    }
                                }
                            );
                            annotationDialog.show();

                        },
                        function (errorReason) {
                            console.error('Error', requestUrl, errorReason);
                        }
                    );
                },

                _getTranslationSequence: function(
                    _this, sequence, offset, reverse
                ) {
                    sequence = reverse ? Util.revcom( sequence ) : sequence;

                    var extraBases = (sequence.length - offset) % 3;
                    var seqSliced = sequence.slice( offset, sequence.length - extraBases );

                    var translated = "";
                    for( var i = 0; i < seqSliced.length; i += 3 ) {
                        var nextCodon = seqSliced.slice(i, i + 3);
                        var aminoAcid = _this._codonTable[nextCodon] || _this.nbsp;
                        translated += aminoAcid;
                    }
                    translated = reverse ? translated.split("").reverse().join("") : translated;
                    return translated;
                },

                _printRefSeqAndConceptualTranslation: function (_this, refName, startPos, endPos) {
                    _this.store.getReferenceSequence(
                        {
                            ref: refName,
                            start: startPos,
                            end: endPos
                        },
                        function (refGenomeSequence) {
                            var leftover = (refGenomeSequence.length - 2) % 3;
                            var extStartSeq = refGenomeSequence.substring(0, refGenomeSequence.length - 2);
                            var extEndSeq = refGenomeSequence.substring(2);

                            let refGenomeSequenceReverse = refGenomeSequence.split("").reverse().join("");
                            console.info('refGenomeSequence', refName, startPos, endPos, refGenomeSequence);
                            console.info('refGenomeSequenceReverse', refName, startPos, endPos, refGenomeSequenceReverse);

                            for (var i = 0; i < 3; i++) {
                                let transStart = startPos + i;
                                let frame = (transStart % 3 + 3) % 3;
                                let translatedProteinSeq = _this._getTranslationSequence(_this, extEndSeq, i, false);
                                console.info('translatedProteinSeq', refName, startPos, endPos, 'frame' + frame, 'forward', translatedProteinSeq);
                            }

                            for (var i = 0; i < 3; i++) {
                                let transStart = startPos + 1 - i;
                                let leftover = (refGenomeSequence.length - 2) % 3;
                                let frame = (transStart % 3 + 3 + leftover) % 3;
                                let translatedProteinSeqReverse = _this._getTranslationSequence(_this, extStartSeq, i, true);
                                console.info('translatedProteinSeq', refName, startPos, endPos, 'frame' + frame, 'reverse', translatedProteinSeqReverse);
                            }

                        },
                        function (error) {
                            console.error(error);
                        }
                    )
                }

            }
        );
    }
);
