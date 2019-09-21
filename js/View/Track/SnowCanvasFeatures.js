// Snow 2019-06-03
define(
    [
        'dojo/_base/declare',
        'dojo/_base/lang',
        'dojo/request',
        'dojo/dom-construct',
        'dojo/Deferred',
        'dojo/topic',
        'JBrowse/View/Track/CanvasFeatures',
        'JBrowse/View/TrackConfigEditor',
        'JBrowse/View/ConfirmDialog',
        'JBrowse/Util',
        'JBrowse/CodonTable',
        './SnowHistogramTrack'
    ],
    function (
        declare,
        dojoLang,
        dojoRequest,
        domConstruct,
        dojoDeferred,
        dojoTopic,
        CanvasFeatures,
        TrackConfigEditor,
        ConfirmDialog,
        Util,
        CodonTable,
        SnowHistogramTrack
    ) {
        return declare(
            [
                CanvasFeatures,
                CodonTable,
                SnowHistogramTrack
            ],
            {
                constructor: function(arg)
                {
                    let _this = this;
                    _this._codonTable = this._codonTable ? this._codonTable : this.defaultCodonTable;
                    _this.originalLabelText = _this.config.label || "";
                    // _this.browser.subscribe(
                    //     '/jbrowse/v1/n/tracks/visibleChanged',
                    //     function () {
                    //         _this.redraw();
                    //     }
                    // );
                    //console.log(this.defaultCodonTable);
                    // this.makeYScale({
                    //     fixBounds: false,
                    //     min: 200,
                    //     max: 1000
                    // });

                },

                _defaultConfig: function(){
                    let oldConfig = this.inherited(arguments);
                    let newConfig = dojoLang.mixin(
                        oldConfig,{
                            showMzValue: false,
                            alignByIonPosition: true
                        });

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
                            label: 'Show M/Z Value',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!_this.config.showMzValue,
                            onClick: function(event){
                                _this.config.showMzValue = this.checked;
                                _this.changed();
                            }
                        },
                        {
                            label: 'Align by bIon Position',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!_this.config.alignByIonPosition,
                            onClick: function(event){
                                _this.config.alignByIonPosition = this.checked;
                                _this.changed();
                            }
                        }
                    ];


                    return newTrackMenuOptions;
                },

                _getLongestCommonSubSequenceMatrix: function(str1, str2)
                {
                    let result = [];
                    for (let i = -1; i < str1.length; i = i + 1)
                    {
                        result[i] = [];
                        for (let j = -1; j < str2.length; j = j + 1)
                        {
                            if (i === -1 || j === -1)
                            {
                                result[i][j] = 0;
                            } else if (str1[i] === str2[j]) {
                                result[i][j] = result[i - 1][j - 1] + 1;
                            } else {
                                result[i][j] = Math.max(result[i - 1][j], result[i][j - 1]);
                            }
                        }
                    }
                    return result;
                },

                _getLcsMatrixLength: function(str1, str2, matrix)
                {
                    const str1Length = str1.length;
                    const str2Length = str2.length;

                    return matrix[str1Length - 1][str2Length - 1];
                },

                _translateGenomeSequenceToProtein: function(sequence, isReverse)
                {
                    let threeTranslatedSeqs = [];

                    for(let offset=0; offset<3; offset++)
                    {
                        let slicedSequence = sequence.slice(offset,sequence.length-offset);
                        let translatedSeq = "";
                        for(let i=0; i<slicedSequence.length; i+=3)
                        {
                            let theCodon = slicedSequence.slice(i, i+3);
                            let aminoAcid = this._codonTable[theCodon] || '#';
                            translatedSeq += aminoAcid;
                        }

                        threeTranslatedSeqs[offset] = translatedSeq;
                    }

                    return threeTranslatedSeqs;
                },

                _parseRequestedObject: function(recordObjectArray)
                {
                    if(recordObjectArray === undefined)
                        return;
                    for(let i=0; i<recordObjectArray.length; i++)
                    {
                        if(recordObjectArray[i].hasOwnProperty('_start'))
                        {
                            recordObjectArray[i]._start = parseInt(recordObjectArray[i]._start);
                        }
                        if(recordObjectArray[i].hasOwnProperty('end'))
                        {
                            recordObjectArray[i].end = parseInt(recordObjectArray[i].end);
                        }
                        if(recordObjectArray[i].hasOwnProperty('arrMSScanMassArray'))
                        {
                            for(let property in recordObjectArray[i].arrMSScanMassArray)
                            {
                                recordObjectArray[i].arrMSScanMassArray[property] =
                                    parseFloat(recordObjectArray[i].arrMSScanMassArray[property]);
                            }
                        }
                        if(recordObjectArray[i].hasOwnProperty('arrMSScanPeakAundance'))
                        {
                            for(let property in recordObjectArray[i].arrMSScanPeakAundance)
                            {
                                recordObjectArray[i].arrMSScanPeakAundance[property] =
                                    parseFloat(recordObjectArray[i].arrMSScanPeakAundance[property]);
                            }
                        }
                    }

                    return recordObjectArray;
                },

                _queryFeatures: function(refName, startPos, endPos)
                {
                    let requestPromise = dojoRequest(
                        'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1') + ':12080' + '/ref/' + refName + '/' +
                        startPos + '..' + endPos,
                        {
                            method: 'GET',
                            headers: {
                                'X-Requested-With': null
                                //'User-Agent': 'SnowPlugin-FrontEnd'
                            },
                            handleAs: 'json'
                        }
                    );
                    return requestPromise;
                },

                _sortArrMSScanMassAndArrMSScanPeakAundance: function(arrMSScanMass, arrMSScanPeakAundance)
                {
                    let list = [];
                    for (let i = 0; i < arrMSScanMass.length; i++)
                    {
                        list.push(
                            {
                                'MSScanMass': arrMSScanMass[i],
                                'MSScanPeakAundance': arrMSScanPeakAundance[i]
                            }
                        );
                    }

                    list.sort(
                        function(a, b) {
                            if(a.MSScanMass < b.MSScanMass)
                            {
                                return -1;
                            }
                            else if(a.MSScanMass === b.MSScanMass)
                            {
                                return 0;
                            }
                            else
                            {
                                return 1;
                            }
                        }
                    );

                    for (let j = 0; j < list.length; j++) {
                        arrMSScanMass[j] = list[j].MSScanMass;
                        arrMSScanPeakAundance[j] = list[j].MSScanPeakAundance;
                    }

                },

                _calcMSScanMass: function(strSenquence, arrMSScanMass, arrMSScanPeakAundance)
                {
                    this._sortArrMSScanMassAndArrMSScanPeakAundance(arrMSScanMass, arrMSScanPeakAundance);

                    //ACIDS MASS AND COMMON PTM MASS, THE mapACIDMass can be extended by adding other PTM
                    let mapACIDMass=new Map([
                        ["G",57.0215],
                        ["A",71.0371],
                        ["S",87.032],
                        ["P",97.0528],
                        ["V",99.0684],
                        ["T",101.0477],
                        ["C",103.0092],
                        ["I",113.0841],
                        ["L",113.0841],
                        ["N",114.0429],
                        ["D",115.0269],
                        ["Q",128.0586],
                        ["K",128.095],
                        ["E",129.0426],
                        ["M",131.0405],
                        ["H",137.0589],
                        ["F",147.0684],
                        ["R",156.1011],
                        ["Y",163.0633],
                        ["W",186.0793],
                        ["Acetylation",42.01056],
                        ["Acetyl",42.01056],
                        ["Methylation",14.01565],
                        ["Dimethylation",28.0313],
                        ["Trimethylation",42.04695],
                        ["Phosphorylation",79.96633]
                    ]);

                    let iSCANNO=936;
                    let intCurrentPos=0;
                    let arrBIonPosition = [];//B 离子的序列position
                    let arrBIonNUM = [];//B 离子的质谱position

                    let iCurrentSeqPositionWithoutPTM=0;
                    let dCurrentMassSUM=0.0;
                    let boolPTM=false;
                    let strPTM="";
                    let dSpanThreshold=0.5;


                    function RecongnazieTheBIonPosition() {

                        let dSpan=dSpanThreshold;//the span threshold with mass and percusor
                        for (let j = intCurrentPos; j < arrMSScanMass.length; j++) {

                            //收敛到一点，向后探索

                            let doubleCheckMassDistance = arrMSScanMass[j] - dCurrentMassSUM;
                            console.log("sum:",dCurrentMassSUM,"POS:",j," mass:",arrMSScanMass[j]," span:",doubleCheckMassDistance);

                            if (doubleCheckMassDistance > dSpan)
                                if(dSpan===dSpanThreshold)//质量间隔非常远
                                    return;
                                else
                                    break;
                            //if (Math.abs(doubleCheckMassDistance) > dSpan) break;//protein SEQUENCE前缀质量大于质谱质量

                            if (Math.abs(doubleCheckMassDistance) > dSpan)
                            {

                                intCurrentPos = j+1;//b离子的position
                                continue;

                            }//protein SEQUENCE前缀质量大于质谱质量

                            dSpan = Math.abs(doubleCheckMassDistance);//找到了匹配更小的值
                            intCurrentPos = j;//b离子的position


                        }
                        arrBIonNUM.push(intCurrentPos++);

                        arrBIonPosition.push(iCurrentSeqPositionWithoutPTM);
                    }

                    for (let i = 0; i < strSenquence.length; i++) {

                        let dCurrentMass=mapACIDMass.get(strSenquence[i]);
                        //console.log(i,dCurrentMass)

                        if(dCurrentMass!==undefined && boolPTM===false)
                        {
                            dCurrentMassSUM += dCurrentMass;
                            iCurrentSeqPositionWithoutPTM++;

                            console.log(iCurrentSeqPositionWithoutPTM," ",strSenquence[i],dCurrentMass," sum:",dCurrentMassSUM)

                            RecongnazieTheBIonPosition();

                        }else
                        {
                            if (strSenquence[i]==="(") continue;//filter out special char
                            if (strSenquence[i]===")") continue;//filter out special char

                            if (strSenquence[i]==="[")//PTM is begining
                            {
                                boolPTM=true;
                                continue;
                            }
                            else if(strSenquence[i]==="]")//add last PTM mass
                            {
                                boolPTM=false;
                                let dCurrentMass=mapACIDMass.get(strPTM);
                                //console.log("]",strPTM,dCurrentMass)

                                if(!isNaN(dCurrentMass))
                                    dCurrentMassSUM += dCurrentMass;
                                console.log(strPTM,dCurrentMass," sum:",dCurrentMassSUM);
                                RecongnazieTheBIonPosition();

                                strPTM="";//set PTM is nothing

                                continue;
                            }
                            else if(strSenquence[i]===";")//add internal PTM mass
                            {
                                let dCurrentMass=mapACIDMass.get(strPTM);
                                //console.log(";",strPTM,dCurrentMass)
                                if(!isNaN(dCurrentMass))
                                    dCurrentMassSUM += dCurrentMass;
                                console.log(strPTM,dCurrentMass," sum:",dCurrentMassSUM);

                                RecongnazieTheBIonPosition();

                                strPTM="";//set PTM is nothing
                                continue;
                            }
                            strPTM+=strSenquence[i];

                        }

                    }


                    let num = [1, 3, 4, 5, 6, 8, 9, 14, 20, 23, 31, 55, 99];
                    let nearly = new Array(100);

                    function calculate() {
                        let base = 10;
                        let swap;
                        for (let i = 0; i < num.length; i++) {
                            let s = check(num[i], base);
                            for (let j = 0; j < nearly.length; j++) {
                                if (s < check(nearly[j], base)) {
                                    swap = num[i];
                                    num[i] = nearly[j];
                                    nearly[j] = swap;
                                }
                            }
                        }

                        console.log(arrBIonPosition);
                        console.log(arrBIonNUM);

                        let arrBionPositionAndNumObject = [];
                        for(let i=0; i<arrBIonPosition.length && i<arrBIonNUM.length; i++)
                        {
                            let newObject = {};
                            newObject.key = arrMSScanMass[ arrBIonNUM[i] ];
                            newObject.value = arrMSScanPeakAundance[ arrBIonNUM[i] ];
                            newObject.label = 'A' + i;
                            newObject.amino_acid = strSenquence.charAt( arrBIonPosition[i] );
                            newObject.position = arrBIonPosition[i];
                            if(newObject.key !== undefined)
                            {
                                arrBionPositionAndNumObject.push(newObject);
                            }
                        }

                        return arrBionPositionAndNumObject;
                    }

                    function check(i, j) {
                        if (i > j) {
                            return i - j;
                        } else {
                            return j - i;
                        }

                    }

                    return calculate();
                },

                _filterMSScanMassMappingResultForCurrentBlock: function(
                    blockLeftBase, blockRightBase, mappingResultObjectArray,
                    proteoformSequence, proteoformStartPosition, proteoformEndPosition
                )
                {
                    // let proteoformSequenceLengthWithoutModification = proteoformSequence.replace(/\[\w*\]|\(|\)|\./g,'').length;
                    // let proteoformSequenceLength = proteoformSequence.length;
                    // let lengthPerAminoAcid = (proteoformEndPosition - proteoformStartPosition)
                    //    / proteoformSequenceLength;
                    // 2019-08-14
                    let lengthPerAminoAcid = 3;

                    let newResultObjectArray = [];
                    for(let index in mappingResultObjectArray)
                    {
                        if(mappingResultObjectArray.hasOwnProperty(index))
                        {
                            let MSScanMassPosition = proteoformStartPosition +
                                lengthPerAminoAcid * mappingResultObjectArray[index].position;

                            if(MSScanMassPosition > blockLeftBase && MSScanMassPosition < blockRightBase)
                            {
                                newResultObjectArray.push(mappingResultObjectArray[index]);
                            }
                        }
                    }

                    return newResultObjectArray;
                },

                _publishDrawProteoformSequenceEvent: function(
                    proteoformSequence, proteoformStartPosition, proteoformEndPosition,
                    isReverseStrand, scanId, mSScanMassMappingResultArray, msScanMassTrackId
                )
                {
                    dojoTopic.publish('BEYONDGBrowse/addSingleProteoformScan',
                        proteoformSequence, proteoformStartPosition, proteoformEndPosition,
                        isReverseStrand, scanId, mSScanMassMappingResultArray, msScanMassTrackId
                    );
                },

                _formatProteoformSequenceString: function(
                    proteoformSequence, isReverse
                )
                {
                    let proteoformSequenceWithoutPrefixAndSuffix =
                        proteoformSequence.replace(/(.*\.)(.*)(\..*)/, '$2');
                    let proteoformSequenceWithoutParentheses =
                        proteoformSequenceWithoutPrefixAndSuffix.replace(/\(|\)/g, '');
                    // Example:
                    // A.TKAARKSAPATGGVKKPHRYRPGTVALREIRRYQKST(ELLIRKLPFQRLVREIAQDFKTDLRFQSSAV)[Acetyl]MALQEASEAYLVGLFEDTNLCAIHAKRVTIMPKDIQLARRIRGERA.
                    // -> TKAARKSAPATGGVKKPHRYRPGTVALREIRRYQKSTELLIRKLPFQRLVREIAQDFKTDLRFQSSAV[Acetyl]MALQEASEAYLVGLFEDTNLCAIHAKRVTIMPKDIQLARRIRGERA

                    if(isReverse)
                    {
                        return proteoformSequenceWithoutParentheses.replace(
                                /\[.*?\]/g,
                                function(modification)
                                {
                                    return modification.split('').reverse().join('')
                                }
                            ).split('').reverse().join('');
                        // -> AREGRIRRALQIDKPMITVRKAHIACLNTDEFLGVLYAESAEQLAM[Acetyl]VASSQFRLDTKFDQAIERVLRQFPLKRILLETSKQYRRIERLAVTGPRYRHPKKVGGTAPASKRAAKT
                    }
                    else
                    {
                        return proteoformSequenceWithoutParentheses;
                    }

                },

                // showRange: function(
                //     first, last, startBase,
                //     bpPerBlock, scale,
                //     containerStart, containerEnd, finishCallback
                // ) {
                //     console.log(arguments);
                //     let _this = this;
                //     let oldFinishCallback = finishCallback ? finishCallback : function() {};
                //     let newFinishCallback = function(){
                //         oldFinishCallback();
                //         _this.browser.publish('BEYONDGBrowse/drawProteoformScans');
                //     };
                //     _this.inherited(
                //         arguments,
                //         [
                //             first, last, startBase, bpPerBlock, scale,
                //             containerStart, containerEnd, newFinishCallback
                //         ]
                //     );
                // },

                fillBlock: function(renderArgs)
                {
                    let _this = this;
                    let blockIndex = renderArgs.blockIndex;
                    let blockObject = renderArgs.block;
                    blockObject.blockIndex = blockIndex;
                    let blockWidth = blockObject.domNode.offsetWidth;
                    let leftBase = renderArgs.leftBase;
                    let rightBase = renderArgs.rightBase;
                    let scaleLevel = renderArgs.scale;

                    let getReferenceSequenceDeferred = new dojoDeferred();
                    let mapTranslatedProteinSequenceToRequestedProteoformDeferred = new dojoDeferred();
                    let drawResultsDeferred = new dojoDeferred();

                    let proteinInfoObject = {
                        translatedReferenceSequence: null,              // Eg: chr1:149813526..149813620 (95 b)
                        translatedFullRangeReferenceSequence: null,     // Eg: chr1:149813271..149813681 (411 b)
                        requestedProteoformObjectArray: null
                    };

                    // 1. Retrieve reference genome sequence within current block:
                    getReferenceSequenceDeferred.then(
                        function (refGenomeSeq)
                        {
                            // 2. Translate genome sequence into conceptual protein sequence
                            let translatedProteinSequence = _this._translateGenomeSequenceToProtein(refGenomeSeq, false);
                            console.info('refGenomeSeq:', leftBase, rightBase, refGenomeSeq);
                            console.info('translatedProteinSequence:', leftBase, rightBase, translatedProteinSequence);
                            proteinInfoObject.translatedReferenceSequence = translatedProteinSequence;

                            // 3. Query BeyondGBrowse backend, return 'promise' produced by dojo/request
                            return _this._queryFeatures(_this.refSeq.name, leftBase, rightBase);
                        },
                        function (errorReason)
                        {
                            console.error(errorReason);
                        }
                    ).then(
                        function (recordObjectArray)
                        {
                            // 4. If region of this block is included in database, BeyondGBrowse backend will response with a json array,
                            //    which contains <start & end position>, <proteoform sequence>, <strand (forward/reverse)>, <msScan mass&intensity> of all scan(s)
                            if(recordObjectArray !== undefined && recordObjectArray.length > 0)
                            {
                                let fullRangeLeftPos = parseInt(recordObjectArray[0]._start);
                                let fullRangeRightPos = parseInt(recordObjectArray[0].end);
                                // 5. Retrieve reference genome sequence within ENTIRE proteoform region
                                _this.store.getReferenceSequence(
                                    {
                                        ref: _this.refSeq.name,
                                        start: fullRangeLeftPos,
                                        end: fullRangeRightPos
                                    },
                                    function( fullRangeReferenceGenomeSequence ) {
                                        // 6. Translate reference genome sequence for entire proteoform into conceptual protein sequence,
                                        //    currently three forward translation only, Todo: using reverse translation if the proteoform strand is <->
                                        let translatedFullRangeProteinSequence =
                                            _this._translateGenomeSequenceToProtein(fullRangeReferenceGenomeSequence, false);
                                        console.info('fullRangeReferenceGenomeSequence:', fullRangeLeftPos, fullRangeRightPos, fullRangeReferenceGenomeSequence);
                                        console.info('translatedFullRangeProteinSequence:', fullRangeLeftPos, fullRangeRightPos, translatedFullRangeProteinSequence);
                                        proteinInfoObject.translatedFullRangeReferenceSequence = translatedFullRangeProteinSequence;

                                        proteinInfoObject.requestedProteoformObjectArray = _this._parseRequestedObject(recordObjectArray);
                                        // 7. Fill <Conceptual protein sequence of this block>, <Conceptual protein sequence of entire proteoform region>,
                                        //    <json array responded from backend> into object <proteinInfoObject>, call resolve() to pass <proteinInfoObject> to <mapTranslatedProteinSequenceToRequestedProteoformDeferred>
                                        mapTranslatedProteinSequenceToRequestedProteoformDeferred.resolve(proteinInfoObject);
                                    },
                                    function(errorReason) {
                                        console.error('Retrieve full range genome sequence failed:', errorReason);
                                    }
                                );
                            }
                            else
                            {
                                // Pass empty array to <fillHistograms> (Draw the X-Axis line)
                                renderArgs.dataToDraw = [];
                                _this.fillHistograms(renderArgs);
                            }
                        },
                        function (reasonWhyRequestFail)
                        {
                            console.error(reasonWhyRequestFail);
                        }
                    );

                    mapTranslatedProteinSequenceToRequestedProteoformDeferred.then(
                        function (proteinInfoObject)
                        {
                            console.info('proteinInfoObject:', proteinInfoObject);
                            // 8. Sort the json array responded from BeyondGBrowse backend (DESCEND),
                            //    according to the SIMILARITY between proteoform and conceptual protein sequence,
                            //    implemented using Longest Common Sequence (LCS) algorithm
                            for(let i=0; i < proteinInfoObject.requestedProteoformObjectArray.length; i++)
                            {
                                // 2019-08-14: At first, we format proteoform sequence of each scan.
                                //             If strand is <->, reverse sequence, arrMSScanMassArray, arrMSScanPeakAundance
                                proteinInfoObject.requestedProteoformObjectArray[i].sequence =
                                    _this._formatProteoformSequenceString(
                                        proteinInfoObject.requestedProteoformObjectArray[i].sequence,
                                        proteinInfoObject.requestedProteoformObjectArray[i].strand === '-' ? true : false
                                    );
                                if(proteinInfoObject.requestedProteoformObjectArray[i].strand === '-')
                                {
                                    proteinInfoObject.requestedProteoformObjectArray[i].arrMSScanMassArray =
                                        proteinInfoObject.requestedProteoformObjectArray[i].arrMSScanMassArray.reverse();
                                    proteinInfoObject.requestedProteoformObjectArray[i].arrMSScanPeakAundance =
                                        proteinInfoObject.requestedProteoformObjectArray[i].arrMSScanPeakAundance.reverse();
                                }

                                // 2019-08-04
                                // console.debug('proteinInfoObject.translatedFullRangeReferenceSequence:',
                                //     proteinInfoObject.translatedFullRangeReferenceSequence);
                                // console.debug('proteinInfoObject.requestedProteoformObjectArray[i].sequence:',
                                //     proteinInfoObject.requestedProteoformObjectArray[i].sequence);
                                // const translatedReferenceProteinSequence =
                                //     proteinInfoObject.translatedReferenceSequence[0];

                                // Todo: compare with each of translatedFullRangeReferenceSequence (currently 3 sequence)
                                const translatedReferenceProteinSequence =
                                    proteinInfoObject.translatedFullRangeReferenceSequence[0];
                                const proteoformRemoveModificationToCompare =
                                    proteinInfoObject.requestedProteoformObjectArray[i].sequence.replace(
                                        /\[.*?\]|\(|\)|\./g,
                                        ''
                                    );
                                // Todo: reverse <proteoformRemoveModificationToCompare> if the strand is <->
                                // const proteoformRemoveModificationToCompare = proteoformRemoveModificationToCompare.split('').reverse().join();

                                proteinInfoObject.requestedProteoformObjectArray[i].lcsMatrix =
                                    _this._getLongestCommonSubSequenceMatrix(
                                        translatedReferenceProteinSequence,
                                        proteoformRemoveModificationToCompare
                                    );

                                proteinInfoObject.requestedProteoformObjectArray[i].lcsLength =
                                    _this._getLcsMatrixLength(
                                        translatedReferenceProteinSequence,
                                        proteoformRemoveModificationToCompare,
                                        proteinInfoObject.requestedProteoformObjectArray[i].lcsMatrix
                                    );
                            }

                            proteinInfoObject.requestedProteoformObjectArray.sort(
                                function(itemA, itemB) {
                                    if(itemA.lcsLength < itemB.lcsLength)
                                    {
                                        return 1;
                                    }
                                    else if(itemA.lcsLength === itemB.lcsLength)
                                    {
                                        return 0;
                                    }
                                    else
                                    {
                                        return -1;
                                    }
                                }
                            );

                            if(proteinInfoObject.requestedProteoformObjectArray.length >= 1)
                            {
                                // Read configuration file, determine which rank of scan to take
                                let msScanMassTrackId = _this.config.msScanMassTrackId - 1;
                                if(
                                    msScanMassTrackId === undefined || isNaN(msScanMassTrackId) ||
                                    msScanMassTrackId < 0 ||
                                    msScanMassTrackId >= proteinInfoObject.requestedProteoformObjectArray.length
                                )
                                {
                                    msScanMassTrackId = 0;
                                }

                                let thisProteoformObject = proteinInfoObject.requestedProteoformObjectArray[msScanMassTrackId];
                                let thisProteoformSequence = thisProteoformObject.sequence;
                                let thisProteoformScanId = thisProteoformObject.scanId;
                                let thisProteoformStartPosition = thisProteoformObject._start;
                                let thisProteoformEndPosition = thisProteoformObject.end;
                                let isThisProteoformReverse = thisProteoformObject.strand === '-' ? true : false;
                                console.info('msScanMassTrackId:', msScanMassTrackId);
                                console.info('longestCommonSeqLength:', thisProteoformObject.lcsLength);
                                console.info('scanId:', thisProteoformObject.scanId);
                                console.info('sequence:', thisProteoformObject.sequence);
                                console.info('arrMSScanMassArray:', thisProteoformObject.arrMSScanMassArray);
                                console.info('arrMSScanPeakAundance:', thisProteoformObject.arrMSScanPeakAundance);
                                // Update track label
                                let labelTextToAppend = ' (Scan: ' + thisProteoformObject.scanId + ')';
                                if(_this.originalLabelText + labelTextToAppend !== _this.labelHTML)
                                {
                                    _this.scanId = thisProteoformObject.scanId;
                                    _this.setLabel(_this.originalLabelText + labelTextToAppend);
                                }

                                // 9. Calculating MsScanMass and mapping with proteoform ions
                                let mappingResultObjectArray = undefined;
                                if(
                                    window.BEYONDGBrowse.mSScanMassResultArray.hasOwnProperty(thisProteoformObject.scanId)
                                    && typeof window.BEYONDGBrowse.mSScanMassResultArray[thisProteoformObject.scanId] == "object"
                                )
                                {
                                    mappingResultObjectArray = window.BEYONDGBrowse.mSScanMassResultArray[thisProteoformObject.scanId];
                                }
                                else
                                {
                                    window.BEYONDGBrowse.mSScanMassResultArray[thisProteoformObject.scanId] =
                                        mappingResultObjectArray = _this._calcMSScanMass(
                                        thisProteoformObject.sequence,
                                        thisProteoformObject.arrMSScanMassArray,
                                        thisProteoformObject.arrMSScanPeakAundance
                                    );
                                    console.info('mappingResultObjectArray:', mappingResultObjectArray);
                                }

                                // 10. Take out the parts that needed for current view block
                                let filteredMSScanMassMappingResultArray = _this._filterMSScanMassMappingResultForCurrentBlock(
                                    leftBase,
                                    rightBase,
                                    mappingResultObjectArray,
                                    proteinInfoObject.requestedProteoformObjectArray[msScanMassTrackId].sequence,
                                    proteinInfoObject.requestedProteoformObjectArray[msScanMassTrackId]._start,
                                    proteinInfoObject.requestedProteoformObjectArray[msScanMassTrackId].end
                                );

                                // 11. Draw proteoform sequence at the bottom of SnowSequenceTrack, including ions and modification mark
                                _this._publishDrawProteoformSequenceEvent(
                                    thisProteoformSequence,
                                    thisProteoformStartPosition,
                                    thisProteoformEndPosition,
                                    isThisProteoformReverse,
                                    thisProteoformScanId,
                                    mappingResultObjectArray,
                                    msScanMassTrackId + 1
                                );

                                console.info('filteredMSScanMassMappingResultArray:', filteredMSScanMassMappingResultArray);
                                renderArgs.showMzValue = _this.config.showMzValue === true;
                                // 12. Draw protein mass spectrum histogram within current block region
                                //     X-Axis: m/z
                                //     Y-Axis: intensity
                                let isAlignByIonPosition = _this.config.alignByIonPosition === true;
                                if(isAlignByIonPosition)
                                {
                                    renderArgs.mappingResultObjectArray = mappingResultObjectArray;
                                    renderArgs.proteoformStartPosition = thisProteoformStartPosition;
                                    renderArgs.scanId = thisProteoformScanId;
                                    _this.fillHistograms(renderArgs, true)
                                }
                                else
                                {
                                    renderArgs.dataToDraw = filteredMSScanMassMappingResultArray;
                                    _this.fillHistograms(renderArgs, false);
                                }
                            }

                        }
                    );

                    drawResultsDeferred.then(
                        function (obj) {

                            let layout = _this._getLayout( scaleLevel );
                            let totalHeight = layout.getTotalHeight();
                            // domConstruct.empty( blockObject.domNode );
                            let c = blockObject.featureCanvas =
                                domConstruct.create(
                                    'canvas',
                                    {
                                        height: totalHeight,
                                        width:  blockObject.domNode.offsetWidth+1,
                                        style: {
                                            cursor: 'default',
                                            height: totalHeight+'px',
                                            position: 'absolute'
                                        },
                                        innerHTML: 'Track using Html5 Canvas',
                                        className: 'canvas-track'
                                    },
                                    blockObject.domNode
                                );
                            let ctx = c.getContext('2d');
                            // scale the canvas to work well with the various device pixel ratios
                            _this._scaleCanvas(c);

                            if (blockObject.maxHeightExceeded)
                                _this.markBlockHeightOverflow(blockObject);

                            _this.heightUpdate(totalHeight, blockIndex);

                            // this.renderFeatures(args, fRects);
                            // this.renderClickMap(args, fRects);
                        }

                    );

                    if( scaleLevel > 5 )
                    {
                        domConstruct.empty( blockObject.domNode );

                        this.store.getReferenceSequence(
                            {
                                ref: this.refSeq.name,
                                start: leftBase,
                                end: rightBase
                            },
                            function( refGenomeSeq ) {
                                getReferenceSequenceDeferred.resolve(refGenomeSeq);
                            },
                            function(errorReason) {
                                getReferenceSequenceDeferred.reject(errorReason);
                            }
                        );
                    }
                    else
                    {
                        let errorMsg = 'Scale level is ' + scaleLevel +
                            ' (less than 5), range too large: ' + leftBase+'~'+rightBase;
                        getReferenceSequenceDeferred.reject(errorMsg);
                    }

                }

            }
        );

    }
);
