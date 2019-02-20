// Sequence Track
// Snow 2019-02-20
define(
    [
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/dom-construct',
        'dojo/dom-class',
        'dojo/query',
        'JBrowse/View/Track/BlockBased',
        'JBrowse/View/Track/_ExportMixin',
        'JBrowse/CodonTable',
        'JBrowse/Util'
    ],
    function(
        declare,
        array,
        lang,
        dom,
        domClass,
        query,
        BlockBased,
        ExportMixin,
        CodonTable,
        Util
    ){
        return declare(
            [
                BlockBased
            ],
            {
                constructor: function(args){

                },

                fillBlock: function(args){
                    var blockIndex = args.blockIndex;
                    var block = args.block;
                    var leftBase = args.leftBase;
                    var rightBase = args.rightBase;
                    var scale = args.scale;

                    var leftExtended = leftBase - 2;
                    var rightExtended = rightBase + 2;

                    var thisB = this;


                },

                _fillSequenceBlock: function(block, blockIndex, scale, seq){

                }

            }
        );
    }
);
