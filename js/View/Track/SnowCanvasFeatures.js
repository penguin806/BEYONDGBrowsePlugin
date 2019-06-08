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

        return declare(
            [
                CanvasFeatures,
                CodonTable
            ],
            {
                constructor: function(arg) {
                    this._codonTable = this.defaultCodonTable;
                    console.log(this.defaultCodonTable);
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
                            console.log(recordObjectArray);

                            dataObject.proteinData = recordObjectArray;
                            mapProteinSeqDeferred.resolve(dataObject);
                        },
                        function (reasonWhyRequestFail) {
                            console.error(reasonWhyRequestFail);
                        }
                    );

                    mapProteinSeqDeferred.then(
                        function (dataObject) {

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
