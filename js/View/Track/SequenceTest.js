define(
    [
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/dom-construct',
        'dojo/dom-class',
        'JBrowse/View/Track/Sequence',
        'JBrowse/Util'
    ],
    function(
        declare,
        array,
        lang,
        domConstruct,
        domClass,
        Sequence,
        Util
    )
    {
        return declare(
            [
                Sequence
            ],
            {
                // @Override
                _defaultConfig: function(){
                    var oldConfig = this.inherited(arguments);
                    var newConfig = lang.mixin(
                        oldConfig,{
                            showTranslation1st: true,
                            showTranslation2nd: false,
                            showTranslation3rd: false
                    });

                    return newConfig;
                },

                // @Override
                _trackMenuOptions: function() {
                    var that = this;
                    return [
                        {
                            label: 'About this track',
                            title: 'About track: '+(this.key||this.name),
                            iconClass: 'jbrowseIconHelp',
                            action: 'contentDialog',
                            content: dojo.hitch(this,'_trackDetailsContent')
                        },
                        {
                            label: 'Pin to top',
                            type: 'dijit/CheckedMenuItem',
                            title: "make this track always visible at the top of the view",
                            checked: that.isPinned(),
                            //iconClass: 'dijitIconDelete',
                            onClick: function() {
                                that.browser.publish( '/jbrowse/v1/v/tracks/'+( this.checked ? 'pin' : 'unpin' ), [ that.name ] );
                            }
                        },
                        {
                            label: 'Edit config',
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
                        {
                            label: 'Delete track',
                            title: "delete this track",
                            iconClass: 'dijitIconDelete',
                            action: function() {
                                new ConfirmDialog({ title: 'Delete track?', message: 'Really delete this track?' })
                                    .show( function( confirmed ) {
                                        if( confirmed )
                                            that.browser.publish( '/jbrowse/v1/v/tracks/delete', [that.config] );
                                    });
                            }
                        },
                        {
                            type: 'dijit/MenuSeparator'
                        },
                        {
                            label: 'Show Amino Acid Translation 1',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!that.config.showTranslation1st,
                            onClick: function(event){
                                that.config.showTranslation1st = this.checked;
                                that.changed();
                            }
                        },
                        {
                            label: 'Show Amino Acid Translation 2',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!that.config.showTranslation2nd,
                            onClick: function(event){
                                that.config.showTranslation2nd = this.checked;
                                that.changed();
                            }
                        },
                        {
                            label: 'Show Amino Acid Translation 3',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!that.config.showTranslation3rd,
                            onClick: function(event){
                                that.config.showTranslation3rd = this.checked;
                                that.changed();
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
                        var translationToShow = [
                            this.config.showTranslation1st,
                            this.config.showTranslation2nd,
                            this.config.showTranslation3rd
                        ].reverse();

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
                },

                // @Override
                _renderTranslation: function( seq, offset, blockStart, blockEnd, blockLength, scale, reverse ) {
                    seq = reverse ? Util.revcom( seq ) : seq;

                    var extraBases = (seq.length - offset) % 3;
                    var seqSliced = seq.slice( offset, seq.length - extraBases );

                    // Object describe how to mark the aminoAcid
                    var aminoAcidMarks = {
                        index: [0,1],
                        type: [
                    //        "Snow_aminoAcid_mark_left_top",
                            "Snow_aminoAcid_mark_left_bottom",
                            "Snow_aminoAcid_mark_right_top"
                    //        ,"Snow_aminoAcid_mark_right_bottom"
                        ]
                    };
                    // Todo: remove this, read from data store

                    var translated = "";
                    for( var i = 0; i < seqSliced.length; i += 3 ) {
                        var nextCodon = seqSliced.slice(i, i + 3);
                        var aminoAcid = this._codonTable[nextCodon] || this.nbsp;
                        translated += aminoAcid;
                    }

                    translated = reverse ? translated.split("").reverse().join("") : translated; // Flip the translated seq for left-to-right rendering
                    var orientedSeqSliced = reverse ? seqSliced.split("").reverse().join("") : seqSliced

                    var charSize = this.getCharacterMeasurements("aminoAcid");
                    var bigTiles = scale > charSize.w + 4; // whether to add .big styles to the base tiles

                    var charWidth = 100/(blockLength / 3);

                    var container = domConstruct.create(
                        'div',
                        {
                            className: 'Snow_translatedSequence translatedSequence'
                        } );
                    var table  = domConstruct.create('table',
                        {
                            className: 'Snow_translatedSequence translatedSequence offset'+offset+(bigTiles ? ' big' : ''),
                            style:
                                {
                                    width: (charWidth * translated.length) + "%"
                                }
                        }, container );
                    var tr = domConstruct.create('tr', {}, table );

                    table.style.left = (
                        reverse ? 100 - charWidth * (translated.length + offset / 3)
                            : charWidth*offset/3
                    ) + "%";

                    charWidth = 100/ translated.length + "%";

                    var drawChars = scale >= charSize.w;
                    if( drawChars )
                        table.className += ' big';

                    for( var i=0; i<translated.length; i++ ) {
                        var aminoAcidSpan = document.createElement('td');
                        var originalCodon = orientedSeqSliced.slice(3 * i, 3 * i + 3)
                        originalCodon = reverse ? originalCodon.split("").reverse().join("") : originalCodon;
                        aminoAcidSpan.className = 'Snow_aminoAcid Snow_aminoAcid_'+translated.charAt(i).toLowerCase();

                        // However, if it's known to be a start/stop, apply those CSS classes instead.
                        if (this._codonStarts.indexOf(originalCodon.toUpperCase()) != -1) {
                            aminoAcidSpan.className = 'Snow_aminoAcid Snow_aminoAcid_start';
                        }
                        if (this._codonStops.indexOf(originalCodon.toUpperCase()) != -1) {
                            aminoAcidSpan.className = 'Snow_aminoAcid Snow_aminoAcid_stop';
                        }

                        // Mark AminoAcid according to the Object 'aminoAcidMarks'
                        // if (aminoAcidMarks.index.indexOf(i) != -1)
                        // Test: random mark
                        if(Math.random() > 0.75)
                        {
                            //aminoAcidSpan.className = 'Snow_aminoAcid ' + aminoAcidMarks.type[i];
                            aminoAcidSpan.className = 'Snow_aminoAcid ' + aminoAcidMarks.type[i%2];
                        }


                        // Todo: Update height and padding as well, not only the width
                        aminoAcidSpan.style.width = charWidth;
                        if( drawChars ) {
                            aminoAcidSpan.innerHTML = translated.charAt( i );
                        }
                        tr.appendChild(aminoAcidSpan);
                    }
                    return container;
                }

            }
        );
    }
);
