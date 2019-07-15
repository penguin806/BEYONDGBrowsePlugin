// Snow 2019-06-03
define(
    [
        'dojo/_base/declare',
        'dojo/request',
        'dojo/dom-construct',
        'dojo/Deferred',
        'dojo/topic',
        'JBrowse/View/Track/CanvasFeatures',
        'JBrowse/Util',
        'JBrowse/CodonTable',
        // 'JBrowse/View/Track/_YScaleMixin',
        'SnowPlugin/View/Track/SnowHistogramTrack'
    ],
    function (
        declare,
        request,
        domConstruct,
        dojoDeferred,
        dojoTopic,
        CanvasFeatures,
        Util,
        CodonTable,
        // YScaleMixin,
        SnowHistogramTrack
    ) {
        return declare(
            [
                CanvasFeatures,
                CodonTable,
                // YScaleMixin,
                SnowHistogramTrack
            ],
            {
                constructor: function(arg)
                {
                    this._codonTable = this.defaultCodonTable;
                    //console.log(this.defaultCodonTable);
                    // this.makeYScale({
                    //     fixBounds: false,
                    //     min: 200,
                    //     max: 1000
                    // });
                },

                _getLongestCommonSubSequenceMatrix: function(str1, str2)
                {
                    var result = [];
                    for (var i = -1; i < str1.length; i = i + 1)
                    {
                        result[i] = [];
                        for (var j = -1; j < str2.length; j = j + 1)
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
                    let requestPromise = request(
                        'http://192.168.254.9:12345/' + refName + '/' +
                        startPos + '..' + endPos + '/uniprot_id',
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
                    var mapACIDMass=new Map([
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

                    var iSCANNO=936;
                    var intCurrentPos=0;
                    var arrBIonPosition = [];//B 离子的序列position
                    var arrBIonNUM = [];//B 离子的质谱position

                    var iCurrentSeqPositionWithoutPTM=0;
                    var dCurrentMassSUM=0.0;
                    var boolPTM=false;
                    var strPTM="";
                    var dSpanThreshold=10;


                    function RecongnazieTheBIonPosition() {

                        var dSpan=dSpanThreshold;//the span threshold with mass and percusor
                        for (var j = intCurrentPos; j < arrMSScanMass.length; j++) {

                            //收敛到一点，向后探索

                            var doubleCheckMassDistance = arrMSScanMass[j] - dCurrentMassSUM;
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

                    for (var i = 0; i < strSenquence.length; i++) {

                        var dCurrentMass=mapACIDMass.get(strSenquence[i]);
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


                    var num = [1, 3, 4, 5, 6, 8, 9, 14, 20, 23, 31, 55, 99];
                    var nearly = new Array(100);

                    function calculate() {
                        var base = 10;
                        var swap;
                        for (var i = 0; i < num.length; i++) {
                            var s = check(num[i], base);
                            for (var j = 0; j < nearly.length; j++) {
                                if (s < check(nearly[j], base)) {
                                    swap = num[i];
                                    num[i] = nearly[j];
                                    nearly[j] = swap;
                                }
                            }
                        }

                        console.log(arrBIonPosition);
                        console.log(arrBIonNUM);

                        var arrBionPositionAndNumObject = [];
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
                    let proteoformSequenceLengthWithoutModification = proteoformSequence.replace(/\[\w*\]|\(|\)|\./g,'').length;

                    let lengthPerAminoAcid = (proteoformEndPosition - proteoformStartPosition)
                        / proteoformSequenceLengthWithoutModification;

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
                    proteoformSequence, filteredMSScanMassMappingResultArray,
                    proteoformStartPosition, proteoformEndPosition, blockIndex
                )
                {
                    dojoTopic.publish('snow/showProteoform',
                        proteoformSequence, filteredMSScanMassMappingResultArray,
                        proteoformStartPosition, proteoformEndPosition, blockIndex
                    );
                },

                fillBlock: function(renderArgs)
                {
                    let _this = this;
                    let blockIndex = renderArgs.blockIndex;
                    let blockObject = renderArgs.block;
                    let blockWidth = blockObject.domNode.offsetWidth;
                    let leftBase = renderArgs.leftBase;
                    let rightBase = renderArgs.rightBase;
                    let scaleLevel = renderArgs.scale;

                    let getReferenceSequenceDeferred = new dojoDeferred();
                    let mapTranslatedProteinSequenceToRequestedProteoformDeferred = new dojoDeferred();
                    let drawResultsDeferred = new dojoDeferred();

                    let proteinInfoObject = {
                        translatedRefSeqs: null,
                        requestedProteoformObjectArray: null
                    };

                    getReferenceSequenceDeferred.then(
                        function (refGenomeSeq)
                        {
                            // Execute when Retrieving reference genome sequence complete
                            let translatedProteinSequence = _this._translateGenomeSequenceToProtein(refGenomeSeq, false);
                            console.info('refGenomeSeq:', refGenomeSeq);
                            console.info('translatedProteinSequence:', translatedProteinSequence);
                            proteinInfoObject.translatedRefSeqs = translatedProteinSequence;

                            // Return promise from dojo request
                            return _this._queryFeatures(_this.refSeq.name, leftBase, rightBase);
                        },
                        function (errorReason)
                        {
                            console.error(errorReason);
                        }
                    ).then(
                        function (recordObjectArray)
                        {
                            if(recordObjectArray !== undefined)
                            {
                                let parsedRecords = _this._parseRequestedObject(recordObjectArray);
                                proteinInfoObject.requestedProteoformObjectArray = parsedRecords;
                                mapTranslatedProteinSequenceToRequestedProteoformDeferred.resolve(proteinInfoObject);
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
                            let longestCommonSeq = {
                                id: null,
                                matrix: [],
                                length: 0
                            };
                            for(let i=0; i< proteinInfoObject.requestedProteoformObjectArray.length; i++)
                            {
                                const translatedSeq = proteinInfoObject.translatedRefSeqs[0];
                                const proteoformToCompare = proteinInfoObject.requestedProteoformObjectArray[i].sequence.replace(/\[\w*\]|\(|\)|\./g,'');

                                let matrix = _this._getLongestCommonSubSequenceMatrix(
                                    translatedSeq,
                                    proteoformToCompare
                                );

                                let length = _this._getLcsMatrixLength(
                                    translatedSeq,
                                    proteoformToCompare,
                                    matrix
                                );

                                if(length > longestCommonSeq.length)
                                {
                                    longestCommonSeq.id = i;
                                    longestCommonSeq.matrix = matrix;
                                    longestCommonSeq.length = length;
                                }
                            }

                            console.info('longestCommonSeq: ', longestCommonSeq);
                            if(proteinInfoObject.requestedProteoformObjectArray.hasOwnProperty(longestCommonSeq.id))
                            {
                                console.info('scanId:', proteinInfoObject.requestedProteoformObjectArray[longestCommonSeq.id].scanId);
                                console.info('sequence:', proteinInfoObject.requestedProteoformObjectArray[longestCommonSeq.id].sequence);
                                console.info('arrMSScanMassArray:', proteinInfoObject.requestedProteoformObjectArray[longestCommonSeq.id].arrMSScanMassArray);
                                console.info('arrMSScanPeakAundance:', proteinInfoObject.requestedProteoformObjectArray[longestCommonSeq.id].arrMSScanPeakAundance);


                                let mappingResultObjectArray = _this._calcMSScanMass(
                                    proteinInfoObject.requestedProteoformObjectArray[longestCommonSeq.id].sequence,
                                    proteinInfoObject.requestedProteoformObjectArray[longestCommonSeq.id].arrMSScanMassArray,
                                    proteinInfoObject.requestedProteoformObjectArray[longestCommonSeq.id].arrMSScanPeakAundance
                                );
                                console.info('mappingResultObjectArray:', mappingResultObjectArray);

                                let filteredMSScanMassMappingResultArray = _this._filterMSScanMassMappingResultForCurrentBlock(
                                    leftBase,
                                    rightBase,
                                    mappingResultObjectArray,
                                    proteinInfoObject.requestedProteoformObjectArray[longestCommonSeq.id].sequence,
                                    proteinInfoObject.requestedProteoformObjectArray[longestCommonSeq.id]._start,
                                    proteinInfoObject.requestedProteoformObjectArray[longestCommonSeq.id].end
                                );

                                _this._publishDrawProteoformSequenceEvent(
                                    proteinInfoObject.requestedProteoformObjectArray[longestCommonSeq.id].sequence,
                                    filteredMSScanMassMappingResultArray,
                                    proteinInfoObject.requestedProteoformObjectArray[longestCommonSeq.id]._start,
                                    proteinInfoObject.requestedProteoformObjectArray[longestCommonSeq.id].end,
                                    blockIndex
                                );

                                console.info('filteredMSScanMassMappingResultArray:', filteredMSScanMassMappingResultArray);
                                renderArgs.dataToDraw = filteredMSScanMassMappingResultArray;
                                _this.fillHistograms(renderArgs);
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
