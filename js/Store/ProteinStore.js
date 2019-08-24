// Snow 2019-06-03
define(
    [
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/request',
        'JBrowse/Store/SeqFeature',
        'JBrowse/Model/SimpleFeature'
    ],
    function(
        declare,
        array,
        lang,
        request,
        SeqFeature,
        SimpleFeature
    ){
        return declare(
            [
                SeqFeature
            ],
            {
                getFeatures: function(query, featureCallback, finishCallback, errorCallback) {
                    // stub
                }
            }
        );
    }
);
