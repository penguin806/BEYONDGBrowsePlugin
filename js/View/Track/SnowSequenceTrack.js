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
        'dojo/on',
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
        dojoOn,
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
                    window.BEYONDGBrowseProteinTrack = _this;
                    window.BEYONDGBrowse.DebugPrintReferenceGenomeSequence = function (refName, startPos, endPos) {
                        _this._printRefSeqAndConceptualTranslation(_this, refName, startPos, endPos)
                    };
                    window.BEYONDGBrowse._loadSpecificAnnotationAndPopupModal = function (name, position, finishCallback) {
                        _this._loadSpecificAnnotationAndPopupModal(name, position, finishCallback);
                    };

                    _this._codonTable = {
                        "TCA" : "S",
                        "TCC" : "S",
                        "TCG" : "S",
                        "TCT" : "S",
                        "TTC" : "F",
                        "TTT" : "F",
                        "TTA" : "L",
                        "TTG" : "L",
                        "TAC" : "Y",
                        "TAT" : "Y",
                        "TAA" : "*",
                        "TAG" : "*",
                        "TGC" : "C",
                        "TGT" : "C",
                        "TGA" : "*",
                        "TGG" : "W",
                        "CTA" : "L",
                        "CTC" : "L",
                        "CTG" : "L",
                        "CTT" : "L",
                        "CCA" : "P",
                        "CCC" : "P",
                        "CCG" : "P",
                        "CCT" : "P",
                        "CAC" : "H",
                        "CAT" : "H",
                        "CAA" : "Q",
                        "CAG" : "Q",
                        "CGA" : "R",
                        "CGC" : "R",
                        "CGG" : "R",
                        "CGT" : "R",
                        "ATA" : "I",
                        "ATC" : "I",
                        "ATT" : "I",
                        "ATG" : "M",
                        "ACA" : "T",
                        "ACC" : "T",
                        "ACG" : "T",
                        "ACT" : "T",
                        "AAC" : "N",
                        "AAT" : "N",
                        "AAA" : "K",
                        "AAG" : "K",
                        "AGC" : "S",
                        "AGT" : "S",
                        "AGA" : "R",
                        "AGG" : "R",
                        "GTA" : "V",
                        "GTC" : "V",
                        "GTG" : "V",
                        "GTT" : "V",
                        "GCA" : "A",
                        "GCC" : "A",
                        "GCG" : "A",
                        "GCT" : "A",
                        "GAC" : "D",
                        "GAT" : "D",
                        "GAA" : "E",
                        "GAG" : "E",
                        "GGA" : "G",
                        "GGC" : "G",
                        "GGG" : "G",
                        "GGT" : "G"
                    };
                    _this.blocksJustFilled = [];

                    _this._subscribeEvents();
                },

                _subscribeEvents: function() {
                    let _this = this;
                    _this.proteoformTrackToDrawArray = [];

                    // Subscribe draw proteoform event from module <SnowCanvasFeatures>
                    // Fill the proteoformToDraw Array
                    dojoTopic.subscribe(
                        'BEYONDGBrowse/addSingleProteoformScan',
                        function(
                            proteoformSequence, proteoformStartPosition, proteoformEndPosition,
                            isReverseStrand, scanId, mSScanMassMappingResultArray, msScanMassTrackId,
                            selectedRefSeqIndex, diffFromRefSequenceResult
                        ){
                            SnowConsole.info('Event: BEYONDGBrowse/addSingleProteoformScan', arguments);
                            // if(!_this.proteoformToDrawScanIdArray.hasOwnProperty(msScanMassTrackId) || typeof(_this.proteoformToDrawScanIdArray[msScanMassTrackId]) != "object" )
                            // {
                            //
                            // }
                            _this.proteoformTrackToDrawArray[msScanMassTrackId] = {
                                proteoformSequence: proteoformSequence,
                                proteoformStartPosition: proteoformStartPosition,
                                proteoformEndPosition: proteoformEndPosition,
                                isReverseStrand: isReverseStrand,
                                scanId: scanId,
                                mSScanMassMappingResultArray: mSScanMassMappingResultArray,
                                msScanMassTrackId: msScanMassTrackId,
                                diffFromRefSequenceResult: diffFromRefSequenceResult,
                                selectedRefSeqIndex
                            };

                            _this._queryAnnotationDataFromBackend(
                                'Scan' + scanId,
                                undefined,
                                undefined,
                                undefined,
                                drawProteoform
                            );
                        }
                    );

                    // Remove from _this.proteoformToDrawScanIdArray
                    _this.browser.subscribe(
                        '/jbrowse/v1/c/tracks/hide',
                        function (trackToHideArray) {
                            trackToHideArray.forEach(
                                function (trackToHide) {
                                    if(trackToHide.BEYONDGBrowseMassTrack === true)
                                    {
                                        delete _this.proteoformTrackToDrawArray[trackToHide.msScanMassTrackId];
                                        // _this.proteoformTrackToDrawArray.forEach(
                                        //     function (item, index) {
                                        //         if(trackToHide.msScanMassTrackId === item.msScanMassTrackId)
                                        //         {
                                        //             delete _this.proteoformTrackToDrawArray[index];
                                        //         }
                                        //     }
                                        // );
                                    }
                                }
                            );

                            drawProteoform();
                        }
                    );

                    function drawProteoform() {
                        setTimeout(
                            _drawProteoform,
                            300
                        );
                    }

                    // Draw proteoform
                    function _drawProteoform() {
                        // _this.proteoformTrackToDrawArray.sort(
                        //     (itemA, itemB) => {
                        //         return itemA.msScanMassTrackId - itemB.msScanMassTrackId;
                        //     }
                        // );

                        for(let index in _this.proteoformTrackToDrawArray)
                        {
                            if(
                                _this.proteoformTrackToDrawArray.hasOwnProperty(index) &&
                                typeof _this.proteoformTrackToDrawArray[index] == "object"
                            )
                            {
                                let proteoformObject = _this.proteoformTrackToDrawArray[index];
                                _this._drawProteoformSequenceEventCallback(
                                    proteoformObject.proteoformSequence, proteoformObject.proteoformStartPosition,
                                    proteoformObject.proteoformEndPosition, proteoformObject.isReverseStrand,
                                    proteoformObject.scanId, proteoformObject.mSScanMassMappingResultArray,
                                    proteoformObject.msScanMassTrackId, proteoformObject.diffFromRefSequenceResult,
                                    proteoformObject.selectedRefSeqIndex, _this
                                );
                            }
                        }
                    }

                    // _this.browser.subscribe(
                    //     '/jbrowse/v1/n/tracks/redraw',
                    //     function () {
                    //         drawProteoform();
                    //     }
                    // );
                    // _this.browser.subscribe(
                    //     '/jbrowse/v1/n/tracks/redrawFinished',
                    //     function () {
                    //         drawProteoform();
                    //         // Empty the proteoformToDraw Array
                    //         _this.proteoformToDrawScanIdArray = [];
                    //     }
                    // );

                    // _this.browser.subscribe(
                    //     '/jbrowse/v1/n/tracks/navigate',
                    //     function () {
                    //         _this.proteoformToDrawScanIdArray = [];
                    //     }
                    // );
                },

                _defaultConfig: function(){
                    let oldConfig = this.inherited(arguments);
                    let newConfig = dojoLang.mixin(
                        oldConfig,{
                            showTranslation1st: false,
                            showTranslation2nd: false,
                            showTranslation3rd: true,
                            showTranslationReverse1st: false,
                            showTranslationReverse2nd: false,
                            showTranslationReverse3rd: true
                        });
                    newConfig.drawCircle = !!oldConfig.drawCircle || true;
                    newConfig.animationEnabled = !!oldConfig.animationEnabled || true;
                    newConfig.proteoformExtraOffset = oldConfig.proteoformExtraOffset || 0;
                    newConfig.fillMismatchesWithCells = oldConfig.fillMismatchesWithCells || true;

                    // 0: Hydrophile
                    // 1: Hydrophobe
                    // 2: Acidity
                    // 3: Alkaline
                    newConfig.mapAminoAcidHydrophilicity =
                        oldConfig.mapAminoAcidHydrophilicity || {
                            'G' : 0,
                            'A' : 1,
                            'V' : 1,
                            'L' : 1,
                            'I' : 1,
                            'F' : 1,
                            'W' : 1,
                            'Y' : 0,
                            'D' : 2,
                            'N' : 0,
                            'E' : 2,
                            'K' : 3,
                            'Q' : 0,
                            'M' : 1,
                            'S' : 0,
                            'T' : 0,
                            'C' : 0,
                            'P' : 1,
                            'H' : 3,
                            'R' : 3
                        };

                    return newConfig;
                },

                _trackMenuOptions: function() {
                    let _this = this;
                    // let oldTrackMenuOptions = _this.inherited(arguments);

                    let newTrackMenuOptions = [
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
                            label: 'Draw AminoAcid with Circle-Style',
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
                        },
                        {
                            label: 'Fill Mismatches with Cells',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!_this.config.fillMismatchesWithCells,
                            onClick: function (event) {
                                _this.config.fillMismatchesWithCells = this.checked;
                                if(!!_this.config.fillMismatchesWithCells) {
                                    dojoQuery('.Snow_translatedSequence td.Snow_aminoAcid.Snow_AminoAcid_Mismatch')
                                        .style('visibility', 'visible');
                                }
                                else {
                                    dojoQuery('.Snow_translatedSequence td.Snow_aminoAcid.Snow_AminoAcid_Mismatch')
                                        .style('visibility', 'hidden');
                                }
                            }
                        }
                    ];

                    return newTrackMenuOptions;
                },

                _generateDetailArrayOfProteoformSequence: function(
                    proteoformStartPosition, proteoformEndPosition,
                    isReverseStrand, scanId, diffFromRefSequenceResult, mSScanMassMappingResultArray
                ){
                    if(
                        window.BEYONDGBrowse.msScanDataInfoStore.hasOwnProperty(scanId) &&
                        typeof window.BEYONDGBrowse.msScanDataInfoStore[scanId].detailArrayOfProteoformSequence == "object"
                    )
                    {
                        return window.BEYONDGBrowse.msScanDataInfoStore[scanId].detailArrayOfProteoformSequence;
                    }

                    let detailArrayOfProteoformSequence = [];
                    let aminoAcidDetailTemplate = {
                        id: undefined,
                        isEmpty: false,
                        isReverse: isReverseStrand,
                        scan: scanId,
                        headOrTailFlag: undefined,
                        leftPosition: undefined,
                        aminoAcidCharacter: undefined,
                        bIonFlag: undefined,
                        bIonFlagTag: undefined,
                        yIonFlag: undefined,
                        yIonFlagTag: undefined,
                        modification: undefined,
                        isRefAdded: undefined,
                        isRefRemoved: undefined
                    };
                    let aminoAcidCharacterCount = 0;
                    let aminoAcidWithRemovedCharacterCount = 0;

                    let pendingInsertAtHead = undefined;
                    diffFromRefSequenceResult.forEach(
                        function(item, index) {
                            if(typeof item === 'object' && item.value !== undefined)
                            {
                                if(item.added === undefined && item.removed === undefined)
                                {
                                    for(let i = 0; i < item.value.length; i++)
                                    {
                                        let newNode = dojoLang.clone(aminoAcidDetailTemplate);
                                        newNode.id = aminoAcidCharacterCount;
                                        newNode.headOrTailFlag = (index === 0 && i === 0) ? 'HEAD' : '';
                                        newNode.headOrTailFlag += (
                                            index === diffFromRefSequenceResult.length - 1 &&
                                            i === item.value.length - 1
                                        ) ? 'TAIL' : '';
                                        if(0 === i && pendingInsertAtHead)
                                        {
                                            newNode.headOrTailFlag = 'HEAD';
                                            newNode.modification = pendingInsertAtHead.value;
                                            if(pendingInsertAtHead.modification !== undefined)
                                            {
                                                newNode.modificationColor = pendingInsertAtHead.modification.color;
                                            }
                                            pendingInsertAtHead = undefined;
                                        }
                                        newNode.leftPosition =
                                            proteoformStartPosition + 3 * aminoAcidWithRemovedCharacterCount;
                                        newNode.aminoAcidCharacter = item.value.charAt(i) === '!' ? '-' : item.value.charAt(i);

                                        for(let i = 0; i < mSScanMassMappingResultArray.length; i++)
                                        {
                                            if(mSScanMassMappingResultArray[i].position === aminoAcidWithRemovedCharacterCount)
                                            {
                                                if(mSScanMassMappingResultArray[i].type === 'B')
                                                {
                                                    newNode.bIonFlag = mSScanMassMappingResultArray[i].label;
                                                    newNode.bIonFlagTag = true;
                                                }
                                                else if (mSScanMassMappingResultArray[i].type === 'Y')
                                                {
                                                    newNode.yIonFlag = mSScanMassMappingResultArray[i].label;
                                                    newNode.yIonFlagTag = true;
                                                }
                                            }
                                        }
                                        aminoAcidCharacterCount++;
                                        aminoAcidWithRemovedCharacterCount++;
                                        detailArrayOfProteoformSequence.push(newNode);
                                    }
                                }
                                else if(item.added === true)
                                {
                                    if(detailArrayOfProteoformSequence.length <= 0 || typeof detailArrayOfProteoformSequence[0] !== 'object')
                                    {
                                        pendingInsertAtHead = item;
                                        return false;
                                    }
                                    let prevNode = detailArrayOfProteoformSequence[detailArrayOfProteoformSequence.length - 1];
                                    let refAddedCharacters = item.value;
                                    if(item.modification !== undefined)
                                    {
                                        prevNode.modificationColor = item.modification.color;
                                    }
                                    prevNode.modification = refAddedCharacters;
                                }
                                else if(item.removed === true)
                                {
                                    for(let i = 0; i < item.value.length; i++)
                                    {
                                        let newNode = dojoLang.clone(aminoAcidDetailTemplate);
                                        newNode.id = aminoAcidCharacterCount;
                                        newNode.headOrTailFlag = (index === 0 && i === 0) ? 'HEAD' : '';
                                        newNode.headOrTailFlag += (
                                            index === diffFromRefSequenceResult.length - 1 &&
                                            i === item.value.length - 1
                                        ) ? 'TAIL' : '';
                                        newNode.leftPosition =
                                            proteoformStartPosition + 3 * aminoAcidWithRemovedCharacterCount;
                                        newNode.aminoAcidCharacter = '-';
                                        newNode.isRefRemoved = true;
                                        aminoAcidWithRemovedCharacterCount++;
                                        detailArrayOfProteoformSequence.push(newNode);
                                    }
                                }
                                else
                                {
                                    console.error('diffFromRefSequenceResult error', item, index);
                                }
                            }
                            else
                            {
                                console.error('diffFromRefSequenceResult error', item, index);
                            }
                        }
                    );

                    let lastIndexForBIon = 0;
                    let lastIndexForYIon = detailArrayOfProteoformSequence.length - 1;
                    for(let index = 0; index < detailArrayOfProteoformSequence.length; index++)
                    {
                        if(detailArrayOfProteoformSequence.hasOwnProperty(index))
                        {
                            if(detailArrayOfProteoformSequence[index].bIonFlag !== undefined)
                            {
                                for(let j = lastIndexForBIon; j < index; j++)
                                {
                                    detailArrayOfProteoformSequence[j].bIonFlag =
                                        detailArrayOfProteoformSequence[index].bIonFlag;
                                }
                                lastIndexForBIon = index + 1;
                            }

                            if(
                                detailArrayOfProteoformSequence[
                                    detailArrayOfProteoformSequence.length - 1 - index
                                ].yIonFlag !== undefined
                            )
                            {
                                for(
                                    let k = lastIndexForYIon;
                                    k > detailArrayOfProteoformSequence.length - 1 - index;
                                    k--
                                )
                                {
                                    detailArrayOfProteoformSequence[k].yIonFlag =
                                        detailArrayOfProteoformSequence[
                                            detailArrayOfProteoformSequence.length - 1 - index
                                        ].yIonFlag;
                                }
                                lastIndexForYIon = detailArrayOfProteoformSequence.length - 1 - index - 1;
                            }
                        }
                    }

                    window.BEYONDGBrowse.msScanDataInfoStore[scanId] =
                        window.BEYONDGBrowse.msScanDataInfoStore[scanId] || {};
                    window.BEYONDGBrowse.msScanDataInfoStore[scanId].detailArrayOfProteoformSequence = detailArrayOfProteoformSequence;
                    return detailArrayOfProteoformSequence;
                },

                _queryAnnotationDataFromBackend: function(scanIdLabel, refName, currentRangeStartPosition, currentRangeEndPosition, annotationFinishLoadCallback) {
                    let _this = this;

                    if(scanIdLabel !== undefined)
                    {
                        if(
                            !window.BEYONDGBrowse.annotationStore.hasOwnProperty(scanIdLabel)
                            && typeof window.BEYONDGBrowse.annotationStore[scanIdLabel] != "object"
                        )
                        {
                            let requestUrl = 'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1')
                                + ':12080/' + _this.browser.config.BEYONDGBrowseDatasetId  + '/annotation/query/' + scanIdLabel + '/'
                                + '1..9999';

                            dojoRequest.get(
                                requestUrl,
                                {
                                    // headers: {
                                    //     'X-Requested-With': null
                                    // },
                                    handleAs: 'json'
                                }
                            ).then(
                                function (proteoformAnnotationData) {
                                    SnowConsole.info('proteoformAnnotation:', proteoformAnnotationData);
                                    window.BEYONDGBrowse.annotationStore[scanIdLabel] = proteoformAnnotationData;
                                    annotationFinishLoadCallback && annotationFinishLoadCallback();
                                    window.BEYONDGBrowse._fillAnnotationTable();
                                },
                                function (errorReason) {
                                    console.error('Query proteoformAnnotation error', requestUrl, errorReason);
                                }
                            );
                        }
                        else
                        {
                            annotationFinishLoadCallback && annotationFinishLoadCallback();
                        }
                    }

                    if(refName && currentRangeStartPosition && currentRangeEndPosition)
                    {
                        let requestUrl = 'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1')
                            + ':12080/' + _this.browser.config.BEYONDGBrowseDatasetId  + '/annotation/query/' + refName + '/'
                            + currentRangeStartPosition + '..' + currentRangeEndPosition;

                        dojoRequest.get(
                            requestUrl,
                            {
                                // headers: {
                                //     'X-Requested-With': null
                                // },
                                handleAs: 'json'
                            }
                        ).then(
                            function (currentRangeAnnotationData) {
                                SnowConsole.info('currentRangeAnnotation:', currentRangeAnnotationData);
                                window.BEYONDGBrowse.annotationStore['currentRangeRefSeq'] = {
                                    refName: refName,
                                    startPos: currentRangeStartPosition,
                                    endPos: currentRangeEndPosition,
                                    annotationData: currentRangeAnnotationData
                                };
                                annotationFinishLoadCallback && annotationFinishLoadCallback();
                                window.BEYONDGBrowse._fillAnnotationTable();
                            },
                            function (errorReason) {
                                console.error('Query currentRangeAnnotation error', requestUrl, errorReason);
                            }
                        );
                    }
                },

                _drawProteoformSequenceEventCallback: function(
                    proteoformSequence, proteoformStartPosition, proteoformEndPosition,
                    isReverseStrand, scanId, mSScanMassMappingResultArray, msScanMassTrackId,
                    diffFromRefSequenceResult, selectedRefSeqIndex, _this
                ){
                    // dojoQuery('.snow_proteoform_frame.scan_' + scanId).forEach(domConstruct.destroy);
                    // Old Implementation, deprecated
                    // const lengthPerAminoAcidCharacter = 3;
                    // let detailArrayOfProteoformSequence = [];
                    // let aminoAcidCharacterCount = 0;
                    // for(let index = 0; index < proteoformSequence.length; index++)
                    // {
                    //     let currentAminoAcidDetail = {
                    //         id: undefined,
                    //         isEmpty: false,
                    //         isReverse: isReverseStrand,
                    //         scan: scanId,
                    //         headOrTailFlag: undefined,
                    //         leftPosition: undefined,
                    //         aminoAcidCharacter: undefined,
                    //         bIonFlag: undefined,
                    //         bIonFlagTag: undefined,
                    //         yIonFlag: undefined,
                    //         yIonFlagTag: undefined,
                    //         modification: undefined,
                    //     };
                    //
                    //     if(proteoformSequence.charAt(index) !== '[' && proteoformSequence.charAt(index) !== ']')
                    //     {
                    //         currentAminoAcidDetail.id = aminoAcidCharacterCount;
                    //         currentAminoAcidDetail.headOrTailFlag = index === 0 ? 'HEAD' : '';
                    //         currentAminoAcidDetail.headOrTailFlag += index === proteoformSequence.length - 1 ? 'TAIL' : '';
                    //         currentAminoAcidDetail.leftPosition = proteoformStartPosition + lengthPerAminoAcidCharacter * aminoAcidCharacterCount;
                    //         currentAminoAcidDetail.aminoAcidCharacter = proteoformSequence.charAt(index);
                    //         for(let i = 0; i < mSScanMassMappingResultArray.length; i++)
                    //         {
                    //             if(mSScanMassMappingResultArray[i].position === aminoAcidCharacterCount)
                    //             {
                    //                 if(mSScanMassMappingResultArray[i].type === 'B')
                    //                 {
                    //                     currentAminoAcidDetail.bIonFlag = mSScanMassMappingResultArray[i].label;
                    //                     currentAminoAcidDetail.bIonFlagTag = true;
                    //                 }
                    //                 else if (mSScanMassMappingResultArray[i].type === 'Y')
                    //                 {
                    //                     currentAminoAcidDetail.yIonFlag = mSScanMassMappingResultArray[i].label;
                    //                     currentAminoAcidDetail.yIonFlagTag = true;
                    //                 }
                    //                 break;
                    //             }
                    //         }
                    //         detailArrayOfProteoformSequence.push(currentAminoAcidDetail);
                    //         aminoAcidCharacterCount ++;
                    //     }
                    //     else
                    //     {
                    //         // Modification
                    //         if(detailArrayOfProteoformSequence.length <= 0)
                    //         {
                    //             continue;
                    //         }
                    //         currentAminoAcidDetail = detailArrayOfProteoformSequence[detailArrayOfProteoformSequence.length - 1];
                    //         let modificationType = "";
                    //         for(index++; index < proteoformSequence.length; index++)
                    //         {
                    //             if(proteoformSequence.charAt(index) !== '[' && proteoformSequence.charAt(index) !== ']')
                    //             {
                    //                 modificationType += proteoformSequence.charAt(index);
                    //             }
                    //             else
                    //             {
                    //                 detailArrayOfProteoformSequence[detailArrayOfProteoformSequence.length - 1].modification =
                    //                     modificationType;
                    //                 break;
                    //             }
                    //         }
                    //     }
                    //
                    // }
                    // 2019-11-12 New implementation (Analyze the diffFromRefSequenceResult Object Array)
                    // let firstAttachedBlockIndex = _this.firstAttached;
                    // let lastAttachedBlockIndex = _this.lastAttached;
                    // let snowSequenceTrackBlocks = _this.blocksJustFilled || _this.blocks;

                    let detailArrayOfProteoformSequence = _this._generateDetailArrayOfProteoformSequence(
                        proteoformStartPosition, proteoformEndPosition, isReverseStrand,
                        scanId, diffFromRefSequenceResult, mSScanMassMappingResultArray
                    );

                    let snowSequenceTrackBlocks = _this.blocks;
                    for(let blockIndex in snowSequenceTrackBlocks)
                    {
                        if( snowSequenceTrackBlocks.hasOwnProperty(blockIndex)
                            && typeof snowSequenceTrackBlocks[blockIndex] == "object" )
                        {
                            // Currently visible block
                            let blockStartBase = snowSequenceTrackBlocks[blockIndex].startBase;
                            let blockEndBase = snowSequenceTrackBlocks[blockIndex].endBase;
                            let blockStartBaseWithOffset = blockStartBase - (blockStartBase % 3);
                            let blockEndBaseWithOffset = blockEndBase - (blockEndBase % 3);
                            let blockLeftOffsetValue = blockStartBaseWithOffset - blockStartBase;
                            let blockActualBpLength = blockEndBase - blockStartBase;
                            let aminoAcidCharactersPerBlock = (blockEndBaseWithOffset - blockStartBaseWithOffset) / 3;
                            let detailArrayOfProteoformInThisBlock = [];
                            // dojoQuery(
                            //     '.snow_proteoform_frame.msScanMassTrackId_' + msScanMassTrackId,
                            //     snowSequenceTrackBlocks[blockIndex].domNode
                            // ).forEach(domConstruct.destroy);
                            if(
                                dojoQuery(
                                    '.snow_proteoform_frame.msScanMassTrackId_' + msScanMassTrackId, snowSequenceTrackBlocks[blockIndex].domNode
                                ).length !== 0
                            )
                            {
                                continue;
                            }

                            for(let index in detailArrayOfProteoformSequence)
                            {
                                if(
                                    detailArrayOfProteoformSequence.hasOwnProperty(index) &&
                                    typeof detailArrayOfProteoformSequence[index] == "object" &&
                                    detailArrayOfProteoformSequence[index].leftPosition >= blockStartBaseWithOffset &&
                                    detailArrayOfProteoformSequence[index].leftPosition < blockEndBaseWithOffset
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
                                    bIonFlagTag: undefined,
                                    yIonFlag: undefined,
                                    yIonFlagTag: undefined,
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
                                                // while(detailArrayOfProteoformInThisBlock.length < aminoAcidCharactersPerBlock)
                                                // {
                                                //     detailArrayOfProteoformInThisBlock.unshift(emptyAminoAcidDetail);
                                                // }
                                                for(let i = 0; (detailItem.leftPosition - (blockStartBaseWithOffset + 1)) - i >= 3; i += 3)
                                                {
                                                    detailArrayOfProteoformInThisBlock.unshift(emptyAminoAcidDetail);
                                                }
                                                return false;
                                            }
                                            else
                                            {
                                                return true;
                                            }
                                        }
                                    );

                                }
                                else
                                {
                                    SnowConsole.info('detailArrayOfProteoformInThisBlock is Empty!', blockIndex, detailArrayOfProteoformInThisBlock);
                                    while(detailArrayOfProteoformInThisBlock.length < aminoAcidCharactersPerBlock)
                                    {
                                        detailArrayOfProteoformInThisBlock.push(emptyAminoAcidDetail);
                                    }
                                }
                            }

                            // Start rendering proteoform sequence
                            let newProteoformSequenceDiv = _this._renderProteoformSequence(
                                detailArrayOfProteoformInThisBlock, proteoformStartPosition, proteoformEndPosition,
                                blockLeftOffsetValue, blockStartBaseWithOffset, blockEndBaseWithOffset, blockActualBpLength,
                                snowSequenceTrackBlocks[blockIndex].scale
                            );
                            domClass.add( newProteoformSequenceDiv, "snow_proteoform_frame");
                            domClass.add( newProteoformSequenceDiv, "scan_" + scanId);
                            domClass.add( newProteoformSequenceDiv, "msScanMassTrackId_" + msScanMassTrackId);
                            newProteoformSequenceDiv.onmouseover = function () {
                                dojoQuery(
                                    (isReverseStrand ? '.Snow_translatedSequence_R' :
                                        '.Snow_translatedSequence_F') + selectedRefSeqIndex + ' td'
                                ).addClass('hoverState');
                            };
                            newProteoformSequenceDiv.onmouseout = function () {
                                dojoQuery(
                                    (isReverseStrand ? '.Snow_translatedSequence_R' :
                                        '.Snow_translatedSequence_F') + selectedRefSeqIndex + ' td'
                                ).removeClass('hoverState');
                            };
                            snowSequenceTrackBlocks[blockIndex].domNode.appendChild(newProteoformSequenceDiv);

                            _this._renderAnnotationMark(
                                'Scan' + scanId,
                                newProteoformSequenceDiv,
                                blockStartBaseWithOffset,
                                blockEndBaseWithOffset,
                                true
                            );

                            // let totalHeight = 0;
                            // dojoArray.forEach(
                            //     snowSequenceTrackBlocks[blockIndex].domNode.childNodes,
                            //     function( table ) {
                            //         if(table.className !== 'loading')
                            //         {
                            //             totalHeight += (table.clientHeight || table.offsetHeight);
                            //         }
                            //     }
                            // );
                            // _this.heightUpdate( totalHeight, blockIndex );
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

                showRange: function(first, last, startBase, bpPerBlock, scale,
                                    containerStart, containerEnd, finishCallback) {
                    let _this = this;
                    let _arguments = arguments;
                    let currentRangeLeftBase = startBase;
                    let currentRangeRightBase = startBase + (last - first + 1) * bpPerBlock;

                    // _this.blocksJustFilled = [];
                    let annotationFinishLoadCallback = function() {
                        _this.inherited(_arguments);
                    };

                    _this._queryAnnotationDataFromBackend(
                        undefined,
                        _this.refSeq.name,
                        currentRangeLeftBase,
                        currentRangeRightBase,
                        annotationFinishLoadCallback
                    );
                },

                fillBlock: function(args) {
                    let _this = this;
                    let blockIndex = args.blockIndex;
                    let blockObject = args.block;
                    let leftBase = args.leftBase;
                    let rightBase = args.rightBase;
                    let scale = args.scale;
                    let leftExtended = leftBase - 2;
                    let rightExtended = rightBase + 2;
                    let renderAnnotationMarkDeferred = new dojoDeferred();
                    // _this.blocksJustFilled.push(blockObject);

                    renderAnnotationMarkDeferred.then(
                        function () {
                            _this._renderAnnotationMark(
                                _this.refSeq.name,
                                blockObject,
                                leftBase,
                                rightBase,
                                false
                            );
                        }
                    );
                    let blur = domConstruct.create(
                        'div',
                        {
                            className: 'sequence_blur',
                            innerHTML: '<span class="loading">Loading</span>'
                        },
                        blockObject.domNode
                    );

                    this.heightUpdate(blur.offsetHeight + 2 * blur.offsetTop, blockIndex);

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
                                    renderAnnotationMarkDeferred.resolve();
                                }
                                args.finishCallback();
                            },
                            function(error) {
                                if (args.errorCallback)
                                    args.errorCallback(error);
                                else {
                                    console.error(error);
                                    args.finishCallback();
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
                    let _this = this;
                    seq = seq.replace(/\s/g,this.nbsp);
                    let blockStart = block.startBase;
                    let blockEnd = block.endBase;
                    let blockSeq = seq.substring( 2, seq.length - 2 );
                    let blockLength = blockSeq.length;

                    let extStart = blockStart-2;
                    let extEnd = blockStart+2;
                    let leftover = (seq.length - 2) % 3;
                    let extStartSeq = seq.substring( 0, seq.length - 2 );
                    let extEndSeq = seq.substring( 2 );

                    let translationToShow = [
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
                        let frameDiv = [];
                        // array.forEach(translationToShow,function(configItem, i){
                        //         if(!!configItem)
                        //         {
                        //             let transStart = blockStart + i;
                        //             let frame = (transStart % 3 + 3) % 3;
                        //             let translatedDiv = this._renderTranslation( extEndSeq, i, blockStart, blockEnd, blockLength, scale );
                        //             frameDiv[frame] = translatedDiv;
                        //             domClass.add( translatedDiv, "frame" + frame );
                        //         }
                        // }, this);
                        // for(let i = 0; i < 3; i++)
                        // {
                        //     if(translationToShow[i])
                        //     {
                        //         let transStart = blockStart + i;
                        //         let frame = (transStart % 3 + 3) % 3;
                        //         let translatedDiv = this._renderTranslation( extEndSeq, i, blockStart, blockEnd, blockLength, scale );
                        //         frameDiv[frame] = translatedDiv;
                        //         domClass.add( translatedDiv, "frame" + frame );
                        //     }
                        // }
                        // Code above cannot work properly

                        for( let i = 0; i < 3; i++ ) {
                            let transStart = blockStart + i;
                            let frame = (transStart % 3 + 3) % 3;
                            let translatedDiv = this._renderTranslation( extEndSeq, i, blockStart, blockEnd, blockLength, scale );
                            frameDiv[frame] = translatedDiv;
                            domClass.add( translatedDiv, "frame" + frame );
                            domClass.add( translatedDiv, "Snow_translatedSequence_F" + (2 - frame) );
                        }

                        for( let i = 2; i >= 0; i-- ) {
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

                    // Render reverse strand translation
                    if( translationToShow[3] || translationToShow[4] || translationToShow[5] )
                    {
                        let frameDiv = [];
                        for(let i = 0; i < 3; i++) {
                            let transStart = blockStart + 1 - i;
                            let frame = (transStart % 3 + 3 + leftover) % 3;
                            let translatedDiv = this._renderTranslation( extStartSeq, i, blockStart, blockEnd, blockLength, scale, true );
                            frameDiv[frame] = translatedDiv;
                            domClass.add( translatedDiv, "frame" + frame );
                            domClass.add( translatedDiv, "Snow_translatedSequence_R" + (2 - frame) );
                        }
                        for( let i = 0; i < 3; i++ ) {
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

                    let totalHeight = 0;
                    dojoArray.forEach( block.domNode.childNodes, function( table ) {
                        totalHeight += (table.clientHeight || table.offsetHeight);
                    });
                    totalHeight +=
                        window.BEYONDGBrowse.currentVisibleMsSpectraTrackNum * (
                            block.domNode.lastChild.clientHeight ||
                            block.domNode.lastChild.offsetHeight
                        );
                    totalHeight += 50; //Add offset 2020-03-10
                    this.heightUpdate( totalHeight, blockIndex );
                },

                _renderTranslation: function(
                    seq, offset, blockStart,
                    blockEnd, blockLength, scale, reverse
                ) {
                    seq = reverse ? Util.revcom( seq ) : seq;

                    let extraBases = (seq.length - offset) % 3;
                    let seqSliced = seq.slice( offset, seq.length - extraBases );

                    // Object describe how to mark the aminoAcid
                    // let aminoAcidMarks = {
                    //     index: [0,1],
                    //     type: [
                    //         //        "Snow_aminoAcid_mark_left_top",
                    //         "Snow_aminoAcid_mark_left_bottom",
                    //         "Snow_aminoAcid_mark_right_top"
                    //         //        ,"Snow_aminoAcid_mark_right_bottom"
                    //     ]
                    // };

                    let translated = "";
                    for( let i = 0; i < seqSliced.length; i += 3 ) {
                        let nextCodon = seqSliced.slice(i, i + 3);
                        let aminoAcid = this._codonTable[nextCodon] || this.nbsp;
                        translated += aminoAcid;
                    }

                    translated = reverse ? translated.split("").reverse().join("") : translated; // Flip the translated seq for left-to-right rendering
                    let orientedSeqSliced = reverse ? seqSliced.split("").reverse().join("") : seqSliced;

                    let charSize = this.getCharacterMeasurements("aminoAcid");
                    let bigTiles = scale > charSize.w + 4; // whether to add .big styles to the base tiles

                    let charWidth = 100/(blockLength / 3);

                    let container = domConstruct.create(
                        'div',
                        {
                            className: 'Snow_translatedSequence'
                        } );

                    let tableWidthPercent = charWidth * translated.length;
                    let table  = domConstruct.create('table',
                        {
                            className: 'Snow_translatedSequence offset'+offset+(bigTiles ? ' big' : ''),
                            style:
                                {
                                    width: tableWidthPercent + "%"
                                }
                        }, container
                    );
                    let tr = domConstruct.create('tr', {}, table );

                    let tableLeftOffsetPercent = reverse ? 100 - charWidth * (translated.length + offset / 3)
                        : charWidth * offset / 3;
                    table.style.left = tableLeftOffsetPercent + "%";
                    container.snowSequenceOffset = tableLeftOffsetPercent;
                    container.snowSequenceWidth = tableWidthPercent;
                    container.setAttribute('data-snowSequenceOffset', tableLeftOffsetPercent);
                    container.setAttribute('data-snowSequenceWidth', tableWidthPercent);
                    let blockRegion = blockEnd - blockStart;
                    let blockStartExtended = blockStart + blockRegion * tableLeftOffsetPercent * 0.01;
                    let blockEndExtended = blockStart + translated.length * 3;

                    let blockWidth = blockLength * scale;
                    let tableWidthScale = 100 / (charWidth * translated.length);
                    let tableActualWidth = blockWidth / tableWidthScale;
                    let spanActualWidth = (tableActualWidth - translated.length) / translated.length;
                    // Need to minus the space between each two span (border-spacing: 1px)
                    // console.log('blockWidth: ' + blockWidth);
                    // console.log('tableWidthScale: ' + tableWidthScale);
                    // console.log('tableActualWidth: ' + tableActualWidth);
                    // console.log('spanActualWidth: ' + spanActualWidth);

                    charWidth = 100 / translated.length + "%";

                    let drawChars = scale >= charSize.w;
                    if( drawChars )
                        table.className += ' big';

                    for( let i = 0; i < translated.length; i++ ) {
                        // let aminoAcidSpan = document.createElement('td');
                        let aminoAcidSpan = domConstruct.create(
                            'td',
                            {
                                snowSeqPosition: blockStartExtended + i * 3
                            },
                            tr
                        );
                        let originalCodon = orientedSeqSliced.slice(3 * i, 3 * i + 3);
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
                    blockLeftOffsetValue, blockStartBaseWithOffset, blockEndBaseWithOffset,
                    blockActualBpLength, scale
                ){
                    let _this = this;
                    let proteoformArrayLength = detailArrayOfProteoformInThisBlock.length;
                    let charSize = _this.getCharacterMeasurements("aminoAcid");
                    let bigTiles = scale > charSize.w + 4; // whether to add .big styles to the base tiles
                    let charWidth = 100 / (blockActualBpLength / 3);

                    let proteoformExtraOffset;
                    detailArrayOfProteoformInThisBlock.every(
                        function (item) {
                            if(item.leftPosition)
                            {
                                proteoformExtraOffset = (item.leftPosition - (blockStartBaseWithOffset + 1)) % 3 / blockActualBpLength;
                                _this.config.proteoformExtraOffset = proteoformExtraOffset = proteoformExtraOffset * 100;
                                return false;
                            }
                            else
                            {
                                return true;
                            }
                        }
                    );

                    let container = domConstruct.create(
                        'div',
                        {
                            className: 'Snow_translatedSequence'
                        }
                    );

                    let tableWidthPercent = (charWidth * detailArrayOfProteoformInThisBlock.length);
                    // tableWidthPercent = tableWidthPercent <= 100 ? tableWidthPercent : 100;
                    let table  = domConstruct.create('table',
                        {
                            className: 'Snow_translatedSequence offset' + blockLeftOffsetValue + (bigTiles ? ' big' : ''),
                            style:
                                {
                                    // width: (charWidth * proteoformSequence.length) + "%"
                                    width: tableWidthPercent + '%'
                                }
                        },
                        container
                    );
                    let tr = domConstruct.create('tr', {}, table );
                    table.style.left = (charWidth * blockLeftOffsetValue / 3) + parseFloat(proteoformExtraOffset) + "%";

                    let blockWidth = blockActualBpLength * scale;
                    // let aminoAcidTableCellActualWidth = blockWidth * (tableWidthPercent * 0.01) / (blockLength / 3);
                    let aminoAcidTableCellActualWidth = blockWidth * (tableWidthPercent * 0.01) / proteoformArrayLength;

                    charWidth = 100 / detailArrayOfProteoformInThisBlock.length + "%";
                    let drawChars = scale >= charSize.w;
                    if( drawChars )
                        table.className += ' big';

                    for( let index = 0; index < detailArrayOfProteoformInThisBlock.length; index++ ) {
                        let aminoAcidSpan = domConstruct.create(
                            'td',
                            {
                                proteoformPosition: (
                                    typeof detailArrayOfProteoformInThisBlock[index] === "object"
                                ) ? detailArrayOfProteoformInThisBlock[index].id + 1 : undefined,
                                proteoformLeftPositionInBp: (
                                    typeof detailArrayOfProteoformInThisBlock[index] === "object"
                                ) ? detailArrayOfProteoformInThisBlock[index].leftPosition : undefined
                            },
                            tr
                        );
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

                            if(detailArrayOfProteoformInThisBlock[index].aminoAcidCharacter === '-')
                            {
                                aminoAcidSpan.className += ' Snow_AminoAcid_Mismatch';
                                aminoAcidSpan.innerHTML = '';
                                domConstruct.create(
                                    'span',
                                    {
                                        className: 'Snow_AminoAcid_Mismatch_span' + (_this.genomeView.pxPerBp < 5.5 ? ' low_scale' : ''),
                                        innerHTML: drawChars ? detailArrayOfProteoformInThisBlock[index].aminoAcidCharacter : ''
                                    },
                                    aminoAcidSpan
                                );
                                if(!_this.config.fillMismatchesWithCells)
                                {
                                    aminoAcidSpan.style.visibility = 'hidden';
                                }
                            }

                            if(
                                _this.config.mapAminoAcidHydrophilicity.hasOwnProperty(
                                    detailArrayOfProteoformInThisBlock[index].aminoAcidCharacter.toUpperCase()
                                )
                            )
                            {
                                switch(
                                    _this.config.mapAminoAcidHydrophilicity[
                                        detailArrayOfProteoformInThisBlock[index].aminoAcidCharacter.toUpperCase()
                                        ]
                                    )
                                {
                                    case 0:
                                        aminoAcidSpan.className += ' Snow_aminoAcid_Hydrophile';
                                        break;
                                    case 1:
                                        aminoAcidSpan.className += ' Snow_aminoAcid_Hydrophobe';
                                        break;
                                    case 2:
                                        aminoAcidSpan.className += ' Snow_aminoAcid_Acidity';
                                        break;
                                    case 3:
                                        aminoAcidSpan.className += ' Snow_aminoAcid_Alkaline';
                                        break;
                                    default:
                                        aminoAcidSpan.className += ' Snow_aminoAcid_Unknown';
                                        break;
                                }
                            }
                            else
                            {
                                aminoAcidSpan.className += ' Snow_aminoAcid_Unknown';
                            }



                            if(_this.config.drawCircle && _this.genomeView.pxPerBp >= 5.5)
                            {
                                aminoAcidSpan.className += ' Snow_aminoAcid_circle';
                            }
                            if(_this.config.animationEnabled)
                            {
                                aminoAcidSpan.className += ' Snow_aminoAcid_animation';
                            }

                            if(detailArrayOfProteoformInThisBlock[index].bIonFlag !== undefined)
                            {
                                aminoAcidSpan.className += ' Snow_aminoAcid_bIon_' +
                                    detailArrayOfProteoformInThisBlock[index].bIonFlag;
                                if(detailArrayOfProteoformInThisBlock[index].bIonFlagTag !== undefined)
                                {
                                    aminoAcidSpan.className += ' Snow_aminoAcid_mark_right_top' + (_this.genomeView.pxPerBp < 5.5 ? ' low_scale' : '');

                                    let bIonLabelNode = domConstruct.create('span',
                                        {
                                            className: 'Snow_aminoAcid_bIon_label' +
                                                (_this.genomeView.pxPerBp > _this.getCharacterMeasurements("aminoAcid").w ? ' big': ''),
                                            style: {},
                                            innerHTML: detailArrayOfProteoformInThisBlock[index].bIonFlag
                                        }
                                    );
                                    aminoAcidSpan.appendChild(bIonLabelNode);
                                }
                            }

                            if(detailArrayOfProteoformInThisBlock[index].yIonFlag !== undefined)
                            {
                                aminoAcidSpan.className += ' Snow_aminoAcid_yIon_' +
                                    detailArrayOfProteoformInThisBlock[index].yIonFlag;
                                if(detailArrayOfProteoformInThisBlock[index].yIonFlagTag !== undefined)
                                {
                                    aminoAcidSpan.className += ' Snow_aminoAcid_mark_left_bottom' + (_this.genomeView.pxPerBp < 5.5 ? ' low_scale' : '');

                                    let yIonLabelNode = domConstruct.create('span',
                                        {
                                            className: 'Snow_aminoAcid_yIon_label' +
                                                (_this.genomeView.pxPerBp > _this.getCharacterMeasurements("aminoAcid").w ? ' big': ''),
                                            style: {},
                                            innerHTML: detailArrayOfProteoformInThisBlock[index].yIonFlag
                                        }
                                    );
                                    aminoAcidSpan.appendChild(yIonLabelNode);
                                }
                            }

                            if(detailArrayOfProteoformInThisBlock[index].modification !== undefined)
                            {
                                let modificationText = detailArrayOfProteoformInThisBlock[index].modification;
                                // modificationText = modificationText.replace(';', ';<br>');
                                let modificationDivWidth = _this.genomeView.pxPerBp > _this.getCharacterMeasurements("aminoAcid").w ?
                                    aminoAcidTableCellActualWidth / 2 : aminoAcidTableCellActualWidth;
                                let modificationDivHeight = _this.genomeView.pxPerBp > _this.getCharacterMeasurements("aminoAcid").w ?
                                    aminoAcidTableCellActualWidth / 2 : aminoAcidTableCellActualWidth;

                                let modificationContainer = domConstruct.create('td',
                                    {
                                        className: 'Snow_aminoAcid_modification_container',
                                        style: {
                                            width: 0,
                                            borderRight: 0
                                        }
                                    }
                                );

                                let modificationDivNode = domConstruct.create('div',
                                    {
                                        className: 'Snow_aminoAcid_modification_label' + (_this.genomeView.pxPerBp < 5.5 ? ' low_scale' : ''),
                                        style: {
                                            backgroundColor: detailArrayOfProteoformInThisBlock[index].modificationColor,
                                            width: modificationDivWidth + 'px',
                                            height: modificationDivHeight + 'px'
                                            // transform: 'translate( -' + modificationDivWidth/2 +
                                            //     'px, ' + modificationDivHeight/2 + 'px)'
                                        }
                                    },
                                    modificationContainer
                                );

                                let modificationTextSpanNode = domConstruct.create('span',
                                    {
                                        className: 'Snow_aminoAcid_modification_text_span',
                                        style: {
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)'
                                        },
                                        innerHTML: modificationText
                                    },
                                    modificationDivNode
                                );

                                dojoOn(
                                    modificationDivNode,
                                    'mouseover',
                                    function () {
                                        let suitableWidth = modificationDivWidth * 2 > charSize.w * modificationText.length ?
                                            modificationDivWidth * 2 : charSize.w * modificationText.length;
                                        modificationDivNode.style.width = suitableWidth + 'px';
                                        modificationDivNode.style.height = modificationDivHeight * 2 + 'px';
                                        modificationDivNode.style.fontSize = 'x-small';
                                    }
                                );
                                dojoOn(
                                    modificationDivNode,
                                    'mouseout',
                                    function () {
                                        modificationDivNode.style.width = modificationDivWidth + 'px';
                                        modificationDivNode.style.height = modificationDivHeight + 'px';
                                        modificationDivNode.style.fontSize = 'xx-small';
                                    }
                                );

                                tr.appendChild(modificationContainer);
                            }

                            function generateSpanNode(scanId, uniprot_id, strand, ptmCount, diffAdded, diffRemoved)
                            {
                                let headSpanInnerHTML = 'Scan: ' + '<span style="color: red; font-weight: bold; text-shadow:none">';
                                headSpanInnerHTML += scanId + '(' + strand + ')</span>';
                                // if(_this.genomeView.pxPerBp < 5.5)
                                // {
                                //     return headSpanInnerHTML;
                                // }

                                headSpanInnerHTML += '<br>ID: ' + '<span style="color: red; font-weight: bold; text-shadow:none">';
                                headSpanInnerHTML += uniprot_id;
                                headSpanInnerHTML += '</span>';

                                headSpanInnerHTML += '<br>PTM: ' + '<span style="color: red; font-weight: bold; text-shadow:none">';
                                headSpanInnerHTML +=  ptmCount + '</span>';

                                headSpanInnerHTML += '<br>Diff: ' + '<span style="color: red; font-weight: bold; text-shadow:none">';
                                headSpanInnerHTML +=  diffAdded
                                    + '+ ' + diffRemoved + '-</span>';

                                return headSpanInnerHTML;
                            }

                            if(detailArrayOfProteoformInThisBlock[index].headOrTailFlag.includes('HEAD'))
                            {
                                let headSpanInnerHTML = generateSpanNode(
                                    detailArrayOfProteoformInThisBlock[index].scan,
                                    window.BEYONDGBrowse.msScanDataInfoStore[detailArrayOfProteoformInThisBlock[index].scan].uniprot_id,
                                    detailArrayOfProteoformInThisBlock[index].isReverse ? '-' : '+',
                                    window.BEYONDGBrowse.msScanDataInfoStore[detailArrayOfProteoformInThisBlock[index].scan].diffFromRefSequenceCount.ptm,
                                    window.BEYONDGBrowse.msScanDataInfoStore[detailArrayOfProteoformInThisBlock[index].scan].diffFromRefSequenceCount.added,
                                    window.BEYONDGBrowse.msScanDataInfoStore[detailArrayOfProteoformInThisBlock[index].scan].diffFromRefSequenceCount.removed
                                );
                                let strandAndScanIdSpanAtHead = domConstruct.create('span',
                                    {
                                        className: 'Snow_aminoAcid_head_strand_scanId_label' + (_this.genomeView.pxPerBp < 5.5 ? ' low_scale' : ''),
                                        style: {
                                            // visibility: 'visible'
                                        },
                                        innerHTML: headSpanInnerHTML
                                    }
                                );

                                aminoAcidSpan.appendChild(strandAndScanIdSpanAtHead);
                            }
                            else if(detailArrayOfProteoformInThisBlock[index].headOrTailFlag.includes('TAIL'))
                            {
                                let tailSpanInnerHTML = generateSpanNode(
                                    detailArrayOfProteoformInThisBlock[index].scan,
                                    window.BEYONDGBrowse.msScanDataInfoStore[detailArrayOfProteoformInThisBlock[index].scan].uniprot_id,
                                    detailArrayOfProteoformInThisBlock[index].isReverse ? '-' : '+',
                                    window.BEYONDGBrowse.msScanDataInfoStore[detailArrayOfProteoformInThisBlock[index].scan].diffFromRefSequenceCount.ptm,
                                    window.BEYONDGBrowse.msScanDataInfoStore[detailArrayOfProteoformInThisBlock[index].scan].diffFromRefSequenceCount.added,
                                    window.BEYONDGBrowse.msScanDataInfoStore[detailArrayOfProteoformInThisBlock[index].scan].diffFromRefSequenceCount.removed
                                );

                                let strandAndScanIdSpanAtHead = domConstruct.create('span',
                                    {
                                        className: 'Snow_aminoAcid_tail_strand_scanId_label' + (_this.genomeView.pxPerBp < 5.5 ? ' low_scale' : ''),
                                        style: {
                                            // visibility: 'visible'
                                        },
                                        innerHTML: tailSpanInnerHTML
                                    }
                                );
                                aminoAcidSpan.appendChild(strandAndScanIdSpanAtHead);
                            }

                        }

                        tr.appendChild(aminoAcidSpan);
                        tr.onmouseover = function() {
                            domClass.add(tr, 'hoverState');
                            // dojoQuery(
                            //     'td span.Snow_aminoAcid_head_strand_scanId_label', tr
                            // ).addClass('hoverState');
                        };

                        tr.onmouseout = function() {
                            domClass.remove(tr, 'hoverState');
                        };
                    }
                    return container;
                },

                _renderAnnotationMark: function (refName, blockObject, blockStart, blockEnd, isProteoformSequence) {
                    let _this = this;
                    let frameDomNode;

                    if(isProteoformSequence === true)
                    {
                        frameDomNode = blockObject;
                    }
                    else
                    {
                        let blockDomNode = blockObject.domNode;
                        frameDomNode = blockDomNode.firstChild;
                    }
                    let allAminoAcidCell = dojoQuery(".Snow_aminoAcid", frameDomNode);
                    allAminoAcidCell.on(
                        'dblclick',
                        function (event) {
                            SnowConsole.debug('dblclick on .Snow_aminoAcid:', arguments);
                            let positionOfThisAminoAcidCell;
                            if(isProteoformSequence === true)
                            {
                                positionOfThisAminoAcidCell = domAttr.get(event.target, 'proteoformPosition');
                            }
                            else
                            {
                                positionOfThisAminoAcidCell = domAttr.get(event.target, 'snowseqposition');
                            }

                            let finishCallback = function () {
                                domClass.add(event.target, 'Snow_annotation_mark');
                                if(isProteoformSequence === true)
                                {
                                    let requestUrl = 'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1')
                                        + ':12080/' + _this.browser.config.BEYONDGBrowseDatasetId  + '/annotation/query/' + refName + '/'
                                        + '1..9999';

                                    dojoRequest.get(
                                        requestUrl,
                                        {
                                            handleAs: 'json'
                                        }
                                    ).then(
                                        function (proteoformAnnotationData) {
                                            SnowConsole.info('proteoformAnnotation:', proteoformAnnotationData);
                                            window.BEYONDGBrowse.annotationStore[refName] = proteoformAnnotationData;
                                        },
                                        function (errorReason) {
                                            console.error('Query proteoformAnnotation error', requestUrl, errorReason);
                                        }
                                    );
                                }
                            };

                            _this._loadSpecificAnnotationAndPopupModal(
                                refName,
                                positionOfThisAminoAcidCell,
                                finishCallback
                            );
                        }
                    );

                    // let proteoformPositionArray = [];
                    // allAminoAcidCell.forEach(
                    //     function (item) {
                    //         proteoformPositionArray.push(
                    //             domAttr.get(item, 'proteoformPosition')
                    //         );
                    //     }
                    // );
                    // Add dblclick event handler on all AmioAcid table cell

                    // let blockRegion = blockEnd - blockStart;
                    // let blockStartExtended = undefined;
                    // let blockEndExtended = undefined;
                    //
                    // if(isProteoformSequence === true)
                    // {
                    //     // Offset is included in the start and end
                    //     blockStartExtended = blockStart;
                    //     blockEndExtended = blockEnd;
                    // }
                    // else
                    // {
                    //     blockStartExtended = blockStart + blockRegion * frameDomNode.snowSequenceOffset * 0.01;
                    //     blockEndExtended = blockStart + allAminoAcidCell.length * 3;
                    // }
                    //
                    // let requestUrl = 'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1')
                    //     + ':12080/' + _this.browser.config.BEYONDGBrowseDatasetId  + '/annotation/query/' + refName + '/'
                    //     + (
                    //         isProteoformSequence === true ?
                    //             Math.min.apply(null, proteoformPositionArray) : blockStartExtended
                    //     )
                    //     + '..' + (
                    //         isProteoformSequence === true ?
                    //             Math.max.apply(null, proteoformPositionArray) : blockEndExtended
                    //     );
                    //
                    // dojoRequest(
                    //     requestUrl,
                    //     {
                    //         method: 'GET',
                    //         headers: {
                    //             'X-Requested-With': null
                    //         },
                    //         handleAs: 'json'
                    //     }
                    // ).then(
                    //     function (annotationObjectArray) {
                    //         SnowConsole.info('annotationObjectArray:', annotationObjectArray);
                    //         renderAnnotationDeferred.resolve(annotationObjectArray);
                    //     },
                    //     function (errorReason) {
                    //         console.error('Error', requestUrl, errorReason);
                    //     }
                    // );
                    // let renderAnnotationDeferred = new dojoDeferred();

                    // renderAnnotationDeferred.then(
                    //     function (annotationObjectArray) {
                    //         for(let i = 0; i < allAminoAcidCell.length; i++)
                    //         {
                    //             let thisCellPosition = domAttr.get(
                    //                 allAminoAcidCell[i],
                    //                 isProteoformSequence === true ? 'proteoformPosition' : 'snowseqposition'
                    //             );
                    //             for(let j = 0; j < annotationObjectArray.length; j++)
                    //             {
                    //                 if(typeof annotationObjectArray[j] != "object")
                    //                 {
                    //                     console.error(annotationObjectArray[j]);
                    //                     break;
                    //                 }
                    //                 let thisAnnotationPosition = annotationObjectArray[j].position;
                    //                 if(
                    //                     (
                    //                         (isProteoformSequence === true) &&
                    //                         (thisCellPosition === thisAnnotationPosition)
                    //                     ) || (
                    //                         (isProteoformSequence !== true) &&
                    //                         (Math.abs(thisCellPosition - thisAnnotationPosition) <= 2)
                    //                     )
                    //                 )
                    //                 {
                    //                     // Match! Add style
                    //                     domClass.add(allAminoAcidCell[i], 'Snow_annotation_mark');
                    //                 }
                    //             }
                    //         }
                    //     },
                    //     function (errorReason) {
                    //     }
                    // );

                    if(isProteoformSequence === true && window.BEYONDGBrowse.annotationStore.hasOwnProperty(refName))
                    {
                        window.BEYONDGBrowse.annotationStore[refName].forEach(
                            function(annotationItem)
                            {
                                for(let i = 0; i < allAminoAcidCell.length; i++)
                                {
                                    let thisAminoPosition = domAttr.get(
                                        allAminoAcidCell[i],
                                        'proteoformPosition'
                                    );
                                    if(thisAminoPosition === annotationItem.position)
                                    {
                                        // Match! Add style
                                        domClass.add(allAminoAcidCell[i], 'Snow_annotation_mark');
                                    }
                                    else if(thisAminoPosition > annotationItem.position)
                                    {
                                        break;
                                    }
                                }
                            }
                        );
                    }
                    else if(
                        window.BEYONDGBrowse.annotationStore.hasOwnProperty('currentRangeRefSeq') &&
                        typeof window.BEYONDGBrowse.annotationStore.currentRangeRefSeq.annotationData == "object"
                    )
                    {
                        window.BEYONDGBrowse.annotationStore.currentRangeRefSeq.annotationData.forEach(
                            function(annotationItem)
                            {
                                for(let i = 0; i < allAminoAcidCell.length; i++)
                                {
                                    let thisAminoPosition = domAttr.get(
                                        allAminoAcidCell[i],
                                        'snowseqposition'
                                    );
                                    if(
                                        thisAminoPosition === annotationItem.position
                                        // Math.abs(thisAminoPosition - annotationItem.position) <= 2
                                    )
                                    {
                                        // Match! Add style
                                        domClass.add(allAminoAcidCell[i], 'Snow_annotation_mark');
                                    }
                                    else if(thisAminoPosition > annotationItem.position)
                                    {
                                        break;
                                    }
                                }
                            }
                        );
                    }

                },

                _loadSpecificAnnotationAndPopupModal: function (name, position, finishCallback) {
                    let _this = this;
                    let requestUrl = 'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1')
                        + ':12080/' + _this.browser.config.BEYONDGBrowseDatasetId + '/annotation/query/' + name + '/' + position + '..' + position;

                    dojoRequest(
                        requestUrl,
                        {
                            method: 'GET',
                            handleAs: 'json'
                        }
                    ).then(
                        function (annotationObjectArray) {
                            SnowConsole.info('annotationObjectArray:', annotationObjectArray);
                            let annotationDialog = new SnowAnnotationDialog(
                                {
                                    refName: name,
                                    position: position,
                                    annotationObjectArray: annotationObjectArray,
                                    browser: _this.browser,
                                    style: {
                                        width: '600px'
                                    },
                                    setCallback: function () {
                                        // Make sure the annotation is successfully inserted
                                        dojoRequest(
                                            requestUrl,
                                            {
                                                method: 'GET',
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

                    let extraBases = (sequence.length - offset) % 3;
                    let seqSliced = sequence.slice( offset, sequence.length - extraBases );

                    let translated = "";
                    for( let i = 0; i < seqSliced.length; i += 3 ) {
                        let nextCodon = seqSliced.slice(i, i + 3);
                        let aminoAcid = _this._codonTable[nextCodon] || _this.nbsp;
                        translated += aminoAcid;
                    }
                    translated = reverse ? translated.split("").reverse().join("") : translated;
                    return translated;
                },

                _printRefSeqAndConceptualTranslation: function (_this, refName, startPos, endPos) {
                    _this.store.getReferenceSequence(
                        {
                            ref: refName,
                            start: startPos - 2,
                            end: endPos + 2
                        },
                        function (refGenomeSequence) {
                            let leftover = (refGenomeSequence.length - 2) % 3;
                            let extStartSeq = refGenomeSequence.substring(0, refGenomeSequence.length - 2);
                            let extEndSeq = refGenomeSequence.substring(2);

                            let refGenomeSequenceReverse = refGenomeSequence.split("").reverse().join("");
                            SnowConsole.info('refGenomeSequence', refName, startPos, endPos, refGenomeSequence);
                            SnowConsole.info('refGenomeSequenceReverse', refName, startPos, endPos, refGenomeSequenceReverse);

                            for (let i = 0; i < 3; i++) {
                                let transStart = startPos + i;
                                let frame = (transStart % 3 + 3) % 3;
                                let translatedProteinSeq = _this._getTranslationSequence(_this, extEndSeq, i, false);
                                SnowConsole.info('translatedProteinSeq', refName, startPos, endPos, 'frame' + frame, 'forward', translatedProteinSeq);
                            }

                            for (let i = 0; i < 3; i++) {
                                let transStart = startPos + 1 - i;
                                let leftover = (refGenomeSequence.length - 2) % 3;
                                let frame = (transStart % 3 + 3 + leftover) % 3;
                                let translatedProteinSeqReverse = _this._getTranslationSequence(_this, extStartSeq, i, true);
                                SnowConsole.info('translatedProteinSeq', refName, startPos, endPos, 'frame' + frame, 'reverse', translatedProteinSeqReverse);
                            }

                        },
                        function (error) {
                            console.error(error);
                        }
                    )
                },

                // Deprecated
                _renderProteoformSequence_Old: function(
                    proteoformSequence, offset,
                    blockStart, blockEnd,
                    blockLength, scale, modificationPositionArray
                ){
                    let charSize = this.getCharacterMeasurements("aminoAcid");
                    let bigTiles = scale > charSize.w + 4; // whether to add .big styles to the base tiles
                    let charWidth = 100 / (blockLength / 3);

                    let container = domConstruct.create(
                        'div',
                        {
                            className: 'Snow_translatedSequence'
                        }
                    );

                    let tableWidthPercent = (charWidth * proteoformSequence.length);
                    tableWidthPercent = tableWidthPercent <= 100 ? tableWidthPercent : 100;
                    let table  = domConstruct.create('table',
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
                    let tr = domConstruct.create('tr', {}, table );
                    table.style.left = (charWidth*offset/3) + "%";

                    let blockWidth = blockLength * scale;
                    // let tableWidthScale = 100 / (charWidth * proteoformSequence.length);
                    // let tableActualWidth = blockWidth / tableWidthScale;
                    // let spanActualWidth = (tableActualWidth - proteoformSequence.length) / proteoformSequence.length;
                    let spanActualWidth = blockWidth * (tableWidthPercent * 0.01) / proteoformSequence.length;


                    charWidth = 100 / proteoformSequence.length + "%";

                    let drawChars = scale >= charSize.w;
                    if( drawChars )
                        table.className += ' big';

                    for( let i=0; i<proteoformSequence.length; i++ ) {
                        let aminoAcidSpan = document.createElement('td');
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
                }
            }
        );
    }
);
