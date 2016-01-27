(function(global) {

	var Base64 = function() {
		this.symbols = [];

		this._addSymbolsFrom( 'A'.charCodeAt(0), 26 );
		this._addSymbolsFrom( 'a'.charCodeAt(0), 26 );
		this._addSymbolsFrom( '0'.charCodeAt(0), 10 );

		this.symbols.push('+', '/');

		this.encodeMap = [];
		this.decodeMap = [];

		for(var i = 0; i < this.symbols.length; i++) {
			this.encodeMap[i] = this.symbols[i];
			this.decodeMap[this.symbols[i]] = i;
		}

		this.decodeMap['='] = null;
	};

	Base64.prototype._addSymbolsFrom = function (startChar, max) {
		for (var i = 0; i < max; i++) {
			this.symbols.push(String.fromCharCode(startChar + i));
		}
	};

	Base64.prototype.decode = function(encoded) {
		if(encoded.length % 4 != 0) {
			throw new Error('encoded.length must be a multiple of 4.');
		}

		var decoded = [];
		var map = this.decodeMap;
		for (var i = 0, len = encoded.length; i < len; i += 4) {
			var b0 = map[encoded[i]];
			var b1 = map[encoded[i + 1]];
			var b2 = map[encoded[i + 2]];
			var b3 = map[encoded[i + 3]];

			var d0 = ((b0 << 2) + (b1 >> 4)) & 0xff;
			decoded.push(d0);

			if(b2 == null) break; // encoded[i + 1] == '='

			var d1 = ((b1 << 4) + (b2 >> 2)) & 0xff;
			decoded.push(d1);

			if(b3 == null) break; // encoded[i + 2] == '='

			var d2 = ((b2 << 6) + b3) & 0xff;
			decoded.push(d2);

		}

		return decoded;
	};

	global.base64 = new Base64();

})(window);
