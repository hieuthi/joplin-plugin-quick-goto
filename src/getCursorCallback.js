function plugin(CodeMirror) {
    CodeMirror.defineExtension('getCursorCallback', function(callback) {
        callback(this.getCursor());
    });
}

module.exports = {
    default: function(_context) {
        return {
            plugin: plugin,
            codeMirrorResources: [],
            codeMirrorOptions: {},
            assets: function() {
                return [
                ];
            },
        }
    },
}