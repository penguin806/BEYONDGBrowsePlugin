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
        'JBrowse/Util',
        'JBrowse/View/FeatureGlyph/Alignment'
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
        Util,
        AlignmentFeatureGlyph
    )
    {
        return declare(
            [
                AlignmentFeatureGlyph
            ],
            {
                constructor: function (args) {
                    let _this = this;

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
                },

                _drawMismatches: function () {
                    //stub
                },

                _translateGenomeSequenceToProtein: function(refSequence, fullRangeLeftPos, fullRangeRightPos)
                {
                    let blockSeq = refSequence.substring( 2, refSequence.length - 2 );
                    let blockLength = blockSeq.length;

                    let leftOver = (refSequence.length - 2) % 3;
                    let extStartSeq = refSequence.substring( 0, refSequence.length - 2 );
                    let extEndSeq = refSequence.substring( 2 );

                    let sixTranslatedSeqs = [];
                    sixTranslatedSeqs[-1] = refSequence;

                    for(let offset = 0; offset < 3; offset++)
                    {
                        let transStart = fullRangeLeftPos + offset;
                        let frame = (transStart % 3 + 3) % 3;

                        let extraBases = (extEndSeq.length - offset) % 3;
                        let slicedSequence = extEndSeq.slice(offset, extEndSeq.length - extraBases);
                        let translatedSeq = "";
                        for(let i = 0; i < slicedSequence.length; i += 3)
                        {
                            let theCodon = slicedSequence.slice(i, i + 3);
                            let aminoAcid = this._codonTable[theCodon] || '#';
                            translatedSeq += aminoAcid;
                        }

                        sixTranslatedSeqs[frame] = translatedSeq;
                    }

                    for(let offset = 0; offset < 3; offset++)
                    {
                        let transStart = fullRangeLeftPos + 1 - offset;
                        let frame = (transStart % 3 + 3 + leftOver) % 3;

                        extStartSeq = Util.revcom(extStartSeq);
                        let extraBases = (extStartSeq.length - offset) % 3;
                        let slicedSequence = extStartSeq.slice(offset, refSequence.length - extraBases);
                        let translatedSeq = "";
                        for(let i=0; i < slicedSequence.length; i+=3)
                        {
                            let theCodon = slicedSequence.slice(i, i + 3);
                            let aminoAcid = this._codonTable[theCodon] || ''  /*'#'*/;
                            translatedSeq += aminoAcid;
                        }

                        translatedSeq = translatedSeq.split("").reverse().join("");
                        sixTranslatedSeqs[3 + 2 - frame] = translatedSeq;
                    }

                    return sixTranslatedSeqs;
                },

                _wrapAminoAcidObjects: function(proteinSequence) {
                    if(!proteinSequence || proteinSequence.length === 0)
                    {
                        return [];
                    }

                    let aminoAcidObjects = [];
                    proteinSequence.split('').forEach(
                        function(item, index)
                        {
                            aminoAcidObjects[index] = {
                                start: index * 3,
                                base: item,
                                length: 3,
                                type: 'hydrophile'
                            }
                        }
                    );

                    return aminoAcidObjects;
                },

                _drawAminoAcids: function(context, fRect, f) {
                    let _this = this;
                    let feature = f || fRect.f;
                    let block = fRect.viewInfo.block;
                    let scale = block.scale;
                    let charSize = _this.getCharacterMeasurements( context );

                    let bamSeqStartPos = feature.get('start');
                    let bamSeqEndPos = feature.get('end');
                    let bamGenomeSeq = feature._get_seq();
                    let translations = _this._translateGenomeSequenceToProtein(bamGenomeSeq, bamSeqStartPos);
                    let aminoAcids = _this._wrapAminoAcidObjects(translations[0]);

                    context.textBaseline = 'middle';
                    aminoAcids.forEach(
                        function(aminoAcidObject) {
                            let start = feature.get('start') + aminoAcidObject.start;
                            let end = start + aminoAcidObject.length;

                            let mRect = {
                                h: (fRect.rect||{}).h || fRect.h,
                                l: block.bpToX( start ),
                                t: fRect.rect.t
                            };
                            mRect.w = Math.max( block.bpToX( end ) - mRect.l, 1 );

                            if( aminoAcidObject.type === 'hydrophile')
                            {
                                context.fillStyle = '#ffa500';
                                context.fillRect( mRect.l, mRect.t, mRect.w, mRect.h );

                                if( mRect.w >= charSize.w && mRect.h >= charSize.h-3 ) {
                                    context.font = _this.config.style.mismatchFont;
                                    context.fillStyle = 'white';
                                    context.fillText( aminoAcidObject.base, mRect.l+(mRect.w-charSize.w)/2+1, mRect.t+mRect.h/2 );
                                }
                            }
                        }
                    );

                    context.textBaseline = 'alphabetic';
                },

                renderFeature: function( context, fRect ) {
                    let _this = this;
                    _this.inherited(arguments);

                    if(fRect.w > 2)
                    {
                        if( fRect.viewInfo.scale > 0.2 )
                        {
                            this._drawAminoAcids(context, fRect);
                        }
                    }
                }
            }
        );
    }
);
