// Snow 2019-06-03
define(
    [
        'dojo/_base/declare',
        'dojo/request',
        'dojo/dom-construct',
        'JBrowse/View/Track/CanvasFeatures'
    ],
    function (
        declare,
        request,
        domConstruct,
        CanvasFeatures
    ) {

        return declare(
            [
                CanvasFeatures
            ],
            {
                // construct: function (arg) {
                //
                // }
                queryFeatures: function(refName, startPos, endPos){
                    request(
                        'http://172.25.176.241:12345/' + refName + '/' +
                        startPos + '..' + endPos + '/uniprot_id',
                        {
                            method: 'get',
                            headers: {
                                //'Origin': 'http://172.25.176.241:12345'
                                //'User-Agent': 'SnowPlugin-FrontEnd'
                            },
                            handleAs: 'json'
                        }
                        ).then(
                            function (recordObject) {
                                console.log(recordObject);
                            }
                    );
                },

                fillBlock: function(renderArgs) {
                    let blockIndex = renderArgs.blockIndex;
                    let block = renderArgs.block;
                    let blockWidthPx = block.domNode.offsetWidth
                    let leftBase = renderArgs.leftBase;
                    let rightBase = renderArgs.rightBase;
                    let scale = renderArgs.scale;

                    if( scale >5 )
                    {
                        this.store.getReferenceSequence(
                            {
                                ref: this.refSeq.name,
                                start: leftBase,
                                end: rightBase
                            },
                            function( refDNASeq ) {
                                console.log(refDNASeq);
                            },
                            function(error) {
                                console.error(error);
                            }
                        );
                    }
                    else
                    {
                        console.log('Region too large: '+leftBase+'..'+rightBase);
                    }


                    this.queryFeatures(this.refSeq.name, leftBase, rightBase);
                    // Todo: Pass the following code as a callback function to <queryFeatures>

                    const layout = this._getLayout( scale );
                    const totalHeight = layout.getTotalHeight();
                    domConstruct.empty( block.domNode );
                    const c = block.featureCanvas =
                        domConstruct.create(
                            'canvas',
                            {
                                height: totalHeight,
                                width:  block.domNode.offsetWidth+1,
                                style: {
                                    cursor: 'default',
                                    height: totalHeight+'px',
                                    position: 'absolute'
                                },
                                innerHTML: 'Your web browser cannot display this type of track.',
                                className: 'canvas-track'
                            },
                            block.domNode
                        );
                    const ctx = c.getContext('2d');
                    // scale the canvas to work well with the various device pixel ratios
                    this._scaleCanvas(c);

                    if (block.maxHeightExceeded)
                        this.markBlockHeightOverflow(block);

                    this.heightUpdate(totalHeight, blockIndex);

                    // this.renderFeatures(args, fRects);
                    // this.renderClickMap(args, fRects);
                }


            }
        );
        
    }
);
