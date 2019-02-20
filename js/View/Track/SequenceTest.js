define(
    [
        'dojo/_base/declare',
        'dojo/dom-construct',
        'dojo/dom-class',
        'JBrowse/View/Track/Sequence'
    ],
    function(
        declare,
        domConstruct,
        domClass,
        Sequence
    )
    {
        return declare(
            [
                Sequence
            ],
            {
                // @Override
                _trackMenuOptions: function() {
                    var that = this;
                    return [
                        { label: 'About this track',
                            title: 'About track: '+(this.key||this.name),
                            iconClass: 'jbrowseIconHelp',
                            action: 'contentDialog',
                            content: dojo.hitch(this,'_trackDetailsContent')
                        },
                        { label: 'Pin to top',
                            type: 'dijit/CheckedMenuItem',
                            title: "make this track always visible at the top of the view",
                            checked: that.isPinned(),
                            //iconClass: 'dijitIconDelete',
                            onClick: function() {
                                that.browser.publish( '/jbrowse/v1/v/tracks/'+( this.checked ? 'pin' : 'unpin' ), [ that.name ] );
                            }
                        },
                        { label: 'Edit config',
                            title: "edit this track's configuration",
                            iconClass: 'dijitIconConfigure',
                            action: function() {
                                new TrackConfigEditor( that.config )
                                    .show( function( result ) {
                                        // replace this track's configuration
                                        that.browser.publish( '/jbrowse/v1/v/tracks/replace', [result.conf] );
                                    });
                            }
                        },
                        { label: 'Delete track',
                            title: "delete this track",
                            iconClass: 'dijitIconDelete',
                            action: function() {
                                new ConfirmDialog({ title: 'Delete track?', message: 'Really delete this track?' })
                                    .show( function( confirmed ) {
                                        if( confirmed )
                                            that.browser.publish( '/jbrowse/v1/v/tracks/delete', [that.config] );
                                    });
                            }
                        }
                    ];
                },

                // @Override
                fillBlock: function(args){

                    var blockIndex = args.blockIndex;
                    var block = args.block;
                    var leftBase = args.leftBase;
                    var rightBase = args.rightBase;
                    var scale = args.scale;

                    var leftExtended = leftBase - 2;
                    var rightExtended = rightBase + 2;

                    var thisB = this;

                    var blur = domConstruct.create(
                        'div',
                        {
                            className: 'sequence_blur',
                            innerHTML: '<span class="loading">Loading</span>'
                        },
                        block.domNode
                    );

                    this.heightUpdate( blur.offsetHeight+2*blur.offsetTop, blockIndex );

                    // if we are zoomed in far enough to draw bases, then draw them
                    if ( scale >= 1.3 ) {
                        this.store.getReferenceSequence(
                            {
                                ref: this.refSeq.name,
                                start: leftExtended,
                                end: rightExtended
                            },
                            function( seq ) {
                                if(seq.trim() == ""){
                                    blur.innerHTML = '<span class="zoom">No sequence available</span>';;
                                }
                                else {
                                    domConstruct.empty( block.domNode );
                                    thisB._fillSequenceBlock( block, blockIndex, scale, seq );
                                }
                                args.finishCallback();
                            },
                            function(error) {
                                if (args.errorCallback)
                                    args.errorCallback(error)
                                else {
                                    console.error(error)
                                    args.finishCallback()
                                }
                            }
                        );
                    }
                    // otherwise, just draw a sort of line (possibly dotted) that
                    // suggests there are bases there if you zoom in far enough
                    else {
                        blur.innerHTML = '<span class="zoom">Zoom in to see sequence</span>';
                        args.finishCallback();
                    }
                },

                // @Override
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

                    // Render forward strand translation
                    if( true )
                    {
                    //if( this.config.showForwardStrand && this.config.showTranslation ) {
                        var frameDiv = [];
                        for( var i = 0; i < 3; i++ ) {
                            var transStart = blockStart + i;
                            var frame = (transStart % 3 + 3) % 3;
                            var translatedDiv = this._renderTranslation( extEndSeq, i, blockStart, blockEnd, blockLength, scale );
                            frameDiv[frame] = translatedDiv;
                            domClass.add( translatedDiv, "frame" + frame );
                        }
                        for( var i = 2; i >= 0; i-- ) {
                            block.domNode.appendChild( frameDiv[i] );
                        }
                    }


                    // Do not render forward strand sequence
                    if( false )
                    {
                        // make a table to contain the sequences
                        var charSize = this.getCharacterMeasurements('sequence');
                        var bigTiles = scale > charSize.w + 4; // whether to add .big styles to the base tiles
                        var seqNode;
                        if( this.config.showReverseStrand || this.config.showForwardStrand )
                            seqNode = domConstruct.create(
                                "table", {
                                    className: "sequence" + (bigTiles ? ' big' : '') + (this.config.showColor ? '' : ' nocolor'),
                                    style: { width: "100%" }
                                }, block.domNode);

                        // add a table for the forward strand
                        if( this.config.showForwardStrand )
                            seqNode.appendChild( this._renderSeqTr( blockStart, blockEnd, blockSeq, scale ));
                    }


                    // Do not render reverse strand sequence and translation
                    if( false )
                    {
                    // and one for the reverse strand
                    // if( this.config.showReverseStrand ) {
                        var comp = this._renderSeqTr( blockStart, blockEnd, Util.complement(blockSeq), scale );
                        comp.className = 'revcom';
                        seqNode.appendChild( comp );


                        if( false )
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
                                block.domNode.appendChild( frameDiv[i] );
                            }
                        }
                    }

                    var totalHeight = 0;
                    array.forEach( block.domNode.childNodes, function( table ) {
                        totalHeight += (table.clientHeight || table.offsetHeight);
                    });
                    this.heightUpdate( totalHeight, blockIndex );
                }


            }
        );
    }
);
