// Snow 2019-06-03
define(
    [
        'dojo/_base/declare',
        'dojo/request',
        'dojo/dom-construct',
        'dojo/Deferred',
        'JBrowse/View/Track/CanvasFeatures',
        'JBrowse/Util',
        'JBrowse/CodonTable',
        'SnowPlugin/View/Track/SnowHistogramTrack'
    ],
    function (
        declare,
        request,
        domConstruct,
        dojoDeferred,
        CanvasFeatures,
        Util,
        CodonTable,
        SnowHistogramTrack
    ) {
        var getLcs = function () {
            /**
             * Find the lengths of longest common sub-sequences
             * of two strings and their substrings.
             *
             * Complexity: O(MN).
             *
             * @private
             * @param {String} first string
             * @param {String} second string
             * @return {Array} two dimensional array with LCS
             * lengths of input strings and their substrings.
             *
             */
            function getLcsLengths(str1, str2) {
                var result = [];
                for (var i = -1; i < str1.length; i = i + 1) {
                    result[i] = [];
                    for (var j = -1; j < str2.length; j = j + 1) {
                        if (i === -1 || j === -1) {
                            result[i][j] = 0;
                        } else if (str1[i] === str2[j]) {
                            result[i][j] = result[i - 1][j - 1] + 1;
                        } else {
                            result[i][j] = Math.max(result[i - 1][j], result[i][j - 1]);
                        }
                    }
                }
                return result;
            }
            /**
             * Find longest common sub-sequences of two strings.
             *
             * Complexity: O(M + N).
             *
             * @private
             * @param {String} first string
             * @param {String} second string
             * @return {Array} two dimensional array with LCS
             * lengths of input strings and their substrings
             * returned from 'getLcsLengths' function.
             *
             */
            function getLcs(str1, str2, lcsLengthsMatrix) {
                var execute = function (i, j) {
                    if (!lcsLengthsMatrix[i][j]) {
                        return '';
                    } else if (str1[i] === str2[j]) {
                        return execute(i - 1, j - 1) + str1[i];
                    } else if (lcsLengthsMatrix[i][j - 1] > lcsLengthsMatrix[i - 1][j]) {
                        return execute(i, j - 1);
                    } else {
                        return execute(i - 1, j);
                    }
                };
                return execute(str1.length - 1, str2.length - 1);
            }
            /**
             * Algorithm from dynamic programming. It finds the longest
             * common sub-sequence of two strings. For example for strings 'abcd'
             * and 'axxcda' the longest common sub-sequence is 'acd'.
             *
             * @example
             * var subsequence = require('path-to-algorithms/src/searching/'+
             * 'longest-common-subsequence').longestCommonSubsequence;
             * console.log(subsequence('abcd', 'axxcda'); // 'acd'
             *
             * @public
             * @module searching/longest-common-subsequence
             * @param {String} first input string.
             * @param {String} second input string.
             * @return {Array} Longest common subsequence.
             */
            return function (str1, str2) {
                var lcsLengthsMatrix = getLcsLengths(str1, str2);
                return getLcs(str1, str2, lcsLengthsMatrix);
            };
        };

        return declare(
            [
                CanvasFeatures,
                CodonTable,
                SnowHistogramTrack
            ],
            {
                constructor: function(arg)
                {
                    this._codonTable = this.defaultCodonTable;
                    //console.log(this.defaultCodonTable);
                },



                _translateSequenceToProtein: function(sequence, isReverse)
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

                _calcMSScanMass: function(strSenquence, arrMSScanMass, arrMSScanPeakAundance)
                {
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
                    var dSpanThreshold=40;


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

                        return;
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
                            newObject.label = strSenquence.charAt( arrBIonPosition[i] );
                            newObject.labelIndex = arrBIonPosition[i];
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

                fillBlock: function(renderArgs)
                {
                    let _this = this;
                    let blockIndex = renderArgs.blockIndex;
                    let blockObject = renderArgs.block;
                    let blockWidth = blockObject.domNode.offsetWidth;
                    let leftBase = renderArgs.leftBase;
                    let rightBase = renderArgs.rightBase;
                    let scaleLevel = renderArgs.scale;

                    let getRefSeqDeferred = new dojoDeferred();
                    let mapProteinSeqDeferred = new dojoDeferred();
                    let drawResultsDeferred = new dojoDeferred();

                    let dataObject = {
                        translatedRefSeqs: null,
                        proteinData: null
                    };

                    getRefSeqDeferred.then(
                        function (refGenomeSeq)
                        {
                            // Execute when Retrieve reference sequence complete
                            console.log(refGenomeSeq);
                            dataObject.translatedRefSeqs =
                                _this._translateSequenceToProtein(refGenomeSeq, false);

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
                                dataObject.proteinData = recordObjectArray;
                                mapProteinSeqDeferred.resolve(dataObject);
                            }
                        },
                        function (reasonWhyRequestFail)
                        {
                            console.error(reasonWhyRequestFail);
                        }
                    );

                    mapProteinSeqDeferred.then(
                        function (dataObject)
                        {
                            console.log(dataObject);

                            let mappedObj = null;
                            let maxCommonSeq = {
                                id: null,
                                sequence: "",
                                length: 0
                            };
                            for(let i=0; i< dataObject.proteinData.length; i++)
                            {
                                let commonSequence = getLcs().call(this,dataObject.translatedRefSeqs[0],
                                    dataObject.proteinData[i].sequence.replace(/\[\w*\]|\(|\)|\./g,''));

                                if(commonSequence.length > maxCommonSeq.length)
                                {
                                    maxCommonSeq.id = i;
                                    maxCommonSeq.sequence = commonSequence;
                                    maxCommonSeq.length = commonSequence.length;
                                }
                            }

                            console.log('Result: ', maxCommonSeq);
                            if(dataObject.proteinData.hasOwnProperty(maxCommonSeq.id))
                            {
                                console.log('scanId:', dataObject.proteinData[maxCommonSeq.id].scanId);
                                console.log('sequence:', dataObject.proteinData[maxCommonSeq.id].sequence);
                                console.log('arrMSScanMassArray:', dataObject.proteinData[maxCommonSeq.id].arrMSScanMassArray);
                                console.log('arrMSScanPeakAundance:', dataObject.proteinData[maxCommonSeq.id].arrMSScanPeakAundance);

                                renderArgs.dataToDraw = _this._calcMSScanMass(
                                    dataObject.proteinData[maxCommonSeq.id].sequence,
                                    dataObject.proteinData[maxCommonSeq.id].arrMSScanMassArray,
                                    dataObject.proteinData[maxCommonSeq.id].arrMSScanPeakAundance
                                );

                                console.log('Calculation:', renderArgs.dataToDraw);
                                _this.fillHistograms(renderArgs);
                            }

                        }
                    );

                    drawResultsDeferred.then(
                        function (obj) {


                            let layout = _this._getLayout( scaleLevel );
                            let totalHeight = layout.getTotalHeight();
                            domConstruct.empty( blockObject.domNode );
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
                        this.store.getReferenceSequence(
                            {
                                ref: this.refSeq.name,
                                start: leftBase,
                                end: rightBase
                            },
                            function( refGenomeSeq ) {
                                getRefSeqDeferred.resolve(refGenomeSeq);
                            },
                            function(errorReason) {
                                getRefSeqDeferred.reject(errorReason);
                            }
                        );
                    }
                    else
                    {
                        let errorMsg = 'Scale level is ' + scaleLevel +
                            ' (less than 5), range too large: ' + leftBase+'~'+rightBase;
                        getRefSeqDeferred.reject(errorMsg);
                    }

                }

            }
        );
        
    }
);
