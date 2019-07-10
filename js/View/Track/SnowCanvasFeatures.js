// Snow 2019-06-03
define(
    [
        'dojo/_base/declare',
        'dojo/request',
        'dojo/dom-construct',
        'dojo/Deferred',
        'JBrowse/View/Track/CanvasFeatures',
        'JBrowse/Util',
        'JBrowse/CodonTable'
    ],
    function (
        declare,
        request,
        domConstruct,
        dojoDeferred,
        CanvasFeatures,
        Util,
        CodonTable
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
                CodonTable
            ],
            {
                constructor: function(arg) {
                    this._codonTable = this.defaultCodonTable;
                    //console.log(this.defaultCodonTable);
                },

                _translateSequenceToProtein: function(sequence, isReverse){
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

                queryFeatures: function(refName, startPos, endPos){
                    let requestPromise = request(
                        'http://172.25.176.241:12345/' + refName + '/' +
                        startPos + '..' + endPos + '/uniprot_id', {
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

                fillBlock: function(renderArgs) {
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
                        function (refGenomeSeq) {
                            console.log(refGenomeSeq);
                            // Execute when Retrieve reference sequence complete
                            dataObject.translatedRefSeqs =
                                _this._translateSequenceToProtein(refGenomeSeq, false);

                            let requestPromise = _this.queryFeatures(_this.refSeq.name, leftBase, rightBase);
                            return requestPromise;
                        },
                        function (errorReason) {
                            console.error(errorReason);
                        }
                    ).then(
                        function (recordObjectArray) {
                            dataObject.proteinData = recordObjectArray;
                            mapProteinSeqDeferred.resolve(dataObject);
                        },
                        function (reasonWhyRequestFail) {
                            console.error(reasonWhyRequestFail);
                        }
                    );

                    mapProteinSeqDeferred.then(
                        function (dataObject) {
                            console.log(dataObject);

                            let mappedObj = null;
                            let maxCommonSeq = {
                                id: null,
                                length: 0
                            };
                            for(let i=0; i< dataObject.proteinData.length; i++)
                            {
                                let commonSeqLength = getLcs.call(this,dataObject.translatedRefSeqs,
                                    dataObject.proteinData[i].sequence);

                                if(commonSeqLength > maxCommonSeq.length)
                                {
                                    maxCommonSeq.id = i;
                                    maxCommonSeq.length = commonSeqLength;
                                }
                            }

                            console.log('Result: ', maxCommonSeq);
                            if(dataObject.proteinData.hasOwnProperty(maxCommonSeq.id))
                            {
                                console.log(dataObject.proteinData[maxCommonSeq.id].scanId);
                                console.log(dataObject.proteinData[maxCommonSeq.id].sequence);
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
                                        innerHTML: 'Your web browser cannot display this type of track.',
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
                        let errorMsg = 'Scale level is' + scaleLevel +
                            ' (less than 5), range too large: ' + leftBase+'~'+rightBase;
                        getRefSeqDeferred.reject(errorMsg);
                    }

                }

            }
        );
        
    }
);
