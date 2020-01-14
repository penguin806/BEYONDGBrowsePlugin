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
        'JBrowse/View/Track/Alignments2'
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
        Alignments2
    )
    {
        return declare(
            [
                Alignments2
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

                _translateGenomeSequenceToProtein: function(refSequence, fullRangeLeftPos, fullRangeRightPos)
                {
                    let blockSeq = refSequence.substring( 2, refSequence.length - 2 );
                    let blockLength = blockSeq.length;

                    let leftOver = (refSequence.length - 2) % 3;
                    let extStartSeq = refSequence.substring( 0, refSequence.length - 2 );
                    let extEndSeq = refSequence.substring( 2 );


                    let sixTranslatedSeqs = [];

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

                _publishDrawBamSequenceEvent: function()
                {
                    dojoTopic.publish('BEYONDGBrowse/addSingleProteoformScan',
                        ...arguments
                    );
                    console.info('BEYONDGBrowse/addSingleProteoformScan', arguments);
                },

                renderFeatures: function( args, fRects ) {
                    let _this = this;
                    _this.inherited(arguments);
                    fRects.forEach(
                        function (item, index) {
                            let bamSeqStartPos = item.f.get('start');
                            let bamSeqEndPos = item.f.get('end');
                            let bamGenomeSeq = item.f._get_seq();
                            let bamSeqName = item.f.get('name');
                            let bamTrackId = index;
                            let proteinSequenceOfBam = _this._translateGenomeSequenceToProtein(bamGenomeSeq, bamSeqStartPos);
                            let diffFromRefSequenceResult = [
                                {
                                    value: proteinSequenceOfBam[0],
                                    added: undefined,
                                    removed: undefined
                                }
                            ];

                            _this._publishDrawBamSequenceEvent(
                                proteinSequenceOfBam, bamSeqStartPos, bamSeqEndPos,
                                false, bamSeqName, {}, bamTrackId,
                                0, diffFromRefSequenceResult
                            );
                        }
                    );
                }

            }
        );
    }
);
