(function () {
class ArrayBufferStream {
    /**
     * ArrayBufferStream wraps the built-in javascript ArrayBuffer, adding the ability to access
     * data in it like a stream, tracking its position.
     * You can request to read a value from the front of the array, and it will keep track of the position
     * within the byte array, so that successive reads are consecutive.
     * The available types to read include:
     * Uint8, Uint8String, Int16, Uint16, Int32, Uint32
     * @param {ArrayBuffer} arrayBuffer - array to use as a stream
     * @param {number} start - the start position in the raw buffer. position
     * will be relative to the start value.
     * @param {number} end - the end position in the raw buffer. length and
     * bytes available will be relative to the end value.
     * @param {ArrayBufferStream} parent - if passed reuses the parent's
     * internal objects
     * @constructor
     */
    constructor (
        arrayBuffer, start = 0, end = arrayBuffer.byteLength,
        {
            _uint8View = new Uint8Array(arrayBuffer)
        } = {}
    ) {
        /**
         * Raw data buffer for stream to read.
         * @type {ArrayBufferStream}
         */
        this.arrayBuffer = arrayBuffer;

        /**
         * Start position in arrayBuffer. Read values are relative to the start
         * in the arrayBuffer.
         * @type {number}
         */
        this.start = start;

        /**
         * End position in arrayBuffer. Length and bytes available are relative
         * to the start, end, and _position in the arrayBuffer;
         * @type {number};
         */
        this.end = end;

        /**
         * Cached Uint8Array view of the arrayBuffer. Heavily used for reading
         * Uint8 values and Strings from the stream.
         * @type {Uint8Array}
         */
        this._uint8View = _uint8View;

        /**
         * Raw position in the arrayBuffer relative to the beginning of the
         * arrayBuffer.
         * @type {number}
         */
        this._position = start;
    }

    /**
     * Return a new ArrayBufferStream that is a slice of the existing one
     * @param  {number} length - the number of bytes of extract
     * @return {ArrayBufferStream} the extracted stream
     */
    extract (length) {
        return new ArrayBufferStream(this.arrayBuffer, this._position, this._position + length, this);
    }

    /**
     * @return {number} the length of the stream in bytes
     */
    getLength () {
        return this.end - this.start;
    }

    /**
     * @return {number} the number of bytes available after the current position in the stream
     */
    getBytesAvailable () {
        return this.end - this._position;
    }

    /**
     * Position relative to the start value in the arrayBuffer of this
     * ArrayBufferStream.
     * @type {number}
     */
    get position () {
        return this._position - this.start;
    }

    /**
     * Set the position to read from in the arrayBuffer.
     * @type {number}
     * @param {number} value - new value to set position to
     */
    set position (value) {
        this._position = value + this.start;
        return value;
    }

    /**
     * Read an unsigned 8 bit integer from the stream
     * @return {number} the next 8 bit integer in the stream
     */
    readUint8 () {
        const val = this._uint8View[this._position];
        this._position += 1;
        return val;
    }

    /**
     * Read a sequence of bytes of the given length and convert to a string.
     * This is a convenience method for use with short strings.
     * @param {number} length - the number of bytes to convert
     * @return {string} a String made by concatenating the chars in the input
     */
    readUint8String (length) {
        const arr = this._uint8View;
        let str = '';
        const end = this._position + length;
        for (let i = this._position; i < end; i++) {
            str += String.fromCharCode(arr[i]);
        }
        this._position += length;
        return str;
    }

    /**
     * Read a 16 bit integer from the stream
     * @return {number} the next 16 bit integer in the stream
     */
    readInt16 () {
        const val = new Int16Array(this.arrayBuffer, this._position, 1)[0];
        this._position += 2; // one 16 bit int is 2 bytes
        return val;
    }

    /**
     * Read an unsigned 16 bit integer from the stream
     * @return {number} the next unsigned 16 bit integer in the stream
     */
    readUint16 () {
        const val = new Uint16Array(this.arrayBuffer, this._position, 1)[0];
        this._position += 2; // one 16 bit int is 2 bytes
        return val;
    }

    /**
     * Read a 32 bit integer from the stream
     * @return {number} the next 32 bit integer in the stream
     */
    readInt32 () {
        let val;
        if (this._position % 4 === 0) {
            val = new Int32Array(this.arrayBuffer, this._position, 1)[0];
        } else {
            // Cannot read Int32 directly out because offset is not multiple of 4
            // Need to slice out the values first
            val = new Int32Array(
                this.arrayBuffer.slice(this._position, this._position + 4)
            )[0];
        }
        this._position += 4; // one 32 bit int is 4 bytes
        return val;
    }

    /**
     * Read an unsigned 32 bit integer from the stream
     * @return {number} the next unsigned 32 bit integer in the stream
     */
    readUint32 () {
        const val = new Uint32Array(this.arrayBuffer, this._position, 1)[0];
        this._position += 4; // one 32 bit int is 4 bytes
        return val;
    }
}

var log = {
  warn: console.warn,
  log: console.log,
}

/**
 * Data used by the decompression algorithm
 * @type {Array}
 */
const STEP_TABLE = [
    7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
    50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
    253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
    1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327,
    3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487,
    12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767
];

/**
 * Data used by the decompression algorithm
 * @type {Array}
 */
const INDEX_TABLE = [
    -1, -1, -1, -1, 2, 4, 6, 8,
    -1, -1, -1, -1, 2, 4, 6, 8
];

let _deltaTable = null;

/**
 * Build a table of deltas from the 89 possible steps and 16 codes.
 * @return {Array<number>} computed delta values
 */
const deltaTable = function () {
    if (_deltaTable === null) {
        const NUM_STEPS = STEP_TABLE.length;
        const NUM_INDICES = INDEX_TABLE.length;
        _deltaTable = new Array(NUM_STEPS * NUM_INDICES).fill(0);
        let i = 0;

        for (let index = 0; index < NUM_STEPS; index++) {
            for (let code = 0; code < NUM_INDICES; code++) {
                const step = STEP_TABLE[index];

                let delta = 0;
                if (code & 4) delta += step;
                if (code & 2) delta += step >> 1;
                if (code & 1) delta += step >> 2;
                delta += step >> 3;
                _deltaTable[i++] = (code & 8) ? -delta : delta;
            }
        }
    }

    return _deltaTable;
};

/**
 * Decode wav audio files that have been compressed with the ADPCM format.
 * This is necessary because, while web browsers have native decoders for many audio
 * formats, ADPCM is a non-standard format used by Scratch since its early days.
 * This decoder is based on code from Scratch-Flash:
 * https://github.com/LLK/scratch-flash/blob/master/src/sound/WAVFile.as
 */
class ADPCMSoundDecoder {
    /**
     * @param {AudioContext} audioContext - a webAudio context
     * @constructor
     */
    constructor (audioContext) {
        this.audioContext = audioContext;
    }

    /**
     * Data used by the decompression algorithm
     * @type {Array}
     */
    static get STEP_TABLE () {
        return STEP_TABLE;
    }

    /**
     * Data used by the decompression algorithm
     * @type {Array}
     */
    static get INDEX_TABLE () {
        return INDEX_TABLE;
    }

    /**
     * Decode an ADPCM sound stored in an ArrayBuffer and return a promise
     * with the decoded audio buffer.
     * @param  {ArrayBuffer} audioData - containing ADPCM encoded wav audio
     * @return {AudioBuffer} the decoded audio buffer
     */
    decode (audioData) {

        return new Promise((resolve, reject) => {
            const stream = new ArrayBufferStream(audioData);

            const riffStr = stream.readUint8String(4);
            if (riffStr !== 'RIFF') {
                window.alert('incorrect adpcm wav header');
                reject();
            }

            const lengthInHeader = stream.readInt32();
            if ((lengthInHeader + 8) !== audioData.byteLength) {
                window.alert(`adpcm wav length in header: ${lengthInHeader} is incorrect`);
            }

            const wavStr = stream.readUint8String(4);
            if (wavStr !== 'WAVE') {
                window.alert('incorrect adpcm wav header');
                reject();
            }

            const formatChunk = this.extractChunk('fmt ', stream);
            this.encoding = formatChunk.readUint16();
            this.channels = formatChunk.readUint16();
            this.samplesPerSecond = formatChunk.readUint32();
            this.bytesPerSecond = formatChunk.readUint32();
            this.blockAlignment = formatChunk.readUint16();
            this.bitsPerSample = formatChunk.readUint16();
            formatChunk.position += 2;  // skip extra header byte count
            this.samplesPerBlock = formatChunk.readUint16();
            this.adpcmBlockSize = ((this.samplesPerBlock - 1) / 2) + 4; // block size in bytes

            const compressedData = this.extractChunk('data', stream);
            const sampleCount = this.numberOfSamples(compressedData, this.adpcmBlockSize);

            const buffer = this.audioContext.createBuffer(1, sampleCount, this.samplesPerSecond);
            this.imaDecompress(compressedData, this.adpcmBlockSize, buffer.getChannelData(0));

            resolve(buffer);
        });
    }

    /**
     * Extract a chunk of audio data from the stream, consisting of a set of audio data bytes
     * @param  {string} chunkType - the type of chunk to extract. 'data' or 'fmt' (format)
     * @param  {ArrayBufferStream} stream - an stream containing the audio data
     * @return {ArrayBufferStream} a stream containing the desired chunk
     */
    extractChunk (chunkType, stream) {
        stream.position = 12;
        while (stream.position < (stream.getLength() - 8)) {
            const typeStr = stream.readUint8String(4);
            const chunkSize = stream.readInt32();
            if (typeStr === chunkType) {
                const chunk = stream.extract(chunkSize);
                return chunk;
            }
            stream.position += chunkSize;

        }
    }

    /**
     * Count the exact number of samples in the compressed data.
     * @param {ArrayBufferStream} compressedData - the compressed data
     * @param {number} blockSize - size of each block in the data in bytes
     * @return {number} number of samples in the compressed data
     */
    numberOfSamples (compressedData, blockSize) {
        if (!compressedData) return 0;

        compressedData.position = 0;

        const available = compressedData.getBytesAvailable();
        const blocks = (available / blockSize) | 0;
        // Number of samples in full blocks.
        const fullBlocks = blocks * (2 * (blockSize - 4)) + 1;
        // Number of samples in the last incomplete block. 0 if the last block
        // is full.
        const subBlock = Math.max((available % blockSize) - 4, 0) * 2;
        // 1 if the last block is incomplete. 0 if it is complete.
        const incompleteBlock = Math.min(available % blockSize, 1);
        return fullBlocks + subBlock + incompleteBlock;
    }

    /**
     * Decompress sample data using the IMA ADPCM algorithm.
     * Note: Handles only one channel, 4-bits per sample.
     * @param  {ArrayBufferStream} compressedData - a stream of compressed audio samples
     * @param  {number} blockSize - the number of bytes in the stream
     * @param  {Float32Array} out - the uncompressed audio samples
     */
    imaDecompress (compressedData, blockSize, out) {
        let sample;
        let code;
        let delta;
        let index = 0;
        let lastByte = -1; // -1 indicates that there is no saved lastByte

        // Bail and return no samples if we have no data
        if (!compressedData) return;

        compressedData.position = 0;

        const size = out.length;
        const samplesAfterBlockHeader = (blockSize - 4) * 2;

        const DELTA_TABLE = deltaTable();

        let i = 0;
        while (i < size) {
            // read block header
            sample = compressedData.readInt16();
            index = compressedData.readUint8();
            compressedData.position++; // skip extra header byte
            if (index > 88) index = 88;
            out[i++] = sample / 32768;

            const blockLength = Math.min(samplesAfterBlockHeader, size - i);
            const blockStart = i;
            while (i - blockStart < blockLength) {
                // read 4-bit code and compute delta from previous sample
                lastByte = compressedData.readUint8();
                code = lastByte & 0xF;
                delta = DELTA_TABLE[index * 16 + code];
                // compute next index
                index += INDEX_TABLE[code];
                if (index > 88) index = 88;
                else if (index < 0) index = 0;
                // compute and output sample
                sample += delta;
                if (sample > 32767) sample = 32767;
                else if (sample < -32768) sample = -32768;
                out[i++] = sample / 32768;

                // use 4-bit code from lastByte and compute delta from previous
                // sample
                code = (lastByte >> 4) & 0xF;
                delta = DELTA_TABLE[index * 16 + code];
                // compute next index
                index += INDEX_TABLE[code];
                if (index > 88) index = 88;
                else if (index < 0) index = 0;
                // compute and output sample
                sample += delta;
                if (sample > 32767) sample = 32767;
                else if (sample < -32768) sample = -32768;
                out[i++] = sample / 32768;
            }
        }
    }
}

window.ADPCMSoundDecoder = ADPCMSoundDecoder;
  
})();